import SwiftUI
import Observation

struct HomeScreen: View {
    @Bindable var model: AppShellModel
    let openPeople: () -> Void
    let openSettings: () -> Void
    let openRehearsal: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SignalWordSpacing.section) {
                header
                if model.currentAlertPresentation != nil {
                    AlertProgressCard(model: model)
                    RecipientProgressPanel(eventID: model.currentAlertEventID)
                }
                primaryAction
                setupSummary
                CheckInPanel()
                recentActivity
                safetyNote
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, SignalWordSpacing.page)
            .padding(.top, 12)
            .padding(.bottom, 32)
            .frame(maxWidth: .infinity)
        }
        .background(SignalWordColor.canvas.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await model.recover() }
        .accessibilityIdentifier("home.screen")
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 14) {
            SignalOrb(state: hasCurrentAlert ? .attention : canStartManualAlert ? .ready : .attention, size: 52)
            VStack(alignment: .leading, spacing: 3) {
                Text("SIGNALWORD")
                    .font(.caption.weight(.bold))
                    .tracking(1.5)
                    .foregroundStyle(SignalWordColor.secondaryText)
                Text(hasCurrentAlert ? "Check your current alert status." : canStartManualAlert ? "Manual alert available." : "Let’s get the essentials in place.")
                    .font(.title3.weight(.semibold))
                    .tracking(-0.2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 4)
            Button(action: openSettings) {
                Image(systemName: "slider.horizontal.3")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(SignalWordColor.primaryText)
                    .frame(width: 44, height: 44)
                    .background(SignalWordColor.surface, in: Circle())
            }
            .accessibilityLabel("Settings")
        }
        .padding(.vertical, 8)
    }

    private var hasCurrentAlert: Bool {
        model.currentAlertPresentation != nil && !model.canStartNewRealAlert
    }

    private var canStartManualAlert: Bool {
        model.canTriggerManually && model.canStartNewRealAlert
    }

    @ViewBuilder
    private var primaryAction: some View {
        if isActiveAlert {
            HoldConfirmControl(action: .resolveAlert, isEnabled: true, identifier: "alert.resolve") {
                await model.requestResolution()
            }
        } else if model.canStartNewRealAlert && model.canTriggerManually {
            HoldConfirmControl(action: .sendRealAlert, isEnabled: true, identifier: "alert.trigger") {
                await model.triggerRealAlert()
            }
        } else if model.currentAlertPresentation != nil {
            Text("Check the status above before sending another alert.")
                .font(.caption)
                .foregroundStyle(SignalWordColor.secondaryText)
                .frame(maxWidth: .infinity, alignment: .center)
        } else if !model.identityReady {
            PrimaryButton(title: "Prepare this iPhone", symbol: "arrow.clockwise") {
                Task { await model.recover() }
            }
            .accessibilityIdentifier("home.prepare")
        } else {
            PrimaryButton(title: "Confirm your trusted person", symbol: "person.badge.plus", action: openPeople)
        }

        if model.canTriggerManually && !isActiveAlert {
            Text("Hold for 1.5 seconds to send. Use Review and confirm for a tap alternative. This alerts your confirmed person only.")
                .font(.caption)
                .foregroundStyle(SignalWordColor.secondaryText)
                .frame(maxWidth: .infinity, alignment: .center)
                .multilineTextAlignment(.center)
        }
    }

    private var isActiveAlert: Bool {
        model.canResolveCurrentAlert
    }

    private var setupSummary: some View {
        VStack(alignment: .leading, spacing: 13) {
            Text("Setup status")
                .font(.title3.weight(.semibold))
                .accessibilityAddTraits(.isHeader)
            SignalWordCard {
                VStack(spacing: 0) {
                    CapabilityRow(
                        title: model.manualAlertReadiness.title,
                        detail: model.manualAlertReadiness.detail,
                        isReady: model.manualAlertReadiness.isReady,
                        symbol: model.manualAlertReadiness.isReady ? "checkmark.circle.fill" : "circle.dashed"
                    ) {
                        if model.manualAlertReadiness.isReady { openPeople() }
                        else if model.identityReady { openPeople() }
                        else { Task { await model.recover() } }
                    }
                    Divider().overlay(SignalWordColor.separator).padding(.leading, 44)
                    CapabilityRow(
                        title: model.recipientConsentReadiness.title,
                        detail: model.recipientConsentReadiness.detail,
                        isReady: model.recipientConsentReadiness.isReady,
                        symbol: model.recipientConsentReadiness.isReady ? "checkmark.circle.fill" : "person.crop.circle.badge.exclamationmark"
                    ) { openPeople() }
                    Divider().overlay(SignalWordColor.separator).padding(.leading, 44)
                    CapabilityRow(
                        title: model.rehearsalReadiness.title,
                        detail: model.rehearsalReadiness.detail,
                        isReady: model.rehearsalReadiness.isReady,
                        symbol: model.rehearsalReadiness.isReady ? "checkmark.circle.fill" : "checkmark.message"
                    ) { openRehearsal() }
                    Divider().overlay(SignalWordColor.separator).padding(.leading, 44)
                    CapabilityRow(
                        title: model.lockedTestReadiness.title,
                        detail: model.lockedTestReadiness.detail,
                        isReady: model.lockedTestReadiness.isReady,
                        symbol: "lock.iphone"
                    ) { openSettings() }
                    Divider().overlay(SignalWordColor.separator).padding(.leading, 44)
                    CapabilityRow(
                        title: model.shortcutReadiness.title,
                        detail: model.shortcutReadiness.detail,
                        isReady: model.shortcutReadiness.isReady,
                        symbol: "waveform"
                    ) { openSettings() }
                    Divider().overlay(SignalWordColor.separator).padding(.leading, 44)
                    CapabilityRow(
                        title: "Location",
                        detail: model.locationState.summary,
                        isReady: false,
                        symbol: "location"
                    ) { openSettings() }
                }
            }
            Text("Location and rehearsal do not block a manual alert. Shortcut setup and locked-test use are self-reported.")
                .font(.caption)
                .foregroundStyle(SignalWordColor.mutedText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var recentActivity: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .firstTextBaseline) {
                Text("Recent activity")
                    .font(.title3.weight(.semibold))
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                Button("Refresh") { Task { await model.recover() } }
                    .font(.subheadline.weight(.semibold))
                    .disabled(model.isRecovering)
            }
            if model.availableAlerts.isEmpty {
                Button(action: openRehearsal) {
                    HStack(spacing: 12) {
                        Image(systemName: "checkmark.message")
                            .font(.title3.weight(.medium))
                            .foregroundStyle(SignalWordColor.action)
                            .frame(width: 44, height: 44)
                            .background(SignalWordColor.action.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
                        VStack(alignment: .leading, spacing: 3) {
                            Text("No recent alerts").font(.subheadline.weight(.semibold)).foregroundStyle(SignalWordColor.primaryText)
                            Text("Run a safe TEST before you need it.")
                                .font(.caption)
                                .foregroundStyle(SignalWordColor.secondaryText)
                        }
                        Spacer(minLength: 4)
                        Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(SignalWordColor.mutedText)
                    }
                    .padding(14)
                    .background(SignalWordColor.surface, in: RoundedRectangle(cornerRadius: SignalWordRadius.row, style: .continuous))
                }
                .buttonStyle(.plain)
            } else {
                VStack(spacing: 0) {
                    ForEach(model.availableAlerts.prefix(3), id: \.eventID) { alert in
                        Button {
                            model.selectAlert(alert)
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: alertKind(alert) == .test ? "checkmark.message" : alertKind(alert) == .real ? "waveform.path" : "questionmark.circle")
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(alertKind(alert) == .test ? SignalWordColor.action : alertKind(alert) == .real ? SignalWordColor.attention : SignalWordColor.secondaryText)
                                    .frame(width: 38, height: 38)
                                    .background(SignalWordColor.canvas, in: RoundedRectangle(cornerRadius: 12))
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(alertKind(alert).map { $0 == .test ? "TEST alert" : "REAL alert" } ?? "Alert kind unavailable")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(SignalWordColor.primaryText)
                                    Text(activitySubtitle(alert))
                                        .font(.caption)
                                        .foregroundStyle(SignalWordColor.secondaryText)
                                }
                                Spacer()
                                Image(systemName: "chevron.right").font(.caption2.weight(.bold)).foregroundStyle(SignalWordColor.mutedText)
                            }
                            .frame(minHeight: 54)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("activity.\(alert.kind).\(alert.eventID.uuidString)")
                        if alert.eventID != model.availableAlerts.prefix(3).last?.eventID {
                            Divider().overlay(SignalWordColor.separator).padding(.leading, 50)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .background(SignalWordColor.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
        }
    }

    private func activitySubtitle(_ alert: AlertStatusProjection) -> String {
        let eventState = AlertPresentationModel(
            eventID: alert.eventID,
            kind: alert.kind,
            eventState: alert.state,
            initialDelivery: alert.delivery,
            resolutionDelivery: alert.resolutionDelivery,
            isAcknowledged: alert.acknowledgedAt != nil
        )
        let lifecycle: String
        switch eventState.lifecycle {
        case .pending: lifecycle = "Pending"
        case .active: lifecycle = "Active"
        case .resolved: lifecycle = "Resolved"
        case .expired: lifecycle = "Expired"
        case .accepted: lifecycle = "Accepted by SignalWord"
        case .savedLocally: lifecycle = "Saved on this iPhone"
        case .submitting: lifecycle = "Sending"
        case .delayedConfirmation: lifecycle = "Confirmation needed"
        case .rejected: lifecycle = "Not accepted"
        case .unknown: lifecycle = "Status unavailable"
        }
        return "\(lifecycle) · \(eventState.initialDelivery.title)"
    }

    private func alertKind(_ alert: AlertStatusProjection) -> AlertKind? {
        AlertKind(rawValue: alert.kind.lowercased())
    }

    private var safetyNote: some View {
        Text("SignalWord alerts only your confirmed person. It does not call emergency services or guarantee delivery.")
            .font(.caption)
            .foregroundStyle(SignalWordColor.mutedText)
            .frame(maxWidth: .infinity)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 12)
    }
}
