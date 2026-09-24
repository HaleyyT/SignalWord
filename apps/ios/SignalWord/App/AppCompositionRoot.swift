import Foundation

/// Builds the smallest production dependency graph available in this slice.
/// Missing environment or identity configuration fails closed and is surfaced
/// as "not ready"; the UI never substitutes a simulated provider success.
enum AppCompositionRoot {
    static func makeTrigger() -> AppShellModel.Trigger {
        return { kind, method in
            guard let baseURL = SignalWordConfiguration.alertAPIBaseURL,
                  let token = DeviceCredentialStore.loadBearerToken(),
                  let containerURL = SignalWordConfiguration.appGroupContainerURL else {
                return .failedRetryable
            }

            do {
                let store = try FileLockedAlertCommandStore(directoryURL: containerURL)
                let coordinator = AlertTriggerCoordinator(
                    alertAPI: RemoteAlertAPI(baseURL: baseURL, bearerToken: token),
                    commandStore: store
                )
                return await coordinator.trigger(kind: kind, method: method)
            } catch {
                return .failedRetryable
            }
        }
    }

    static var hasAlertConfiguration: Bool {
        SignalWordConfiguration.alertAPIBaseURL != nil
            && DeviceCredentialStore.loadBearerToken() != nil
            && SignalWordConfiguration.appGroupContainerURL != nil
    }
}
