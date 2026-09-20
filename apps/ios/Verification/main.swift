import Foundation
import SignalWordCore

@main
struct SignalWordCoreVerification {
    static func main() async {
        do {
            try await verifiesFirstTriggerCreatesOneAlert()
            try await verifiesTriggerInsideCooldownReusesCanonicalEvent()
            try await verifiesFailureDoesNotPersistOrClaimAnAlert()
            print("SignalWord core verification passed.")
        } catch {
            fputs("SignalWord core verification failed: \(error)\n", stderr)
            exit(1)
        }
    }

    private static func verifiesFirstTriggerCreatesOneAlert() async throws {
        let api = RecordingAlertAPI()
        let persistence = MemoryActiveAlertStore()
        let eventID = UUID()
        await api.setNextResult(.success(CreatedAlert(eventID: eventID, serverTriggeredAt: referenceDate)))

        let coordinator = AlertTriggerCoordinator(
            alertAPI: api,
            persistence: persistence,
            now: { referenceDate }
        )
        let outcome = await coordinator.trigger(kind: .test, method: .vocalShortcut)

        try require(outcome == .created(eventID: eventID), "first trigger should create its event")
        try require(await api.requestCount() == 1, "first trigger should issue one request")
        try require(await persistence.loadActiveAlert()?.eventID == eventID, "event should be persisted")
    }

    private static func verifiesTriggerInsideCooldownReusesCanonicalEvent() async throws {
        let api = RecordingAlertAPI()
        let persistence = MemoryActiveAlertStore()
        let existingEventID = UUID()
        await persistence.saveActiveAlert(
            ActiveAlert(eventID: existingEventID, idempotencyKey: UUID(), triggeredAt: referenceDate)
        )

        let coordinator = AlertTriggerCoordinator(
            alertAPI: api,
            persistence: persistence,
            now: { referenceDate.addingTimeInterval(59) }
        )
        let outcome = await coordinator.trigger(kind: .real, method: .vocalShortcut)

        try require(outcome == .reused(eventID: existingEventID), "cooldown should reuse canonical event")
        try require(await api.requestCount() == 0, "cooldown must avoid a second request")
    }

    private static func verifiesFailureDoesNotPersistOrClaimAnAlert() async throws {
        let api = RecordingAlertAPI()
        let persistence = MemoryActiveAlertStore()
        await api.setNextResult(.failure(StubError.unavailable))

        let coordinator = AlertTriggerCoordinator(
            alertAPI: api,
            persistence: persistence,
            now: { referenceDate }
        )
        let outcome = await coordinator.trigger(kind: .real, method: .vocalShortcut)

        try require(outcome == .failed, "network failure must not claim an alert")
        try require(await persistence.loadActiveAlert() == nil, "failed request must not be persisted as active")
    }
}

private let referenceDate = Date(timeIntervalSince1970: 1_790_000_000)

private enum StubError: Error { case unavailable }
private enum VerificationError: Error { case assertion(String) }

private func require(_ condition: Bool, _ message: String) throws {
    guard condition() else { throw VerificationError.assertion(message) }
}

private actor RecordingAlertAPI: AlertCreating {
    private var result: Result<CreatedAlert, Error> = .failure(StubError.unavailable)
    private var requests: [AlertCreateRequest] = []

    func setNextResult(_ result: Result<CreatedAlert, Error>) { self.result = result }
    func createAlert(_ request: AlertCreateRequest) async throws -> CreatedAlert {
        requests.append(request)
        return try result.get()
    }
    func requestCount() -> Int { requests.count }
}

private actor MemoryActiveAlertStore: ActiveAlertPersisting {
    private var activeAlert: ActiveAlert?
    func loadActiveAlert() async -> ActiveAlert? { activeAlert }
    func saveActiveAlert(_ alert: ActiveAlert) async { activeAlert = alert }
}
