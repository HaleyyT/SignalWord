#if DEBUG && targetEnvironment(simulator)
import Foundation

/// This service exists only in simulator builds. Its data never leaves the device.
@MainActor final class UITestNetworkService: ContactNetworkServing, ContactEnrollmentServing {
    private let preferences = UserDefaults(suiteName: "SignalWord.UIJourney")!
    private let primaryID = UUID(uuidString: "10000000-0000-4000-8000-000000000001")!

    private var contacts: [NetworkContact] {
        get {
            if let data = preferences.data(forKey: "network.contacts"),
               let saved = try? JSONDecoder().decode([NetworkContact].self, from: data) { return saved }
            return [.init(contactId: primaryID, name: "Sam", channel: "email", status: "confirmed", primary: true)]
        }
        set { preferences.set(try? JSONEncoder().encode(newValue), forKey: "network.contacts") }
    }
    func contactNetwork(primary: UUID?, policy: ContactRoutingPolicy?) async throws -> ContactNetwork {
        if let primary {
            contacts = contacts.map { .init(contactId: $0.id, name: $0.name, channel: $0.channel, status: $0.status, primary: $0.id == primary) }
        }
        if let policy { preferences.set(policy.rawValue, forKey: "network.policy") }
        return .init(policy: ContactRoutingPolicy(rawValue: preferences.string(forKey: "network.policy") ?? "everyone") ?? .everyone, contacts: contacts)
    }
    func saveNetworkContact(contactID: UUID?, name: String, email: String) async throws -> TrustedContactProjection {
        let id = contactID ?? UUID()
        var updated = contacts.filter { $0.id != id }
        updated.append(.init(contactId: id, name: name, channel: "email", status: "pending", primary: false))
        contacts = updated
        return .init(contactID: id, name: name, status: "pending", confirmationExpiresAt: Date().addingTimeInterval(1800))
    }
    private var invitationID: UUID { UUID(uuidString: "20000000-0000-4000-8000-000000000001")! }
    private var attemptID: UUID { UUID(uuidString: "30000000-0000-4000-8000-000000000001")! }
    func createInvitation(key: UUID) async throws -> ContactInvitation {
        preferences.set(true, forKey: "enrollment.open")
        return .init(invitationId: invitationID, displayName: "Alex", status: "open",
            expiresAt: Date().addingTimeInterval(3600), shareURL: URL(string: "https://www.signalword.app/join/" + String(repeating: "a", count: 43)))
    }
    func listInvitations() async throws -> [ContactInvitation] {
        guard preferences.bool(forKey: "enrollment.open") else { return [] }
        return [.init(invitationId: invitationID, displayName: "Alex", status: "open", expiresAt: Date().addingTimeInterval(3600), shareURL: nil)]
    }
    func revokeInvitation(_ id: UUID) async throws { preferences.set(false, forKey: "enrollment.open") }
    func reviewInvitation(_ id: UUID) async throws -> [ContactCandidate] {
        [.init(attemptId: attemptID, emailHint: "s***@example.test", verifiedAt: Date(), expiresAt: Date().addingTimeInterval(1800))]
    }
    func approveInvitation(_ id: UUID, attempt: UUID, name: String) async throws -> ContactApproval {
        let contactID = preferences.string(forKey: "fixture.contact") == nil ? primaryID : UUID()
        preferences.set(name, forKey: "fixture.contact")
        preferences.set("confirmed", forKey: "fixture.contactStatus")
        preferences.set(false, forKey: "enrollment.open")
        if !contacts.contains(where: { $0.name == name }) {
            contacts = contacts + [.init(contactId: contactID, name: name, channel: "email", status: "confirmed", primary: false)]
        }
        return .init(contactId: contactID, status: "confirmed")
    }
    func recipientProgress(eventID: UUID) async throws -> [RecipientProgress] {
        contacts.filter { $0.status == "confirmed" }.map {
            .init(contactId: $0.id, name: $0.name, revoked: false, scheduledAt: Date(), delivery: "queued", acknowledgedAt: nil, resolutionDelivery: nil, failureCode: nil)
        }
    }
    func disableContact(contactID: UUID) async throws -> Bool {
        contacts = contacts.map { .init(contactId: $0.id, name: $0.name, channel: $0.channel, status: $0.id == contactID ? "disabled" : $0.status, primary: $0.primary) }
        return true
    }
}
#endif
