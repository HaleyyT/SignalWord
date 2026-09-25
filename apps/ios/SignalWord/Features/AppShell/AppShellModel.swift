import Foundation
import Observation

enum OnboardingStage: Int, CaseIterable, Identifiable {
    case understand, contact, rehearse

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .understand: "Understand"
        case .contact: "Trusted contact"
        case .rehearse: "Rehearse"
        }
    }
}

enum LocationPermissionState: Equatable {
    case notRequested, allowedApproximate, allowedPrecise, denied

    var summary: String {
        switch self {
        case .notRequested: "Not requested. Alerts still work without location."
        case .allowedApproximate: "Approximate location may be attached when available."
        case .allowedPrecise: "A trigger-time location snapshot may be attached."
        case .denied: "Unavailable. The alert can still be created."
        }
    }
}

enum AlertDisplayState: Equatable {
    case idle
    case submitting
    case waitingForConnection
    case accepted(eventID: UUID, reused: Bool)
    case resolved(eventID: UUID)
    case rejected

    var headline: String {
        switch self {
        case .idle: "No active alert"
        case .submitting: "Creating alert"
        case .waitingForConnection: "Waiting for connection"
        case .accepted: "Accepted by SignalWord"
        case .resolved: "Alert resolved"
        case .rejected: "Alert was not accepted"
        }
    }

    var detail: String {
        switch self {
        case .idle: return "Use a rehearsal to check setup before relying on SignalWord."
        case .submitting: return "The saved command is being sent."
        case .waitingForConnection: return "The command is saved on this device. Delivery is not confirmed. Open SignalWord when connected to retry."
        case .accepted(_, let reused):
            return reused
                ? "A recent alert was reused to prevent a duplicate. Contact delivery is not yet verified here."
                : "The server accepted the alert. Contact delivery is not yet verified here."
        case .resolved: return "SignalWord accepted the resolution and queued a status update for your contact."
        case .rejected: return "Check trusted-contact confirmation and setup before trying again."
        }
    }
}

@MainActor
@Observable
final class AppShellModel {
    typealias Trigger = @Sendable (AlertKind, TriggerMethod) async -> TriggerOutcome
    struct LifecycleActions: Sendable {
        let prepare: @Sendable () async throws -> Void
        let saveContact: @Sendable (String, String) async throws -> TrustedContactProjection
        let getContact: @Sendable () async throws -> TrustedContactProjection?
        let getAlertStatus: @Sendable (UUID) async throws -> AlertStatusProjection
        let authenticateResolution: @Sendable () async -> Bool
        let resolve: @Sendable (UUID) async throws -> ResolvedAlertProjection
        let deleteAccount: @Sendable () async throws -> Void

        static let unconfigured = LifecycleActions(
            prepare: { throw SessionError.configuration },
            saveContact: { _, _ in throw SessionError.configuration },
            getContact: { throw SessionError.configuration },
            getAlertStatus: { _ in throw SessionError.configuration },
            authenticateResolution: { false },
            resolve: { _ in throw SessionError.configuration },
            deleteAccount: { throw SessionError.configuration }
        )
    }

    var stage: OnboardingStage = .understand
    var hasEnteredDashboard = false
    var contactName = ""
    var contactEmail = ""
    private(set) var hasContactDraft = false
    private(set) var contactStatus = "not configured"
    private(set) var identityReady = false
    private(set) var isSavingContact = false
    private(set) var shortcutConfigured = false
    private(set) var successfulRehearsals = 0
    private(set) var canVerifyCurrentRehearsal = false
    private(set) var alertState: AlertDisplayState = .idle
    private(set) var deliveryStatus: String?
    private(set) var resolveMessage: String?
    private(set) var accountMessage: String?
    var locationState: LocationPermissionState = .notRequested
    let backendConfigured: Bool

    private let trigger: Trigger
    private let lifecycle: LifecycleActions

    init(backendConfigured: Bool, trigger: @escaping Trigger, lifecycle: LifecycleActions = .unconfigured) {
        self.backendConfigured = backendConfigured
        self.trigger = trigger
        self.lifecycle = lifecycle
    }

    static func live() -> AppShellModel {
        AppShellModel(
            backendConfigured: AppCompositionRoot.isConfigured,
            trigger: AppCompositionRoot.makeTrigger(),
            lifecycle: AppCompositionRoot.makeLifecycleActions()
        )
    }

    var contactValidationMessage: String? {
        if contactName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Enter the name your alert recipient will recognise."
        }
        if !Self.looksLikeEmail(contactEmail) {
            return "Enter a valid email address."
        }
        return nil
    }

    var readinessRows: [(String, String, ReadinessState)] {
        [
            (
                "Device identity",
                identityReady ? "A refreshable protected device identity is available." : "Connect the app to create a protected device identity.",
                identityReady ? .ready : .actionNeeded
            ),
            (
                "Trusted contact",
                hasContactDraft ? "Status: \(contactStatus). Email confirmation is required before REAL alerts." : "Add one contact, then verify their email before REAL alerts.",
                contactStatus == "confirmed" ? .ready : .actionNeeded
            ),
            (
                "Vocal Shortcut",
                shortcutConfigured ? "Marked as configured; confirm with a locked rehearsal." : "Add Trigger Alert in iOS Vocal Shortcuts.",
                shortcutConfigured ? .ready : .actionNeeded
            ),
            (
                "Locked rehearsals",
                "\(successfulRehearsals) of 2 verified end-to-end.",
                successfulRehearsals >= 2 ? .ready : .actionNeeded
            ),
            ("Location", locationState.summary, locationState == .notRequested || locationState == .denied ? .optional : .ready),
        ]
    }

    var isFullyReady: Bool {
        identityReady && contactStatus == "confirmed" && shortcutConfigured && successfulRehearsals >= 2
    }

    func advanceFromUnderstanding() { stage = .contact }

    func prepare() async {
        guard backendConfigured, !identityReady else { return }
        do {
            try await lifecycle.prepare()
            identityReady = true
            if let contact = try await lifecycle.getContact() { apply(contact) }
        } catch {
            accountMessage = "SignalWord could not create a protected device identity. Check the connection and try again."
        }
    }

    func saveContact() async {
        guard contactValidationMessage == nil, identityReady, !isSavingContact else { return }
        isSavingContact = true
        defer { isSavingContact = false }
        do {
            let contact = try await lifecycle.saveContact(
                contactName.trimmingCharacters(in: .whitespacesAndNewlines),
                contactEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            )
            apply(contact)
            stage = .rehearse
            accountMessage = nil
        } catch {
            accountMessage = "The contact was not saved. No confirmation should be assumed; check the connection and try again."
        }
    }

    func refreshContact() async {
        do {
            if let contact = try await lifecycle.getContact() { apply(contact) }
        } catch {
            accountMessage = "Contact status could not be refreshed."
        }
    }

    func setShortcutConfigured(_ value: Bool) { shortcutConfigured = value }

    func enterDashboard() { hasEnteredDashboard = true }

    func runRehearsal() async { await submit(kind: .test, method: .manual) }

    func recordVerifiedLockedRehearsal() {
        guard canVerifyCurrentRehearsal else { return }
        successfulRehearsals = min(2, successfulRehearsals + 1)
        canVerifyCurrentRehearsal = false
    }

    func triggerRealAlert() async { await submit(kind: .real, method: .manual) }

    func requestResolution() async {
        guard case .accepted(let eventID, _) = alertState else { return }
        guard await lifecycle.authenticateResolution() else {
            resolveMessage = "The alert remains active because device authentication was not completed."
            return
        }
        do {
            _ = try await lifecycle.resolve(eventID)
            alertState = .resolved(eventID: eventID)
            resolveMessage = nil
        } catch {
            resolveMessage = "Resolution was not accepted. This alert remains active; check the connection and try again."
        }
    }

    func refreshActiveAlertStatus() async {
        let eventID: UUID
        switch alertState {
        case .accepted(let current, _), .resolved(let current): eventID = current
        default: return
        }
        do {
            let status = try await lifecycle.getAlertStatus(eventID)
            deliveryStatus = status.delivery
            if status.state == "resolved" { alertState = .resolved(eventID: eventID) }
        } catch {
            resolveMessage = "Current delivery status could not be refreshed."
        }
    }

    func deleteAccount() async {
        do {
            try await lifecycle.deleteAccount()
            identityReady = false
            hasContactDraft = false
            contactStatus = "not configured"
            alertState = .idle
            hasEnteredDashboard = false
            stage = .understand
            accountMessage = "SignalWord data was deleted from the server and this device."
        } catch {
            accountMessage = "Deletion did not complete. Your data remains; check the connection and try again."
        }
    }

    private func submit(kind: AlertKind, method: TriggerMethod) async {
        guard alertState != .submitting else { return }
        alertState = .submitting
        let outcome = await trigger(kind, method)
        switch outcome {
        case .created(let eventID):
            alertState = .accepted(eventID: eventID, reused: false)
            if kind == .test { canVerifyCurrentRehearsal = true }
        case .reused(let eventID):
            alertState = .accepted(eventID: eventID, reused: true)
            if kind == .test { canVerifyCurrentRehearsal = true }
        case .queuedOffline, .failedRetryable: alertState = .waitingForConnection
        case .rejected: alertState = .rejected
        }
        if case .accepted = alertState { await refreshActiveAlertStatus() }
    }

    private func apply(_ contact: TrustedContactProjection) {
        contactName = contact.name
        contactEmail = ""
        hasContactDraft = true
        contactStatus = contact.status
    }

    private static func looksLikeEmail(_ value: String) -> Bool {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        let pieces = trimmed.split(separator: "@", omittingEmptySubsequences: false)
        return pieces.count == 2 && pieces[0].count > 0 && pieces[1].contains(".")
    }
}
