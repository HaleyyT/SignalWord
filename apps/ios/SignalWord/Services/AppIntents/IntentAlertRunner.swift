import Foundation

/// The intent's authority stops at triggering one preconfigured alert. It does
/// not return contact details, links, location, or delivery information.
enum IntentAlertRunner {
    private static let compositionRoot = IntentAlertCompositionRoot()

    static func triggerAlert() async -> TriggerOutcome {
        await compositionRoot.triggerAlert()
    }
}

/// One coordinator per process plus a file-locked App Group store shared by the
/// app and extension. Configuration failures remain silent to Siri but surface
/// as an inspectable retryable outcome in the app.
private actor IntentAlertCompositionRoot {
    private var coordinator: AlertTriggerCoordinator?

    func triggerAlert() async -> TriggerOutcome {
        do {
            if coordinator == nil {
                guard let baseURL = SignalWordConfiguration.alertAPIBaseURL,
                      let token = DeviceCredentialStore.loadBearerToken(),
                      let containerURL = SignalWordConfiguration.appGroupContainerURL else {
                    return .failedRetryable
                }
                let store = try FileLockedAlertCommandStore(directoryURL: containerURL)
                coordinator = AlertTriggerCoordinator(
                    alertAPI: RemoteAlertAPI(baseURL: baseURL, bearerToken: token),
                    commandStore: store
                )
            }
            guard let coordinator else { return .failedRetryable }
            return await coordinator.trigger(kind: .real, method: .vocalShortcut)
        } catch {
            return .failedRetryable
        }
    }
}
