import Foundation

/// The intent's authority stops at triggering one preconfigured alert. It does
/// not return contact details, links, location, or delivery information.
enum IntentAlertRunner {
    static func triggerAlert() async -> TriggerOutcome {
        guard let baseURL = SignalWordConfiguration.alertAPIBaseURL,
              let token = DeviceCredentialStore.loadBearerToken() else {
            return .failed
        }

        let coordinator = AlertTriggerCoordinator(
            alertAPI: RemoteAlertAPI(baseURL: baseURL, bearerToken: token),
            persistence: UserDefaultsActiveAlertStore()
        )
        return await coordinator.trigger(kind: .real, method: .vocalShortcut)
    }
}
