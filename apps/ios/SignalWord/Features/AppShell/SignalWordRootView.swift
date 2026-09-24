import SwiftUI

struct SignalWordRootView: View {
    @Bindable var model: AppShellModel

    var body: some View {
        NavigationStack {
            Group {
                if model.hasEnteredDashboard {
                    dashboard
                } else {
                    onboarding
                }
            }
            .background(Color(.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle(model.hasEnteredDashboard ? "SignalWord" : model.stage.title)
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var onboarding: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                stageIndicator
                switch model.stage {
                case .understand: understandStage
                case .contact: contactStage
                case .rehearse: rehearsalStage
                }
            }
            .padding(20)
        }
    }

    private var stageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(OnboardingStage.allCases) { stage in
                Capsule()
                    .fill(stage.rawValue <= model.stage.rawValue ? SignalWordColor.action : Color.secondary.opacity(0.2))
                    .frame(height: 6)
                    .accessibilityHidden(true)
            }
        }
        .accessibilityLabel("Setup step \(model.stage.rawValue + 1) of \(OnboardingStage.allCases.count)")
    }

    private var understandStage: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("A quiet way to alert one person you trust")
                .font(.largeTitle.bold())
                .accessibilityAddTraits(.isHeader)
            Text("You choose a private phrase in iOS Vocal Shortcuts. iOS listens for it and runs SignalWord's alert action—even while the phone is locked when the device allows it.")
                .font(.title3)
            SignalWordCard {
                Label("SignalWord does not continuously record audio.", systemImage: "waveform.slash")
                Text("It does not contact police or emergency services, and delivery cannot be guaranteed. Contact emergency services directly whenever you safely can.")
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
            }
            Button("Set up SignalWord") { model.advanceFromUnderstanding() }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    private var contactStage: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Choose one trusted contact")
                .font(.largeTitle.bold())
                .accessibilityAddTraits(.isHeader)
            Text("They must confirm before REAL alerts are enabled. They will see your chosen name, the alert status, and any available location snapshot.")
                .foregroundStyle(.secondary)
            SignalWordCard {
                TextField("Contact name", text: $model.contactName)
                    .textContentType(.name)
                    .textInputAutocapitalization(.words)
                Divider().padding(.vertical, 8)
                TextField("Email address", text: $model.contactEmail)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
            }
            if let message = model.contactValidationMessage {
                Text(message).font(.footnote).foregroundStyle(.secondary)
            }
            Text("No email is sent from this screen until the secure contact API is connected.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Button("Save draft and continue") { _ = model.saveContactDraft() }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(model.contactValidationMessage != nil)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    private var rehearsalStage: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Prove it before you need it")
                .font(.largeTitle.bold())
                .accessibilityAddTraits(.isHeader)
            Text("Add “Trigger Alert” in Settings › Accessibility › Vocal Shortcuts, choose a private phrase, then run two locked TEST alerts with your contact watching a second device.")
                .foregroundStyle(.secondary)
            SignalWordCard {
                Toggle("I added the Vocal Shortcut", isOn: Binding(
                    get: { model.shortcutConfigured },
                    set: { model.setShortcutConfigured($0) }
                ))
                Text("TEST emails must say “TEST — NO EMERGENCY.” Never count a rehearsal until the second device actually receives it.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
            }
            Button("Send TEST alert") { Task { await model.runRehearsal() } }
                .buttonStyle(.bordered)
                .controlSize(.large)
                .disabled(!model.backendConfigured || !model.hasContactDraft)
            Button("I verified it on the second device") { model.recordVerifiedLockedRehearsal() }
                .disabled(model.successfulRehearsals >= 2)
            Button("Open readiness dashboard") { model.enterDashboard() }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    private var dashboard: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SignalWordCard {
                    Text(model.isFullyReady ? "Ready for rehearsals" : "Setup needs attention")
                        .font(.title2.bold())
                    Text(model.isFullyReady
                         ? "Your local checks are complete. Keep testing regularly and remember SignalWord is not an emergency service."
                         : "Complete every evidence-backed row before relying on the shortcut.")
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }

                Text("Readiness").font(.title2.bold()).accessibilityAddTraits(.isHeader)
                SignalWordCard {
                    VStack(spacing: 16) {
                        ForEach(Array(model.readinessRows.enumerated()), id: \.offset) { _, row in
                            StatusRow(title: row.0, detail: row.1, state: row.2)
                        }
                    }
                }

                Text("Alert status").font(.title2.bold()).accessibilityAddTraits(.isHeader)
                SignalWordCard {
                    Text(model.alertState.headline).font(.headline)
                    Text(model.alertState.detail).foregroundStyle(.secondary).padding(.top, 4)
                    if let message = model.resolveMessage {
                        Text(message).font(.footnote).foregroundStyle(SignalWordColor.attention).padding(.top, 8)
                    }
                }

                HoldToTriggerButton(isEnabled: model.backendConfigured) {
                    await model.triggerRealAlert()
                }

                Button("Resolve active alert") { model.requestResolution() }
                    .buttonStyle(.bordered)
                    .disabled({ if case .accepted = model.alertState { false } else { true } }())

                Text("SignalWord alerts only your confirmed contact. It does not call police, monitor audio, guarantee delivery, or replace emergency services.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 8)
            }
            .padding(20)
        }
    }
}

private struct HoldToTriggerButton: View {
    let isEnabled: Bool
    let action: @Sendable () async -> Void
    @State private var isHolding = false
    @State private var isRunning = false

    var body: some View {
        Text(isRunning ? "Creating alert…" : isHolding ? "Keep holding…" : "Hold for REAL alert")
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 56)
            .foregroundStyle(.white)
            .background(isEnabled ? SignalWordColor.attention : Color.secondary, in: RoundedRectangle(cornerRadius: 18))
            .contentShape(Rectangle())
            .gesture(
                LongPressGesture(minimumDuration: 1.5)
                    .onChanged { _ in isHolding = true }
                    .onEnded { completed in
                        isHolding = false
                        guard completed, isEnabled, !isRunning else { return }
                        isRunning = true
                        Task {
                            await action()
                            await MainActor.run { isRunning = false }
                        }
                    }
            )
            .opacity(isEnabled ? 1 : 0.55)
            .accessibilityLabel("Hold for one and a half seconds to create a real alert")
            .accessibilityHint(isEnabled ? "Alerts your confirmed trusted contact" : "Complete backend setup first")
            .accessibilityAddTraits(.isButton)
            .accessibilityAction {
                guard isEnabled, !isRunning else { return }
                isRunning = true
                Task {
                    await action()
                    await MainActor.run { isRunning = false }
                }
            }
    }
}
