import XCTest
@testable import SignalWordCore

@MainActor
final class VoiceSetupTests: XCTestCase {
    func testSuggestionHasFourDistinctWords() {
        for _ in 0..<50 {
            let words = VoicePhraseSuggestions.make().split(separator: " ")
            XCTAssertEqual(words.count, 4)
            XCTAssertEqual(Set(words).count, 4)
        }
    }

    func testOutcomesStoreNoIncidentOrPhraseAndClearRejectsLateResult() throws {
        let name = "VoiceSetupTests." + UUID().uuidString
        let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
        defer { preferences.removePersistentDomain(forName: name) }
        let generation = VoiceSetupStorage.generation(in: preferences)
        let incident = UUID()
        VoiceSetupStorage.record(.created(eventID: incident), kind: .test,
                                 generation: generation, preferences: preferences)
        XCTAssertEqual(VoiceSetupStorage.latest(in: preferences)?.outcome, .serverAccepted)
        let stored = try XCTUnwrap(preferences.data(forKey: "voiceSetup.lastAttempt"))
        XCTAssertFalse(String(decoding: stored, as: UTF8.self).contains(incident.uuidString))
        preferences.set(4, forKey: VoiceSetupStorage.stepKey)
        VoiceSetupStorage.clear(in: preferences)
        VoiceSetupStorage.record(.queuedOffline, kind: .real,
                                 generation: generation, preferences: preferences)
        XCTAssertNil(VoiceSetupStorage.latest(in: preferences))
        XCTAssertEqual(preferences.integer(forKey: VoiceSetupStorage.stepKey), 0)
    }

    func testUncertainAndReusedActionsNeverBecomeDeliverySuccess() throws {
        let name = "VoiceSetupTests." + UUID().uuidString
        let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
        defer { preferences.removePersistentDomain(forName: name) }
        let outcomes: [(TriggerOutcome, VoiceActionAttempt.Outcome)] = [
            (.reused(eventID: UUID()), .existingAlert), (.queuedOffline, .queued),
            (.failedRetryable, .retryNeeded), (.rejected, .rejected),
            (.confirmationRequired, .confirmationNeeded),
        ]
        for (outcome, expected) in outcomes {
            VoiceSetupStorage.record(outcome, kind: .real,
                                     generation: VoiceSetupStorage.generation(in: preferences),
                                     preferences: preferences)
            XCTAssertEqual(VoiceSetupStorage.latest(in: preferences)?.outcome, expected)
        }
    }
}
