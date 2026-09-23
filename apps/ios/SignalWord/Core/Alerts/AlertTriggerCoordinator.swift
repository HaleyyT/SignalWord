import Foundation

/// Coordinates one trigger attempt while delegating cross-process atomicity to
/// the durable command store. Server-side idempotency remains the final guard.
public actor AlertTriggerCoordinator {
    private let alertAPI: any AlertCreating
    private let commandStore: any AlertCommandPersisting
    private let cooldown: TimeInterval
    private let attemptLease: TimeInterval
    private let now: @Sendable () -> Date

    public init(
        alertAPI: any AlertCreating,
        commandStore: any AlertCommandPersisting,
        cooldown: TimeInterval = 60,
        attemptLease: TimeInterval = 10,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.alertAPI = alertAPI
        self.commandStore = commandStore
        self.cooldown = cooldown
        self.attemptLease = attemptLease
        self.now = now
    }

    public func trigger(kind: AlertKind, method: TriggerMethod) async -> TriggerOutcome {
        let triggeredAt = now()
        let acquisition: CanonicalCommandAcquisition
        do {
            acquisition = try await commandStore.acquireCanonicalCommand(
                kind: kind,
                method: method,
                triggeredAt: triggeredAt,
                cooldown: cooldown,
                attemptLease: attemptLease
            )
        } catch {
            // Never start networking when the command could not be persisted.
            return .failedRetryable
        }

        switch acquisition {
        case .created(_, let eventID):
            return .reused(eventID: eventID)
        case .pending:
            return .queuedOffline
        case .rejected:
            return .rejected
        case .attempt(let command):
            return await attempt(command)
        }
    }

    private func attempt(_ command: AlertCommand) async -> TriggerOutcome {
        do {
            let created = try await alertAPI.createAlert(command)
            do {
                try await commandStore.markCreated(command, alert: created, at: now())
                return .created(eventID: created.eventID)
            } catch {
                // The server may have committed. Retain the canonical key for reconciliation.
                return .failedRetryable
            }
        } catch {
            let retryable = (error as? any RetryClassifiableError)?.isRetryable == true
            do {
                if retryable {
                    try await commandStore.markQueued(command, at: now())
                    return .queuedOffline
                }
                try await commandStore.markRejected(command, at: now())
                return .rejected
            } catch {
                return .failedRetryable
            }
        }
    }
}
