import Foundation
import XCTest
@testable import SignalWordCore

final class ContactNetworkTests: XCTestCase {
    func testSharedBackendFixturesDecodeForTheSender() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601
        let network = try decoder.decode(ContactNetwork.self, from: Data(contentsOf: root.appending(path: "contracts/v2/contact-network.response.json")))
        XCTAssertEqual(network.contacts.count, 2)
        XCTAssertEqual(network.policy, .primaryThenOthers)
        let recipients = try decoder.decode([RecipientProgress].self, from: Data(contentsOf: root.appending(path: "contracts/v2/recipients.response.json")))
        XCTAssertNotNil(recipients[0].acknowledgedAt)
        XCTAssertNil(recipients[1].acknowledgedAt)
    }

    func testPoliciesRoundTripWithoutLosingTheirMeaning() throws {
        for policy in ContactRoutingPolicy.allCases {
            XCTAssertEqual(try JSONDecoder().decode(ContactRoutingPolicy.self, from: JSONEncoder().encode(policy)), policy)
        }
        XCTAssertThrowsError(try JSONDecoder().decode(ContactRoutingPolicy.self, from: Data("\"police\"".utf8)))
    }

    func testRecipientProgressKeepsDeliveryDistinctFromAcknowledgement() throws {
        let json = #"{"contactId":"82000000-0000-4000-8000-000000000001","name":"Sam","revoked":false,"scheduledAt":"2026-09-28T00:02:00Z","delivery":"queued","acknowledgedAt":"2026-09-28T00:01:00Z"}"#
        let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601
        let progress = try decoder.decode(RecipientProgress.self, from: Data(json.utf8))
        XCTAssertNotNil(progress.acknowledgedAt)
        XCTAssertEqual(progress.summary(at: Date(timeIntervalSince1970: 0)), "Scheduled for escalation")
    }

    func testWithdrawalTakesPrecedenceOverPreviousDelivery() throws {
        let json = #"{"contactId":"82000000-0000-4000-8000-000000000001","name":"Sam","revoked":true,"scheduledAt":"2026-09-28T00:02:00Z","delivery":"delivered"}"#
        let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601
        let progress = try decoder.decode(RecipientProgress.self, from: Data(json.utf8))
        XCTAssertEqual(progress.summary(at: Date()), "Consent withdrawn — access revoked")
    }
}

@MainActor
final class ContactEnrollmentTests: XCTestCase {
    func testUncertainCreationRetriesSameKeyAndClearStartsNewIdentity() async {
        let api = EnrollmentFixture()
        api.failFirst = true
        let model = ContactEnrollmentModel(api: api)
        await model.create()
        XCTAssertNotNil(model.message)
        await model.create()
        XCTAssertEqual(api.keys.count, 2)
        XCTAssertEqual(api.keys[0], api.keys[1])
        XCTAssertNotNil(model.shared?.safeShareURL)
        model.clear()
        XCTAssertNil(model.shared)
        XCTAssertTrue(model.invitations.isEmpty)
        await model.create()
        XCTAssertNotEqual(api.keys[1], api.keys[2])
    }

    func testVerifiedMailboxRequiresExplicitIntendedPersonConfirmationAndReview() async {
        let api = EnrollmentFixture(), model = ContactEnrollmentModel(api: nil)
        await model.create()
        XCTAssertNotNil(model.message)
        let connected = ContactEnrollmentModel(api: api)
        await connected.create()
        await connected.review(api.invitationID)
        let candidate = connected.candidates[0]
        let rejected = await connected.approve(candidate, name: "Sam", intendedPersonConfirmed: false)
        XCTAssertFalse(rejected)
        XCTAssertEqual(api.approvals, 0)
        let approved = await connected.approve(candidate, name: "Sam", intendedPersonConfirmed: true)
        XCTAssertTrue(approved)
        XCTAssertEqual(api.approvals, 1)
        XCTAssertNil(connected.shared)
        XCTAssertTrue(connected.candidates.isEmpty)
        let stale = await connected.approve(candidate, name: "Sam", intendedPersonConfirmed: true)
        XCTAssertFalse(stale)
        await connected.refresh()
        XCTAssertEqual(api.approvals, 1, "Read-only refresh never approves")
    }

    func testRecoveredOpenInvitationMustBeClosedBeforeCreatingAnotherLink() async {
        let api = EnrollmentFixture()
        api.recoveredOpen = true
        let model = ContactEnrollmentModel(api: api)
        await model.create()
        XCTAssertTrue(api.keys.isEmpty, "A lost local share URL must not create another invitation")
        XCTAssertNotNil(model.message)
        XCTAssertNil(model.shared)
        await model.revoke(api.invitationID)
        await model.create()
        XCTAssertEqual(api.keys.count, 1)
    }

    func testUnsafeOrExpiredURLsAreNeverShared() {
        for url in ["http://www.signalword.app/join/", "https://evil.example/join/", "https://www.signalword.app/join/a?email=private"] {
            let invitation = ContactInvitation(invitationId: UUID(), displayName: "Sender", status: "open", expiresAt: .distantFuture, shareURL: URL(string: url))
            XCTAssertNil(invitation.safeShareURL)
        }
    }

    func testLateCreationCannotPopulateSignedOutState() async {
        let api = EnrollmentFixture()
        api.pause = true
        let model = ContactEnrollmentModel(api: api)
        let task = Task { await model.create() }
        while api.pending == nil { await Task.yield() }
        model.clear()
        api.pending?.resume(); api.pending = nil
        await task.value
        XCTAssertNil(model.shared)
        XCTAssertTrue(model.invitations.isEmpty)
    }
}

@MainActor private final class EnrollmentFixture: ContactEnrollmentServing {
    let invitationID = UUID()
    var failFirst = false
    var pause = false
    var pending: CheckedContinuation<Void, Never>?
    var keys: [UUID] = []
    var approvals = 0
    var recoveredOpen = false
    func createInvitation(key: UUID) async throws -> ContactInvitation {
        keys.append(key)
        if pause { await withCheckedContinuation { pending = $0 } }
        if failFirst && keys.count == 1 { throw URLError(.timedOut) }
        return .init(invitationId: invitationID, displayName: "Sender", status: "open", expiresAt: .distantFuture,
            shareURL: URL(string: "https://www.signalword.app/join/" + String(repeating: "a", count: 43)))
    }
    func listInvitations() async throws -> [ContactInvitation] {
        recoveredOpen ? [.init(invitationId: invitationID, displayName: "Sender", status: "open", expiresAt: .distantFuture, shareURL: nil)] : []
    }
    func revokeInvitation(_ id: UUID) async throws { recoveredOpen = false }
    func reviewInvitation(_ id: UUID) async throws -> [ContactCandidate] {
        [.init(attemptId: UUID(), emailHint: "s***@example.test", verifiedAt: Date(), expiresAt: .distantFuture)]
    }
    func approveInvitation(_ id: UUID, attempt: UUID, name: String) async throws -> ContactApproval {
        approvals += 1
        return .init(contactId: UUID(), status: "confirmed")
    }
}
