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
            prepare: { try await api.prepareIdentity() },
            saveContact: { name, email in try await api.saveContact(name: name, email: email) },
            getContact: { try await api.getContact() },
            getAlertStatus: { eventID in try await api.getAlertStatus(eventID: eventID) },
            authenticateResolution: { await DeviceOwnerAuthenticator.authenticateResolution() },
            resolve: { eventID in try await api.resolve(eventID: eventID) },
            locationAuthorization: { await locationService.authorization },
            requestLocationAccess: { await locationService.requestAccess() },
            deleteAccount: {
                try await api.deleteAccount()
                if let containerURL = SignalWordConfiguration.appGroupContainerURL,
                   let store = try? FileLockedAlertCommandStore(directoryURL: containerURL) {
                    try? await store.clearAll()
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

    private static var lifecycleAPI: RemoteUserLifecycleAPI? {
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
        let store = try FileLockedAlertCommandStore(directoryURL: containerURL)
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
