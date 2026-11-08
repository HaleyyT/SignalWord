import SwiftUI
import AppIntents

struct VoiceSetupGuide: View {
    @Bindable var model: AppShellModel
    @Environment(\.dismiss) private var dismiss
    @AppStorage(VoiceSetupStorage.stepKey) private var savedStep = 0
    @AppStorage(VoiceSetupStorage.configurationKey) private var realConfigured = false
    @AppStorage(VoiceSetupStorage.unlockedKey) private var unlockedEvent = ""
    @AppStorage(VoiceSetupStorage.lockedKey) private var lockedEvent = ""
    @AppStorage(VoiceSetupStorage.startedKey) private var startedAt = 0.0
    @State private var suggestion: String?
    @State private var copied = false

    private var step: VoiceSetupStep { VoiceSetupStep(rawValue: savedStep) ?? .savePractice }
    private var completedTest: AlertStatusProjection? {
        model.availableAlerts.first {
            $0.kind.lowercased() == "test" && $0.state.lowercased() == "resolved"
                && $0.acknowledgedAt != nil
                && $0.triggeredAt.timeIntervalSince1970 >= startedAt
                && (step != .lockedTest || $0.eventID.uuidString != unlockedEvent)
        }
    }
    private var canContinue: Bool {
        switch step {
        case .unlockedTest: !unlockedEvent.isEmpty
        case .lockedTest: !lockedEvent.isEmpty
        default: true
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Step \(step.rawValue + 1) of \(VoiceSetupStep.allCases.count)")
                        .font(.subheadline).foregroundStyle(SignalWordColor.secondaryText)
                    ProgressView(value: Double(step.rawValue + 1), total: 6)
                        .accessibilityLabel("Voice setup progress")
                    Text(step.title).font(.title2.bold())
                    instruction
                    ShortcutsLink().frame(minHeight: 44)
                        .accessibilityIdentifier("shortcut.openAppleShortcuts")
                    Button(copied ? "Steps copied" : "Copy steps") {
                        UIPasteboard.general.string = copyableSteps
                        copied = true
                    }.frame(minHeight: 44)
                    if step != .realAction {
                        Button("Continue setup") {
                            savedStep = min(step.rawValue + 1, 5)
                            copied = false
                            suggestion = nil
                        }
                        .buttonStyle(.borderedProminent).frame(minHeight: 44)
                        .disabled(!canContinue)
                    } else {
                        Toggle("I connected my separate REAL action", isOn: $realConfigured)
                        Text("Your report records configuration only. iOS settings and future recognition cannot be verified by SignalWord.")
                            .font(.caption)
                        Button("Save and close") {
                            model.setShortcutConfigured(realConfigured)
                            dismiss()
                        }.frame(minHeight: 44)
                    }
                    if step.rawValue > 0 {
                        Button("Previous step") { savedStep = step.rawValue - 1; copied = false }
                            .frame(minHeight: 44)
                    }
                    troubleshooting
                }
                .padding(24).frame(maxWidth: 600).frame(maxWidth: .infinity)
            }
            .background(SignalWordBackground())
            .navigationTitle("Voice setup")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .tint(SignalWordColor.action)
        .onAppear { if startedAt == 0 { startedAt = Date.now.timeIntervalSince1970 } }
        .accessibilityIdentifier("shortcut.guide")
    }

    @ViewBuilder private var instruction: some View {
        switch step {
        case .savePractice:
            Text("In Apple’s Shortcuts app, tap +, search for SignalWord and choose Send TEST Alert. Name it SignalWord TEST and save it.")
            Text("Opening the list of actions sends no alert. Running Send TEST Alert starts a rehearsal for your approved contact.")
        case .choosePhrase:
            phraseGuidance
        case .connect:
            Text("Open iPhone Settings → Accessibility → Vocal Shortcuts → Add Action (or Set Up). Choose your saved SignalWord TEST shortcut. Enter your practice phrase and repeat it when iOS asks.")
            Text("Keep Vocal Shortcuts enabled. Its microphone indicator means iOS is listening for the utterance. Apple processes this audio on your device.")
        case .unlockedTest, .lockedTest:
            Text(step == .unlockedTest
                 ? "Resolve any active alert. With your phone unlocked, say your TEST phrase. Return here after your contact acknowledges the TEST and you resolve it."
                 : "Resolve any active alert. Lock your phone with SignalWord in the background, then say the TEST phrase. Unlock, review delivery, have your contact acknowledge it and resolve the TEST.")
            Text("If iOS asks you to unlock, record that limitation and repeat in the supported condition. A phrase match alone does not confirm delivery.")
            Button(model.isRecovering ? "Refreshing…" : "Refresh TEST status") {
                Task { await model.recover() }
            }.disabled(model.isRecovering).frame(minHeight: 44)
            if let test = completedTest {
                Text("Server record available: acknowledged and resolved TEST from \(test.triggeredAt.formatted(date: .abbreviated, time: .shortened)).")
                    .font(.subheadline)
                Button(step == .unlockedTest ? "I used my phrase with the phone unlocked" : "I used my phrase with the phone locked") {
                    if step == .unlockedTest { unlockedEvent = test.eventID.uuidString }
                    else { lockedEvent = test.eventID.uuidString }
                }.frame(minHeight: 44)
            }
            Text("Phone condition and use of a phrase are your report. SignalWord observes the server TEST outcome separately.")
                .font(.caption)
            if canContinue { Label("Practice report saved", systemImage: "checkmark.circle") }
            if let message = model.recoveryMessage { Text(message).font(.caption) }
        case .realAction:
            Text("Trigger Alert sends a REAL alert. Create another shortcut using that SignalWord action, name it SignalWord REAL and connect it through Vocal Shortcuts using a different phrase.")
            Text("Choose different opening words and sounds for TEST and REAL. Keep your REAL phrase private. Practise recognition through TEST before relying on voice use.")
            Text("Internet access, valid sign-in and an approved contact are required. Keychain access requires an initial unlock after restarting your phone. Device and OS behavior can require additional interaction.")
        }
    }

    private var phraseGuidance: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Choose at least four words in an unusual order that you can remember and say clearly. Avoid phrases you commonly say or hear. Practise using your normal voice and your own phone.")
            Text("Grammar is optional. Shorter phrases or other utterances may suit your speech better. Test the result on your phone.")
            Button("Suggest four words") { suggestion = VoicePhraseSuggestions.make(); copied = false }
                .frame(minHeight: 44)
            if let suggestion {
                Text(suggestion).font(.headline).accessibilityIdentifier("shortcut.phraseSuggestion")
                Text("Use this as inspiration and choose your own combination. Set the final phrase directly in iOS.")
                Button("Copy suggestion") { UIPasteboard.general.string = suggestion }
                    .frame(minHeight: 44)
            }
            Text("Suggestions exist only while this screen is open. SignalWord stores no phrase, recording or transcript. A phrase is a trigger, not an identity check.")
                .font(.caption)
        }
    }

    private var troubleshooting: some View {
        DisclosureGroup("Troubleshooting and limitations") {
            VStack(alignment: .leading, spacing: 12) {
                Text("Missing actions? Open SignalWord once, then search for SignalWord in Shortcuts. Save the TEST action before selecting it in Vocal Shortcuts.")
                Text("No response? Check Vocal Shortcuts is enabled, your phone has connectivity and SignalWord is signed in. Check the latest voice action attempt in Settings, then refresh the alert status.")
                Text("An unknown or queued result needs reconciliation. Open SignalWord and review status before retrying. Keep manual access available.")
                Text("Shortcuts and Vocal Shortcuts are different steps. The saved shortcut chooses the action; iPhone Settings connects an utterance to it.")
            }.font(.subheadline).padding(.top, 8)
        }
    }

    private var copyableSteps: String {
        """
        1. Shortcuts → + → SignalWord → Send TEST Alert. Save as SignalWord TEST.
        2. Choose four or more words in an unusual order that you can say clearly. Use an accessible alternative if needed.
        3. iPhone Settings → Accessibility → Vocal Shortcuts → Add Action. Choose SignalWord TEST and follow Apple's training prompts.
        4. Say the TEST phrase unlocked. Check delivery, acknowledgement and resolution in SignalWord.
        5. Repeat the TEST locked and backgrounded. Record any unlock requirement.
        6. Create a separate SignalWord REAL shortcut with Trigger Alert and a different phrase. Trigger Alert sends a REAL alert.
        """
    }
}
