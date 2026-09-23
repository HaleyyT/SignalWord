import Foundation

/// Non-secret configuration stored locally after the user completes setup.
/// A real endpoint is never bundled into the source tree as a shortcut around
/// environment setup.
enum SignalWordConfiguration {
    private static let alertAPIBaseURLKey = "alertAPIBaseURL"
    private static let appGroupInfoKey = "SignalWordAppGroupIdentifier"

    static var alertAPIBaseURL: URL? {
        guard let value = UserDefaults.standard.string(forKey: alertAPIBaseURLKey) else {
            return nil
        }
        return URL(string: value)
    }

    static func setAlertAPIBaseURL(_ value: URL) {
        UserDefaults.standard.set(value.absoluteString, forKey: alertAPIBaseURLKey)
    }

    /// Supplied by the signed app/extension Info.plist and matching entitlement.
    /// There is deliberately no source-code fallback: using the standard app
    /// container would break cross-process idempotency for App Intents.
    static var appGroupContainerURL: URL? {
        guard let identifier = Bundle.main.object(forInfoDictionaryKey: appGroupInfoKey) as? String,
              !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: identifier
        )
    }
}
