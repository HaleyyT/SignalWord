import Foundation

enum VoiceSetupStep: Int, CaseIterable {
    case savePractice, choosePhrase, connect, unlockedTest, lockedTest, realAction

    var title: String {
        switch self {
        case .savePractice: "Save the practice action"
        case .choosePhrase: "Choose your practice phrase"
        case .connect: "Connect it in iPhone Settings"
        case .unlockedTest: "Practise with your phone unlocked"
        case .lockedTest: "Practise with your phone locked"
        case .realAction: "Connect your REAL action"
        }
    }
}

enum VoicePhraseSuggestions {
    // Ordinary words in unusual combinations are suggestions, never shared defaults.
    static func make() -> String {
        let groups = [
            ["rainbow", "velvet", "copper", "pebble", "orchid", "lantern"],
            ["kettle", "ribbon", "pillow", "panda", "marble", "teapot"],
            ["lunar", "wobbly", "violet", "misty", "quiet", "silver"],
            ["socks", "waffles", "buttons", "clouds", "mittens", "spoons"],
        ]
        return groups.compactMap { $0.randomElement() }.joined(separator: " ")
    }
}

struct VoiceActionAttempt: Codable, Equatable {
    enum Outcome: String, Codable {
        case serverAccepted, existingAlert, queued, retryNeeded, rejected, confirmationNeeded

        var description: String {
            switch self {
            case .serverAccepted: "Accepted by server. Check delivery in the app."
            case .existingAlert: "Existing alert returned. Review its current status."
            case .queued: "Saved locally. Server acceptance is pending."
            case .retryNeeded: "Could not confirm the request. Open SignalWord to recover."
            case .rejected: "Request declined. Review your account and confirmed contact."
            case .confirmationNeeded: "Open SignalWord to review the active incident."
            }
        }
    }

    let date: Date
    let kind: AlertKind
    let outcome: Outcome
}

/// Stores fixed local outcomes only. A generation prevents an old request from
/// recreating diagnostics after sign-out, deletion or an identity change.
enum VoiceSetupStorage {
    private static let lock = NSLock()
    static let stepKey = "voiceSetup.step"
    static let configurationKey = "voiceSetup.realConfigured"
    static let unlockedKey = "voiceSetup.unlockedEvent"
    static let lockedKey = "voiceSetup.lockedEvent"
    static let lockedStartedKey = "voiceSetup.lockedStartedAt"
    static let unlockRequiredKey = "voiceSetup.unlockRequired"
    static let startedKey = "voiceSetup.startedAt"
    private static let attemptKey = "voiceSetup.lastAttempt"
    private static let generationKey = "voiceSetup.generation"

    static func generation(in preferences: UserDefaults = .standard) -> Int {
        lock.withLock { preferences.integer(forKey: generationKey) }
    }

    static func record(_ outcome: TriggerOutcome, kind: AlertKind, generation: Int,
                       preferences: UserDefaults = .standard, date: Date = .now) {
        lock.lock()
        defer { lock.unlock() }
        guard generation == preferences.integer(forKey: generationKey) else { return }
        let category: VoiceActionAttempt.Outcome
        switch outcome {
        case .created: category = .serverAccepted
        case .reused: category = .existingAlert
        case .queuedOffline: category = .queued
        case .failedRetryable: category = .retryNeeded
        case .rejected: category = .rejected
        case .confirmationRequired: category = .confirmationNeeded
        }
        let attempt = VoiceActionAttempt(date: date, kind: kind, outcome: category)
        if let data = try? JSONEncoder().encode(attempt) {
            preferences.set(data, forKey: attemptKey)
        }
    }

    static func latest(in preferences: UserDefaults = .standard) -> VoiceActionAttempt? {
        lock.lock()
        defer { lock.unlock() }
        guard let data = preferences.data(forKey: attemptKey) else { return nil }
        return try? JSONDecoder().decode(VoiceActionAttempt.self, from: data)
    }

    static func clear(in preferences: UserDefaults = .standard) {
        lock.lock()
        defer { lock.unlock() }
        preferences.set(preferences.integer(forKey: generationKey) + 1, forKey: generationKey)
        for key in [stepKey, configurationKey, unlockedKey, lockedKey, lockedStartedKey, unlockRequiredKey, startedKey, attemptKey] {
            preferences.removeObject(forKey: key)
        }
    }
}
