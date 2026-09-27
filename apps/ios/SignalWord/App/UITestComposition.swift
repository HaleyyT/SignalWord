#if DEBUG && targetEnvironment(simulator)
import Foundation

/// Simulator-only service boundary for UI journeys. No production credentials,
/// network requests, or real recipient messages are available in this mode.
@MainActor
enum UITestComposition {
    static func makeModel() -> AppShellModel? {
        let arguments = ProcessInfo.processInfo.arguments
        guard arguments.contains("--ui-testing") else { return nil }
        let preferences = UserDefaults(suiteName: "SignalWord.UIJourney")!
        if arguments.contains("--reset-ui-state") {
            preferences.removePersistentDomain(forName: "SignalWord.UIJourney")
        }
        let service = UITestService(preferences: preferences)
        return AppShellModel(backendConfigured: true, trigger: { kind, _ in
            await service.trigger(kind)
        }, lifecycle: .init(
            prepare: {}, profile: { name in await service.profile(name) },
            recover: { _ in await service.recover() },
            saveContact: { name, _ in await service.saveContact(name) },
            getContact: { await service.contact() },
            disableContact: { _ in await service.withdraw() },
            getAlertStatus: { id in try await service.status(id) },
            authenticateResolution: { true },
            resolve: { id in try await service.resolve(id) },
            locationAuthorization: { .denied }, requestLocationAccess: { .denied },
            deleteAccount: { await service.delete() }
        ), preferences: preferences)
    }
}

/// State persists across process termination so tests exercise launch recovery,
/// rather than accidentally relying on the view model surviving in memory.
@MainActor
private final class UITestService {
    private let preferences: UserDefaults
    private let contactID = UUID(uuidString: "10000000-0000-4000-8000-000000000001")!
    init(preferences: UserDefaults) { self.preferences = preferences }

    func profile(_ name: String?) -> String {
        if let name { preferences.set(name, forKey: "fixture.name") }
        return preferences.string(forKey: "fixture.name") ?? ""
    }
    func saveContact(_ name: String) -> TrustedContactProjection {
        preferences.set(name, forKey: "fixture.contact")
        preferences.set("confirmed", forKey: "fixture.contactStatus")
        return contact()!
    }
    func contact() -> TrustedContactProjection? {
        guard let name = preferences.string(forKey: "fixture.contact") else { return nil }
        return .init(contactID: contactID, name: name,
                     status: preferences.string(forKey: "fixture.contactStatus") ?? "disabled",
                     confirmationExpiresAt: nil)
    }
    func withdraw() -> Bool {
        preferences.set("disabled", forKey: "fixture.contactStatus")
        return true
    }
    func trigger(_ kind: AlertKind) -> TriggerOutcome {
        let id = UUID()
        preferences.set(id.uuidString, forKey: "fixture.event")
        preferences.set(kind.rawValue, forKey: "fixture.kind")
        preferences.set("active", forKey: "fixture.state")
        return .created(eventID: id)
    }
    func status(_ id: UUID) throws -> AlertStatusProjection {
        guard preferences.string(forKey: "fixture.event") == id.uuidString else { throw UserAPIError.invalidResponse }
        return .init(eventID: id, kind: preferences.string(forKey: "fixture.kind") ?? "test", triggeredAt: Date(),
                     acknowledgedAt: nil, resolutionDelivery: nil,
                     state: preferences.string(forKey: "fixture.state") ?? "active", delivery: "sent", resolvedAt: nil)
    }
    func recover() -> AppRecovery {
        let alerts = preferences.string(forKey: "fixture.event").flatMap(UUID.init(uuidString:))
            .flatMap { try? status($0) }.map { [$0] } ?? []
        return .init(alerts: alerts, needsConfirmation: false, pending: false)
    }
    func resolve(_ id: UUID) throws -> ResolvedAlertProjection {
        _ = try status(id)
        preferences.set("resolved", forKey: "fixture.state")
        return .init(eventID: id, state: "resolved", resolvedAt: Date())
    }
    func delete() { preferences.removePersistentDomain(forName: "SignalWord.UIJourney") }
}
#endif
