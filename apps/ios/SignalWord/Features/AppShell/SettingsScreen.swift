import SwiftUI
import Observation

struct SettingsScreen: View {
    @Bindable var model: AppShellModel
    let openPeople: () -> Void
    let openDeleteConfirmation: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                PageHeading(eyebrow: "YOUR SETUP", title: "Settings", detail: "Keep your signal familiar, private, and ready to use.")

                settingsGroup(title: "Signal") {
                    PrivacyLine(
                        symbol: "waveform",
                        title: "Vocal Shortcuts",
                        detail: "In Settings › Accessibility › Vocal Shortcuts, add separate TEST and REAL actions with different phrases."
                    )
                    Divider().overlay(SignalWordColor.separator)
                    Toggle(isOn: Binding(get: { model.shortcutConfigured }, set: { model.setShortcutConfigured($0) })) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("I added both shortcuts").font(.subheadline.weight(.medium))
                            Text("Self-reported. SignalWord cannot inspect iOS settings.")
                                .font(.caption).foregroundStyle(SignalWordColor.secondaryText)
                        }
                    }
                    .tint(SignalWordColor.action)
                    Divider().overlay(SignalWordColor.separator)
                    CapabilityRow(
                        title: model.rehearsalReadiness.title,
                        detail: model.rehearsalReadiness.detail,
                        isReady: model.rehearsalReadiness.isReady,
                        symbol: "checkmark.message"
                    ) { openPeople() }
                    Divider().overlay(SignalWordColor.separator)
                    CapabilityRow(
                        title: model.lockedTestReadiness.title,
                        detail: model.lockedTestReadiness.detail,
                        isReady: model.lockedTestReadiness.isReady,
                        symbol: "lock.iphone"
                    ) { openPeople() }
                }

                settingsGroup(title: "Privacy and location") {
                    VStack(alignment: .leading, spacing: 10) {
                        Label("Location is optional", systemImage: "location")
                            .font(.subheadline.weight(.semibold))
                        Text(model.locationState.summary)
                            .font(.caption)
                            .foregroundStyle(SignalWordColor.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                        if model.locationState == .notRequested {
                            Button("Allow location while using SignalWord") { Task { await model.requestLocationAccess() } }
                                .font(.subheadline.weight(.semibold))
                                .frame(minHeight: 44)
                        }
                    }
                    Divider().overlay(SignalWordColor.separator)
                    PrivacyLine(symbol: "lock.fill", title: "Private by default", detail: "A recent point-in-time location may be shared with an alert. SignalWord does not track movement.")
                    Divider().overlay(SignalWordColor.separator)
                    PrivacyLine(symbol: "waveform.slash", title: "No continuous recording", detail: "Your chosen phrase is managed by iOS Vocal Shortcuts.")
                }

                settingsGroup(title: "Account") {
                    SettingsRow(
                        symbol: "arrow.clockwise",
                        title: model.isRecovering ? "Checking…" : "Refresh alert status",
                        detail: "Reconcile saved commands and delivery reports",
                        tint: SignalWordColor.action
                    ) { Task { await model.recover() } }
                    .disabled(model.isRecovering)
                    Divider().overlay(SignalWordColor.separator)
                    Button(action: openDeleteConfirmation) {
                        HStack(spacing: 12) {
                            Image(systemName: "person.crop.circle.badge.xmark")
                                .foregroundStyle(SignalWordColor.critical)
                                .frame(width: 24, height: 24)
                                .accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Delete account and data")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(SignalWordColor.critical)
                                Text("Remove your device identity and server data")
                                    .font(.caption)
                                    .foregroundStyle(SignalWordColor.secondaryText)
                                    .multilineTextAlignment(.leading)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(SignalWordColor.mutedText)
                                .accessibilityHidden(true)
                        }
                        .frame(minHeight: 48)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("account.delete")
                }

                if let message = model.accountMessage { InlineMessage(message, kind: .attention) }
                Text("SignalWord notifies your confirmed person only. It does not contact emergency services or guarantee delivery.")
                    .font(.caption)
                    .foregroundStyle(SignalWordColor.mutedText)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: 600)
            .padding(.horizontal, SignalWordSpacing.page)
            .padding(.top, 18)
            .padding(.bottom, 32)
            .frame(maxWidth: .infinity)
        }
        .background(SignalWordColor.canvas.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }

    private func settingsGroup<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption.weight(.bold))
                .tracking(1)
                .foregroundStyle(SignalWordColor.secondaryText)
            SignalWordCard { VStack(spacing: 13, content: content) }
        }
    }
}
