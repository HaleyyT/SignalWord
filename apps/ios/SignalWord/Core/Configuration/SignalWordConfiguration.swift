import Foundation

/// Non-secret configuration stored locally after the user completes setup.
/// A real endpoint is never bundled into the source tree as a shortcut around
/// environment setup.
enum SignalWordConfiguration {
    private static let alertAPIBaseURLKey = "alertAPIBaseURL"

    static var alertAPIBaseURL: URL? {
        guard let value = UserDefaults.standard.string(forKey: alertAPIBaseURLKey) else {
            return nil
        }
        return URL(string: value)
    }

    static func setAlertAPIBaseURL(_ value: URL) {
        UserDefaults.standard.set(value.absoluteString, forKey: alertAPIBaseURLKey)
    }
}
