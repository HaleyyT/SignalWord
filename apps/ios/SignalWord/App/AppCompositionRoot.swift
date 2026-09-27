import Foundation

/// Owns the process-wide session and alert coordinator. Missing configuration
/// fails closed; no demo identity or simulated delivery is substituted.
@MainActor
enum AppCompositionRoot {
    private static let sessionManager: SupabaseSessionManager? = {
        guard let url = SignalWordConfiguration.supabaseURL,
              let key = SignalWordConfiguration.supabasePublishableKey else { return nil }
        return SupabaseSessionManager(supabaseURL: url, publishableKey: key)
    }()
    private static let alertRunner = LiveAlertRunner()
    private static let locationService = LiveLocationService()

    static var isConfigured: Bool {
        SignalWordConfiguration.alertAPIBaseURL != nil
            && sessionManager != nil
            && SignalWordConfiguration.appGroupContainerURL != nil
    }

    static func makeTrigger() -> AppShellModel.Trigger {
        { kind, method in await AppCompositionRoot.trigger(kind: kind, method: method) }
    }

    static func makeLifecycleActions() -> AppShellModel.LifecycleActions {
        guard let api = lifecycleAPI else { return .unconfigured }
        return AppShellModel.LifecycleActions(
            prepare: { token in try await api.prepareIdentity(captchaToken: token) },
            profile: { name in try await api.profile(displayName: name).displayName },
            recover: { allowDelayed in try await recover(api: api, allowDelayed: allowDelayed) },
            saveContact: { name, email in try await api.saveContact(name: name, email: email) },
            getContact: { try await api.getContact() },
            disableContact: { contactID in try await api.disableContact(contactID: contactID) },
            getAlertStatus: { eventID in try await api.getAlertStatus(eventID: eventID) },
            authenticateResolution: { await DeviceOwnerAuthenticator.authenticateResolution() },
            resolve: { eventID in try await api.resolve(eventID: eventID) },
            locationAuthorization: { await locationService.authorization },
            requestLocationAccess: { await locationService.requestAccess() },
            deleteAccount: {
                try await api.deleteAccount()
                guard let containerURL = SignalWordConfiguration.appGroupContainerURL else { throw SessionError.configuration }
                try await SQLiteAlertCommandStore(directoryURL: containerURL).clearAll()
                for key in ["onboardingComplete", "shortcutConfigured", "verifiedRehearsals", "rehearsalContactID", "serverDeletionConfirmed", "deletionReceiptToken", CheckInModel.pendingKey] {
                    UserDefaults.standard.removeObject(forKey: key)
                }
            }
        )
    }

    static func trigger(kind: AlertKind, method: TriggerMethod) async -> TriggerOutcome {
        let outcome = await alertRunner.trigger(kind: kind, method: method)
        let eventID: UUID?
        switch outcome {
        case .created(let id), .reused(let id): eventID = id
        default: eventID = nil
        }
        if let eventID, let api = lifecycleAPI {
            // A fresh GPS request begins only after server acceptance. It is a
            // best-effort enrichment and cannot delay or change the outcome.
            Task { @MainActor in
                guard let snapshot = await locationService.requestFreshSnapshot(timeout: .seconds(8)) else { return }
                try? await api.appendLocation(eventID: eventID, location: snapshot)
            }
        }
        return outcome
    }

    private static func recover(api: RemoteUserLifecycleAPI, allowDelayed: Bool) async throws -> AppRecovery {
        guard let directory = SignalWordConfiguration.appGroupContainerURL else { throw SessionError.configuration }
        let store = try SQLiteAlertCommandStore(directoryURL: directory)
        let coordinator = try makeCoordinator()
        var needsConfirmation = false
        var pending = false
        var pendingKind: AlertKind?
        for record in try await store.allRecords() where record.phase == .attempting || record.phase == .queuedOffline {
            // Reconcile possible server commits before considering another send, including old commands.
            let existing = try await api.recover(key: record.command.idempotencyKey)
            if let status = existing.first {
                try await store.markCreated(record.command, alert: CreatedAlert(eventID: status.eventID, serverTriggeredAt: Date()), at: Date())
            } else if let outcome = await coordinator.resumePending(kind: record.command.kind, allowDelayed: allowDelayed) {
                if outcome == .confirmationRequired {
                    needsConfirmation = true
                    pendingKind = record.command.kind
                }
                if outcome == .queuedOffline || outcome == .failedRetryable {
                    pending = true
                    pendingKind = record.command.kind
                }
            }
        }
        var alerts = try await api.recover()
        for record in try await store.allRecords() {
            if let id = record.canonicalEventID, !alerts.contains(where: { $0.eventID == id }),
               let status = try? await api.getAlertStatus(eventID: id) { alerts.append(status) }
        }
        return AppRecovery(alerts: alerts, needsConfirmation: needsConfirmation, pending: pending, pendingKind: pendingKind)
    }

    static var lifecycleAPI: RemoteUserLifecycleAPI? {
        guard let baseURL = SignalWordConfiguration.alertAPIBaseURL,
              let sessionManager else { return nil }
        return RemoteUserLifecycleAPI(baseURL: baseURL, sessionManager: sessionManager)
    }

    private static func makeCoordinator() throws -> AlertTriggerCoordinator {
        guard let baseURL = SignalWordConfiguration.alertAPIBaseURL,
              let sessionManager,
              let containerURL = SignalWordConfiguration.appGroupContainerURL else {
            throw SessionError.configuration
        }
        let store = try SQLiteAlertCommandStore(directoryURL: containerURL)
        let api = RemoteAlertAPI(baseURL: baseURL) { forceRefresh in
            try await sessionManager.accessToken(
                createIfMissing: false,
                forceRefresh: forceRefresh
            )
        }
        return AlertTriggerCoordinator(
            alertAPI: api,
            commandStore: store,
            locationProvider: locationService
        )
    }

    private actor LiveAlertRunner {
        private var coordinator: AlertTriggerCoordinator?

        func trigger(kind: AlertKind, method: TriggerMethod) async -> TriggerOutcome {
            do {
                if coordinator == nil { coordinator = try await AppCompositionRoot.makeCoordinator() }
                guard let coordinator else { return .failedRetryable }
                return await coordinator.trigger(kind: kind, method: method)
            } catch {
                return .failedRetryable
            }
        }
    }
}
