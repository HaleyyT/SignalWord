import Foundation
import Observation

@MainActor @Observable
final class ContactNetworkModel {
    private let api: (any ContactNetworkServing)?
    private var generation = 0
    private var refreshVersion = 0
    private(set) var network: ContactNetwork?
    private(set) var recipientEventID: UUID?
    private(set) var recipients: [RecipientProgress] = []
    private(set) var busy = false
    private(set) var message: String?

    init(api: (any ContactNetworkServing)?) { self.api = api }

    func clear() {
        generation += 1
        refreshVersion += 1
        network = nil
        recipients = []
        recipientEventID = nil
        message = nil
    }

    func refresh(eventID: UUID?) async {
        guard let api, !busy else { return }
        let requestGeneration = generation
        refreshVersion += 1
        let version = refreshVersion
        do {
            let updated = try await api.contactNetwork(primary: nil, policy: nil)
            let progress: [RecipientProgress]
            if let eventID { progress = try await api.recipientProgress(eventID: eventID) } else { progress = [] }
            guard generation == requestGeneration, version == refreshVersion else { return }
            network = updated
            recipients = progress
            recipientEventID = eventID
            message = nil
        } catch {
            guard generation == requestGeneration, version == refreshVersion else { return }
            message = "Could not refresh your circle. Displayed progress may be out of date. Retry when connected."
        }
    }

    func save(contactID: UUID?, name: String, email: String) async -> Bool {
        await perform { api in _ = try await api.saveNetworkContact(contactID: contactID, name: name, email: email) }
    }

    func configure(primary: UUID? = nil, policy: ContactRoutingPolicy? = nil) async {
        _ = await perform { api in _ = try await api.contactNetwork(primary: primary, policy: policy) }
    }

    func withdraw(_ id: UUID) async {
        _ = await perform { api in _ = try await api.disableContact(contactID: id) }
    }

    private func perform(_ action: (any ContactNetworkServing) async throws -> Void) async -> Bool {
        guard let api, !busy else { return false }
        refreshVersion += 1
        busy = true
        let requestGeneration = generation
        defer { busy = false }
        do {
            try await action(api)
            let updated = try await api.contactNetwork(primary: nil, policy: nil)
            guard generation == requestGeneration else { return false }
            network = updated
            message = nil
            return true
        } catch {
            guard generation == requestGeneration else { return false }
            message = "The change could not be confirmed. Refresh before retrying. No new consent or routing is assumed."
            return false
        }
    }
}

@MainActor @Observable
final class ContactEnrollmentModel {
    private let api: (any ContactEnrollmentServing)?
    private var generation = 0
    private let origin: URL
    private var loaded = false
    private var createKey: UUID?
    private(set) var invitations: [ContactInvitation] = []
    private(set) var candidates: [ContactCandidate] = []
    private(set) var reviewing: UUID?
    private(set) var shared: ContactInvitation?
    private(set) var busy = false
    private(set) var message: String?

    init(api: (any ContactEnrollmentServing)?, origin: URL = URL(string: "https://www.signalword.app")!) { self.api = api; self.origin = origin }

    var shareURL: URL? { shared?.safeShareURL(origin: origin) }

    func clear() {
        generation += 1
        invitations = []; candidates = []; reviewing = nil; shared = nil
        createKey = nil; loaded = false; message = nil; busy = false
    }

    private func perform(_ action: () async throws -> Void) async {
        guard api != nil, !busy else {
            if api == nil { message = "Private invitations are unavailable in this configuration." }
            return
        }
        let current = generation
        busy = true
        defer { if current == generation { busy = false } }
        do { try await action() }
        catch {
            guard current == generation else { return }
            message = "Could not confirm this change. Refresh and retry when connected. No contact is assumed approved."
        }
    }

    func refresh() async {
        let current = generation
        await perform {
            let result = try await api!.listInvitations()
            guard current == generation else { return }
            invitations = result; loaded = true; candidates = []; reviewing = nil; message = nil
            if let shared, !result.contains(where: { $0.id == shared.id && $0.isOpen }) { self.shared = nil; createKey = nil }
        }
    }

    func create() async {
        if !loaded { await refresh() }
        guard loaded else { return }
        if createKey == nil && invitations.contains(where: { $0.isOpen }) {
            message = "An invitation is already open. Review it, or close it before creating a new link."
            return
        }
        if createKey == nil { createKey = UUID() }
        let key = createKey!, current = generation
        await perform {
            let result = try await api!.createInvitation(key: key)
            guard current == generation else { return }
            shared = result
            if !result.isOpen { createKey = nil }
            invitations.removeAll { $0.id == result.id }; invitations.insert(result, at: 0)
            message = result.safeShareURL(origin: origin) == nil ? "This link is unavailable. Close it and create a new invitation." : nil
        }
    }

    func review(_ id: UUID) async {
        let current = generation
        await perform {
            let result = try await api!.reviewInvitation(id)
            guard current == generation else { return }
            candidates = result; reviewing = id; message = nil
        }
    }

    func revoke(_ id: UUID) async {
        let current = generation
        await perform {
            try await api!.revokeInvitation(id)
            guard current == generation else { return }
            invitations.removeAll { $0.id == id }
            if shared?.id == id { shared = nil; createKey = nil }
            if reviewing == id { reviewing = nil; candidates = [] }
            message = "Invitation closed. This does not withdraw an already approved contact."
        }
    }

    func approve(_ candidate: ContactCandidate, name: String, intendedPersonConfirmed: Bool) async -> Bool {
        guard intendedPersonConfirmed, let invitation = reviewing,
              candidates.contains(where: { $0.id == candidate.id }), candidate.expiresAt > Date(),
              !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.count <= 80 else { return false }
        let current = generation
        var approved = false
        await perform {
            let result = try await api!.approveInvitation(invitation, attempt: candidate.id, name: name)
            guard current == generation, result.status == "confirmed" else { return }
            approved = true; candidates = []; reviewing = nil
            invitations.removeAll { $0.id == invitation }
            if shared?.id == invitation { shared = nil; createKey = nil }
            message = "Contact approved. Refresh your circle before sending a TEST."
        }
        return approved
    }
}
