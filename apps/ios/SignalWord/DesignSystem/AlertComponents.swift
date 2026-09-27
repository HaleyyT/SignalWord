import SwiftUI
import Observation

enum HoldConfirmAction {
    case sendRealAlert
    case resolveAlert

    var label: String {
        switch self {
        case .sendRealAlert: "REAL alert"
        case .resolveAlert: "Resolve alert"
        }
    }

    var buttonTitle: String {
        switch self {
        case .sendRealAlert: "Hold to send a REAL alert"
        case .resolveAlert: "Hold to resolve this alert"
        }
    }

    var confirmationTitle: String {
        switch self {
        case .sendRealAlert: "Send a REAL alert?"
        case .resolveAlert: "Resolve this alert?"
        }
    }

    var confirmationDetail: String {
        switch self {
        case .sendRealAlert: "This sends an alert to your confirmed trusted person. It does not contact emergency services."
        case .resolveAlert: "SignalWord will mark this alert resolved after device owner authentication."
        }
    }

    var accessibilityHint: String {
        switch self {
        case .sendRealAlert: "Notifies your confirmed trusted person and does not contact emergency services. Tap to review and confirm, or hold for one and a half seconds."
        case .resolveAlert: "Marks this alert resolved after device owner authentication. Tap to review and confirm, or hold for one and a half seconds."
        }
    }

    var confirmationButton: String {
        switch self {
        case .sendRealAlert: "Send REAL alert"
        case .resolveAlert: "Resolve alert"
        }
    }
}

struct HoldConfirmControl: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let action: HoldConfirmAction
    let isEnabled: Bool
    var identifier: String? = nil
    let perform: @Sendable () async -> Void

    @State private var isHolding = false
    @State private var holdStartedAt: Date?
    @State private var showConfirmation = false
    @State private var isRunning = false
    @State private var suppressTap = false
    private let holdDuration: TimeInterval = 1.5

    var body: some View {
        Button {
            // SwiftUI can finish a press before delivering the button action.
            // Defer until the gesture has classified this release.
            Task { @MainActor in
                await Task.yield()
                guard !suppressTap else { suppressTap = false; return }
                reviewAction()
            }
        } label: {
            VStack(spacing: 9) {
                HStack(spacing: 10) {
                    if isRunning {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: action == .sendRealAlert ? "waveform.path" : "checkmark.circle")
                            .font(.body.weight(.semibold))
                    }
                    Text(isRunning ? "Please wait…" : isHolding ? "Keep holding to confirm…" : action.buttonTitle)
                        .font(.subheadline.weight(.semibold))
                        .multilineTextAlignment(.center)
                }
                TimelineView(.animation(minimumInterval: 0.04, paused: !isHolding)) { timeline in
                    let elapsed = timeline.date.timeIntervalSince(holdStartedAt ?? timeline.date)
                    let progress = isHolding ? min(1, max(0, elapsed / holdDuration)) : 0
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.20))
                            Capsule().fill(.white).frame(width: geometry.size.width * progress)
                        }
                    }
                    .frame(height: 3)
                    .accessibilityHidden(true)
                }
                .frame(maxWidth: 220)
            }
            .foregroundStyle(SignalWordColor.primaryText)
            .frame(maxWidth: .infinity, minHeight: 58)
            .padding(.horizontal, 14)
            .background(SignalWordColor.action, in: RoundedRectangle(cornerRadius: SignalWordRadius.control, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: SignalWordRadius.control, style: .continuous))
        }
        .buttonStyle(PressScaleButtonStyle())
        .disabled(!isEnabled || isRunning)
        .opacity(isEnabled ? 1 : 0.55)
        .onLongPressGesture(minimumDuration: holdDuration, maximumDistance: 18, pressing: { pressing in
            if pressing {
                guard isEnabled, !isRunning, !showConfirmation else { return }
                suppressTap = false
                holdStartedAt = .now
                isHolding = true
            } else {
                if let started = holdStartedAt, Date.now.timeIntervalSince(started) > 0.25 {
                    suppressTap = true
                }
                cancelHold()
            }
        }, perform: {
            // The pressing(false) callback can precede perform. Completion must
            // not depend on the visual isHolding state, which may already reset.
            suppressTap = true
            cancelHold()
            runAction()
        })
        .alert(action.confirmationTitle, isPresented: $showConfirmation) {
            Button(action.confirmationButton, role: action == .sendRealAlert ? .destructive : nil) {
                runAction()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(action.confirmationDetail)
        }
        .accessibilityIdentifier(identifier ?? "alert.hold-confirm")
        .accessibilityLabel(action.buttonTitle)
        .accessibilityValue(isHolding ? "Holding, \(Int(holdProgress * 100)) percent" : isRunning ? "In progress" : "Ready")
        .accessibilityHint(action.accessibilityHint + " Releasing before the hold completes cancels it.")
        .accessibilityAction { reviewAction() }
        .accessibilityAction(named: Text("Review and confirm")) { reviewAction() }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { suppressTap = true; cancelHold(); showConfirmation = false }
        }
        .onChange(of: reduceMotion) { _, reduced in
            if reduced { cancelHold() }
        }
    }

    private var holdProgress: Double {
        guard let holdStartedAt else { return 0 }
        return min(1, max(0, Date.now.timeIntervalSince(holdStartedAt) / holdDuration))
    }

    private func cancelHold() {
        isHolding = false
        holdStartedAt = nil
    }

    private func reviewAction() {
        guard isEnabled, !isRunning, scenePhase == .active else { return }
        showConfirmation = true
    }

    private func runAction() {
        guard isEnabled, !isRunning, scenePhase == .active else { return }
        isRunning = true
        Task { @MainActor in
            await perform()
            isRunning = false
        }
    }
}

extension HoldConfirmAction: Equatable {
    static func == (lhs: Self, rhs: Self) -> Bool {
        switch (lhs, rhs) {
        case (.sendRealAlert, .sendRealAlert), (.resolveAlert, .resolveAlert): true
        default: false
        }
    }
}

struct DeliverySummaryRow: View {
    let title: String
    let state: AlertDeliveryDisplayState

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title.uppercased())
                .font(.caption2.weight(.bold))
                .tracking(0.7)
                .foregroundStyle(SignalWordColor.secondaryText)
            Text(state.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(state == .failed ? SignalWordColor.critical : SignalWordColor.primaryText)
            Text(state.detail)
                .font(.caption)
                .foregroundStyle(SignalWordColor.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

struct AlertProgressCard: View {
    @Bindable var model: AppShellModel
    @State private var showDelayedConfirmation = false

    private var presentation: AlertPresentationModel? { model.currentAlertPresentation }

    var body: some View {
        if let presentation {
            SignalWordCard {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: presentation.kind == .test ? "checkmark.message" : presentation.kind == .real ? "waveform.path" : "questionmark.circle")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(presentation.kind == .test ? SignalWordColor.action : presentation.kind == .real ? SignalWordColor.attention : SignalWordColor.secondaryText)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(presentation.headline)
                                .font(.headline)
                                .fixedSize(horizontal: false, vertical: true)
                            Text(presentation.lifecycleDetail)
                                .font(.subheadline)
                                .foregroundStyle(SignalWordColor.secondaryText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 0)
                        if model.isRecovering { ProgressView().controlSize(.small) }
                    }
                    if presentation.showsInitialDelivery {
                        DeliverySummaryRow(title: "Initial alert email", state: presentation.initialDelivery)
                    }
                    if let resolution = presentation.resolutionDelivery {
                        Divider().overlay(SignalWordColor.separator)
                        DeliverySummaryRow(title: "Resolution email", state: resolution)
                    }
                    if let message = model.resolveMessage { InlineMessage(message, kind: .attention) }
                    if let message = model.recoveryMessage { InlineMessage(message, kind: .attention) }
                    HStack(spacing: 16) {
                        Button(model.isRecovering ? "Checking…" : model.currentAlertEventID == nil ? "Check saved command" : "Refresh status") {
                            Task {
                                if model.currentAlertEventID == nil { await model.recover() }
                                else { await model.refreshActiveAlertStatus() }
                            }
                        }
                        .disabled(model.isRecovering || presentation.lifecycle == .submitting)
                        .accessibilityHint(model.currentAlertEventID == nil ? "Reconciles this iPhone’s saved command with SignalWord" : "Checks SignalWord state and both delivery reports")
                        if model.hasDelayedCommands {
                            let delayedKind = model.delayedAlertKind
                            Button("Review delayed \(delayedKind == .test ? "TEST" : delayedKind == .real ? "REAL" : "alert")", role: .destructive) {
                                showDelayedConfirmation = true
                            }
                        }
                    }
                    .font(.subheadline.weight(.semibold))
                    if presentation.isAcknowledged {
                        Label("Acknowledged through the recipient link. This does not confirm identity or mean help is coming.", systemImage: "checkmark.message")
                            .font(.caption)
                            .foregroundStyle(SignalWordColor.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    } else {
                        Text("No recipient acknowledgement recorded yet.")
                            .font(.caption)
                            .foregroundStyle(SignalWordColor.secondaryText)
                    }
                }
            }
            .confirmationDialog("Send this delayed command now?", isPresented: $showDelayedConfirmation, titleVisibility: .visible) {
                Button("Confirm and send", role: .destructive) { Task { await model.recover(allowDelayed: true) } }
                Button("Keep waiting", role: .cancel) {}
            } message: {
                let kind = model.delayedAlertKind
                Text("SignalWord found an older saved \(kind == .test ? "TEST" : kind == .real ? "REAL" : "alert") command. Review before sending it.")
            }
            .accessibilityIdentifier("alert.progress")
        }
    }
}
