import Foundation

public enum AlertKind: String, Codable, Sendable {
    case test
    case real
}

public enum TriggerMethod: String, Codable, Sendable {
    case vocalShortcut
    case siri
    case actionButton
    case manual
}

/// The JSON body sent to the alert API. Idempotency is intentionally not part
/// of this type: it is transported exclusively in the `Idempotency-Key` header.
public struct AlertCreateRequest: Codable, Equatable, Sendable {
    public let kind: AlertKind
    public let triggerMethod: TriggerMethod
    public let clientTriggeredAt: Date

    public init(kind: AlertKind, triggerMethod: TriggerMethod, clientTriggeredAt: Date) {
        self.kind = kind
        self.triggerMethod = triggerMethod
        self.clientTriggeredAt = clientTriggeredAt
    }
}

/// The durable, redacted command created before network work starts.
public struct AlertCommand: Codable, Equatable, Sendable {
    public let idempotencyKey: UUID
    public let kind: AlertKind
    public let triggerMethod: TriggerMethod
    public let clientTriggeredAt: Date

    public init(
        idempotencyKey: UUID,
        kind: AlertKind,
        triggerMethod: TriggerMethod,
        clientTriggeredAt: Date
    ) {
        self.idempotencyKey = idempotencyKey
        self.kind = kind
        self.triggerMethod = triggerMethod
        self.clientTriggeredAt = clientTriggeredAt
    }

    public var request: AlertCreateRequest {
        AlertCreateRequest(kind: kind, triggerMethod: triggerMethod, clientTriggeredAt: clientTriggeredAt)
    }
}

public struct CreatedAlert: Equatable, Sendable {
    public let eventID: UUID
    public let serverTriggeredAt: Date

    public init(eventID: UUID, serverTriggeredAt: Date) {
        self.eventID = eventID
        self.serverTriggeredAt = serverTriggeredAt
    }
}

public enum TriggerOutcome: Equatable, Sendable {
    case created(eventID: UUID)
    case reused(eventID: UUID)
    case queuedOffline
    case rejected
    case failedRetryable
}

public enum PersistedTriggerPhase: String, Codable, Sendable {
    case attempting
    case queuedOffline
    case created
    case rejected
}

/// Inspectable local truth for the app UI. This record contains no recipient,
/// phrase, public token, location, or other sensitive alert content.
public struct PersistedTriggerRecord: Codable, Equatable, Sendable {
    public let command: AlertCommand
    public let phase: PersistedTriggerPhase
    public let updatedAt: Date
    public let retryCount: Int
    public let nextAttemptAt: Date?
    public let canonicalEventID: UUID?

    public init(
        command: AlertCommand,
        phase: PersistedTriggerPhase,
        updatedAt: Date,
        retryCount: Int = 0,
        nextAttemptAt: Date? = nil,
        canonicalEventID: UUID? = nil
    ) {
        self.command = command
        self.phase = phase
        self.updatedAt = updatedAt
        self.retryCount = retryCount
        self.nextAttemptAt = nextAttemptAt
        self.canonicalEventID = canonicalEventID
    }
}

public enum CanonicalCommandAcquisition: Equatable, Sendable {
    case attempt(AlertCommand)
    case pending(AlertCommand)
    case created(AlertCommand, eventID: UUID)
    case rejected(AlertCommand)
}

public protocol AlertCommandPersisting: Sendable {
    func acquireCanonicalCommand(
        kind: AlertKind,
        method: TriggerMethod,
        triggeredAt: Date,
        cooldown: TimeInterval,
        attemptLease: TimeInterval
    ) async throws -> CanonicalCommandAcquisition

    func markCreated(_ command: AlertCommand, alert: CreatedAlert, at: Date) async throws
    func markQueued(_ command: AlertCommand, at: Date) async throws
    func markRejected(_ command: AlertCommand, at: Date) async throws
    func latestTriggerRecord() async -> PersistedTriggerRecord?
}

public protocol AlertCreating: Sendable {
    func createAlert(_ command: AlertCommand) async throws -> CreatedAlert
}

public protocol RetryClassifiableError: Error, Sendable {
    var isRetryable: Bool { get }
}

public enum AlertLifecycleState: String, Codable, Sendable {
    case ready, triggering, pendingDelivery, active, resolving, resolved, recoverableError

    public func canTransition(to next: AlertLifecycleState) -> Bool {
        switch (self, next) {
        case (.ready, .triggering), (.triggering, .pendingDelivery),
             (.triggering, .recoverableError), (.pendingDelivery, .active),
             (.pendingDelivery, .recoverableError), (.active, .resolving),
             (.resolving, .resolved), (.recoverableError, .triggering):
            return true
        default:
            return false
        }
    }
}

public enum LocationFreshness: String, Codable, Sendable {
    case live, recent, stale, unavailable

    public static func classify(lastReceivedAt: Date?, serverNow: Date) -> LocationFreshness {
        guard let lastReceivedAt else { return .unavailable }
        let age = serverNow.timeIntervalSince(lastReceivedAt)
        if age <= 30 { return .live }
        if age <= 120 { return .recent }
        return .stale
    }
}
