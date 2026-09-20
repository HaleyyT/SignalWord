import Foundation

/// Serializes trigger handling and protects the system from duplicate invocations.
/// This is intentionally independent of App Intents and UI so it is testable on a
/// developer machine before the physical-device integration is available.
public actor AlertTriggerCoordinator {
    private let alertAPI: any AlertCreating
    private let persistence: any ActiveAlertPersisting
    private let cooldown: TimeInterval
    private let now: @Sendable () -> Date

    public init(
        alertAPI: any AlertCreating,
        persistence: any ActiveAlertPersisting,
        cooldown: TimeInterval = 60,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.alertAPI = alertAPI
        self.persistence = persistence
        self.cooldown = cooldown
        self.now = now
    }

    public func trigger(
        kind: AlertKind,
        method: TriggerMethod
    ) async -> TriggerOutcome {
        let triggeredAt = now()

        if let active = await persistence.loadActiveAlert(),
           triggeredAt.timeIntervalSince(active.triggeredAt) < cooldown {
            return .reused(eventID: active.eventID)
        }

        let request = AlertCreateRequest(
            kind: kind,
            triggerMethod: method,
            clientTriggeredAt: triggeredAt,
            idempotencyKey: UUID()
        )

        do {
            let created = try await alertAPI.createAlert(request)
            await persistence.saveActiveAlert(
                ActiveAlert(
                    eventID: created.eventID,
                    idempotencyKey: request.idempotencyKey,
                    triggeredAt: triggeredAt
                )
            )
            return .created(eventID: created.eventID)
        } catch {
            // Day 3 adds a redacted outbox. Until then the caller receives no
            // misleading delivery confirmation from this narrow spike.
            return .failed
        }
    }
}
