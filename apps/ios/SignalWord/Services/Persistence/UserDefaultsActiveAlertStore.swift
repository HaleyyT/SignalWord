import Foundation

actor UserDefaultsActiveAlertStore: ActiveAlertPersisting {
    private let defaults: UserDefaults
    private let key = "activeAlert"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func loadActiveAlert() async -> ActiveAlert? {
        guard let data = defaults.data(forKey: key) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(PersistedActiveAlert.self, from: data).activeAlert
    }

    func saveActiveAlert(_ alert: ActiveAlert) async {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(PersistedActiveAlert(activeAlert: alert)) else { return }
        defaults.set(data, forKey: key)
    }
}

private struct PersistedActiveAlert: Codable {
    let activeAlert: ActiveAlert
}

extension ActiveAlert: Codable {}
