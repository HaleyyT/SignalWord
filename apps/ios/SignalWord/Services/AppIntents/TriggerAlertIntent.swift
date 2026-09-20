#if canImport(AppIntents)
import AppIntents

@available(iOS 18.0, *)
struct TriggerAlertIntent: AppIntent {
    static var title: LocalizedStringResource = "Trigger Alert"
    static var description = IntentDescription("Send an alert to your confirmed trusted contact.")
    static var openAppWhenRun = false
    static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

    func perform() async throws -> some IntentResult {
        _ = await IntentAlertRunner.triggerAlert()
        // Intentionally silent: locked execution must not expose private state.
        return .result()
    }
}
#endif
