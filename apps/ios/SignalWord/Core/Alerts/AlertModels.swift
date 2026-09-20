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

/// The minimum safe payload for the first alert request. Location is deliberately
/// omitted here: alert creation must never wait for a location sample.
public struct AlertCreateRequest: Codable, Equatable, Sendable {
    public let kind: AlertKind
    public let triggerMethod: TriggerMethod
    public let clientTriggeredAt: Date
    public let idempotencyKey: UUID

    public init(
        kind: AlertKind,
        triggerMethod: TriggerMethod,
        clientTriggeredAt: Date,
        idempotencyKey: UUID
    ) {
        self.kind = kind
        self.triggerMethod = triggerMethod
        self.clientTriggeredAt = clientTriggeredAt
        self.idempotencyKey = idempotencyKey
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

public struct ActiveAlert: Equatable, Sendable {
    public let eventID: UUID
    public let idempotencyKey: UUID
    public let triggeredAt: Date

    public init(eventID: UUID, idempotencyKey: UUID, triggeredAt: Date) {
        self.eventID = eventID
        self.idempotencyKey = idempotencyKey
        self.triggeredAt = triggeredAt
    }
}

public enum TriggerOutcome: Equatable, Sendable {
    case created(eventID: UUID)
    case reused(eventID: UUID)
    case queuedOffline
    case failed
}

public enum AlertLifecycleState: String, Codable, Sendable {
    case ready
    case triggering
    case pendingDelivery
    case active
    case resolving
    case resolved
    case recoverableError

    public func canTransition(to next: AlertLifecycleState) -> Bool {
        switch (self, next) {
        case (.ready, .triggering),
             (.triggering, .pendingDelivery),
             (.triggering, .recoverableError),
             (.pendingDelivery, .active),
             (.pendingDelivery, .recoverableError),
             (.active, .resolving),
             (.resolving, .resolved),
             (.recoverableError, .triggering):
            return true
        default:
            return false
        }
    }
}

public enum LocationFreshness: String, Codable, Sendable {
    case live
    case recent
    case stale
    case unavailable

    /// The viewer must use the server receive time, never the device clock alone.
    public static func classify(lastReceivedAt: Date?, serverNow: Date) -> LocationFreshness {
        guard let lastReceivedAt else { return .unavailable }
        let age = serverNow.timeIntervalSince(lastReceivedAt)
        if age <= 30 { return .live }
        if age <= 120 { return .recent }
        return .stale
    }
}

public protocol AlertCreating: Sendable {
    func createAlert(_ request: AlertCreateRequest) async throws -> CreatedAlert
}

public protocol ActiveAlertPersisting: Sendable {
    func loadActiveAlert() async -> ActiveAlert?
    func saveActiveAlert(_ alert: ActiveAlert) async
}

/// Errors conforming to this protocol may be queued for a later permitted retry.
/// Authentication, validation, and configuration failures must not be retried.
public protocol RetryClassifiableError: Error, Sendable {
    var isRetryable: Bool { get }
}

/// A deliberately redacted local retry record: no phrase, contact, token,
/// destination, or precise location enters the outbox.
public struct PendingAlert: Codable, Equatable, Sendable {
    public let request: AlertCreateRequest
    public let queuedAt: Date

    public init(request: AlertCreateRequest, queuedAt: Date) {
        self.request = request
        self.queuedAt = queuedAt
    }
}

public protocol AlertOutboxPersisting: Sendable {
    func enqueue(_ pendingAlert: PendingAlert) async
}
