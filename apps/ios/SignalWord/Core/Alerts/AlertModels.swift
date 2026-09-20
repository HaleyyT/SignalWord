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
    case failed
}

public protocol AlertCreating: Sendable {
    func createAlert(_ request: AlertCreateRequest) async throws -> CreatedAlert
}

public protocol ActiveAlertPersisting: Sendable {
    func loadActiveAlert() async -> ActiveAlert?
    func saveActiveAlert(_ alert: ActiveAlert) async
}
