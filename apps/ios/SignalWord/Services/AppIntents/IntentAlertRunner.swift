import Foundation

/// The intent's authority stops at triggering one preconfigured alert. It does
/// not return contact details, links, location, or delivery information.
enum IntentAlertRunner {
    static func triggerAlert() async -> TriggerOutcome {
        await run(kind: .real)
    }

    static func run(kind: AlertKind) async -> TriggerOutcome {
        let generation = VoiceSetupStorage.generation()
        let outcome = await AppCompositionRoot.trigger(kind: kind, method: .vocalShortcut)
        VoiceSetupStorage.record(outcome, kind: kind, generation: generation)
        return outcome
    }
}
