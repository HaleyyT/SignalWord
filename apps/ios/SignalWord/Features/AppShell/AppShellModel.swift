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
    case rejected

    var headline: String {
        switch self {
        case .idle: "No active alert"
        case .submitting: "Creating alert"
        case .waitingForConnection: "Waiting for connection"
        case .accepted: "Accepted by SignalWord"
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
        case .rejected: return "Check trusted-contact confirmation and setup before trying again."
        }
    }
}

@MainActor
@Observable
final class AppShellModel {
    typealias Trigger = @Sendable (AlertKind, TriggerMethod) async -> TriggerOutcome

    var stage: OnboardingStage = .understand
    var hasEnteredDashboard = false
    var contactName = ""
    var contactEmail = ""
    private(set) var hasContactDraft = false
    private(set) var shortcutConfigured = false
    private(set) var successfulRehearsals = 0
    private(set) var alertState: AlertDisplayState = .idle
    private(set) var resolveMessage: String?
    var locationState: LocationPermissionState = .notRequested
    let backendConfigured: Bool

    private let trigger: Trigger

    init(backendConfigured: Bool, trigger: @escaping Trigger) {
        self.backendConfigured = backendConfigured
        self.trigger = trigger
    }

    static func live() -> AppShellModel {
        AppShellModel(
            backendConfigured: AppCompositionRoot.hasAlertConfiguration,
            trigger: AppCompositionRoot.makeTrigger()
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
                backendConfigured ? "A protected device credential is available." : "Connect the app to create a protected device identity.",
                backendConfigured ? .ready : .actionNeeded
            ),
            (
                "Trusted contact",
                hasContactDraft ? "Draft saved for this session. Email confirmation is still required." : "Add one contact, then verify their email before REAL alerts.",
                .actionNeeded
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
        backendConfigured && hasContactDraft && shortcutConfigured && successfulRehearsals >= 2
    }

    func advanceFromUnderstanding() { stage = .contact }

    @discardableResult
    func saveContactDraft() -> Bool {
        guard contactValidationMessage == nil else { return false }
        hasContactDraft = true
        stage = .rehearse
        return true
    }

    func setShortcutConfigured(_ value: Bool) { shortcutConfigured = value }

    func enterDashboard() { hasEnteredDashboard = true }

    func runRehearsal() async { await submit(kind: .test, method: .manual) }

    func recordVerifiedLockedRehearsal() {
        successfulRehearsals = min(2, successfulRehearsals + 1)
    }

    func triggerRealAlert() async { await submit(kind: .real, method: .manual) }

    func requestResolution() {
        // The resolve API is not implemented in the current backend. Keep this
        // action honest rather than displaying a local-only resolved state.
        resolveMessage = "Resolution is not available until the signed resolve endpoint is connected. This alert remains active."
    }

    private func submit(kind: AlertKind, method: TriggerMethod) async {
        guard alertState != .submitting else { return }
        alertState = .submitting
        let outcome = await trigger(kind, method)
        switch outcome {
        case .created(let eventID): alertState = .accepted(eventID: eventID, reused: false)
        case .reused(let eventID): alertState = .accepted(eventID: eventID, reused: true)
        case .queuedOffline, .failedRetryable: alertState = .waitingForConnection
        case .rejected: alertState = .rejected
        }
    }

    private static func looksLikeEmail(_ value: String) -> Bool {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        let pieces = trimmed.split(separator: "@", omittingEmptySubsequences: false)
        return pieces.count == 2 && pieces[0].count > 0 && pieces[1].contains(".")
    }
}
