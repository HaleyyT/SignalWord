import Foundation
import XCTest
@testable import SignalWordCore

@MainActor final class AccountRestorationTests: XCTestCase {
    private func model(_ state: AccountFixture) -> AppShellModel {
        let defaults = UserDefaults(suiteName: "SignalWord.RestorationTests." + UUID().uuidString)!
        return AppShellModel(backendConfigured: true, trigger: { _, _ in .rejected }, lifecycle: .init(
            prepare: { _ in try await state.prepare() }, profile: { _ in "Reviewer" },
            recover: { _ in try await state.recover() },
            saveContact: { _, _ in throw SessionError.configuration }, getContact: { try await state.contact() },
            disableContact: { _ in false }, getAlertStatus: { _ in throw SessionError.configuration },
            authenticateResolution: { false }, resolve: { _ in throw SessionError.configuration },
            locationAuthorization: { .denied }, requestLocationAccess: { .denied }, deleteAccount: {},
            identityID: { await state.identity }, beginReauthentication: { await state.reauthenticate() }, signOut: { await state.signOut() },
            signInWithPassword: { _, _, _ in await state.signIn() }
        ), preferences: defaults)
    }

    func testReturningAccountGoesHomeWithConfirmedContactAfterPasswordLogin() async {
        let state = AccountFixture(); let app = model(state)
        await app.prepare()
        XCTAssertTrue(app.hasEnteredDashboard); XCTAssertTrue(app.identityReady)
        await app.signOut()
        XCTAssertFalse(app.identityReady); XCTAssertFalse(app.hasEnteredDashboard)
        app.invitedEmail = "fixture@example.test"
        await app.signInWithPassword(password: "fixture", captchaToken: "proof")
        XCTAssertTrue(app.hasEnteredDashboard); XCTAssertTrue(app.identityReady)
        XCTAssertEqual(app.contactStatus, "confirmed"); XCTAssertEqual(app.contactName, "Trusted person")
    }

    func testDeviceReadinessReturnsOnlyToItsOriginalAccount() async {
        let state = AccountFixture(); let app = model(state)
        await app.prepare(); app.setShortcutConfigured(true)
        await app.signOut(); await state.switchIdentity("20000000-0000-4000-8000-000000000002")
        app.invitedEmail = "other@example.test"
        await app.signInWithPassword(password: "fixture", captchaToken: "proof")
        XCTAssertFalse(app.shortcutConfigured, "Another account cannot inherit device readiness")
        await app.signOut(); await state.switchIdentity("20000000-0000-4000-8000-000000000001")
        app.invitedEmail = "fixture@example.test"
        await app.signInWithPassword(password: "fixture", captchaToken: "proof")
        XCTAssertTrue(app.shortcutConfigured, "Original account recovers its own readiness")
    }

    func testFailedContactReadCannotBeMistakenForMissingContact() async {
        let state = AccountFixture(); let app = model(state)
        await app.prepare(); await state.failContactRead(true); await app.prepare()
        XCTAssertFalse(app.identityReady); XCTAssertFalse(app.canEditContact)
        XCTAssertEqual(app.accountLoadState, .unavailable)
        XCTAssertEqual(app.contactStatus, "confirmed")
        XCTAssertTrue(app.hasContactDraft)
        await state.failContactRead(false); await app.prepare()
        XCTAssertTrue(app.identityReady); XCTAssertTrue(app.canEditContact)
        XCTAssertNil(app.accountMessage)
    }

    func testFirstFailedReadDoesNotOfferReplacementOrEnterDashboard() async {
        let state = AccountFixture(); await state.failContactRead(true); let app = model(state)
        await app.prepare()
        XCTAssertFalse(app.identityReady); XCTAssertFalse(app.hasEnteredDashboard)
        XCTAssertFalse(app.canEditContact); XCTAssertEqual(app.accountLoadState, .unavailable)
    }

    func testExpiryDuringAlertRecoveryOffersSignInWithoutDiscardingContact() async {
        let state = AccountFixture(); let app = model(state)
        await app.prepare(); await state.expireRecovery(); await app.recover()
        XCTAssertTrue(app.requiresSessionRecovery); XCTAssertFalse(app.identityReady)
        XCTAssertEqual(app.contactStatus, "confirmed")
        XCTAssertTrue(app.hasEnteredDashboard)
    }

    func testExpiredSessionPreservesContactUntilExplicitSameAccountRecovery() async {
        let state = AccountFixture(); let app = model(state)
        await app.prepare(); await state.expire(); await app.prepare()
        XCTAssertTrue(app.requiresSessionRecovery); XCTAssertFalse(app.identityReady)
        XCTAssertEqual(app.contactStatus, "confirmed"); XCTAssertTrue(app.hasEnteredDashboard)
        await app.signInAgain()
        XCTAssertTrue(app.needsIdentityVerification); XCTAssertEqual(app.contactStatus, "confirmed")
        app.invitedEmail = "fixture@example.test"
        await app.signInWithPassword(password: "fixture", captchaToken: "proof")
        XCTAssertTrue(app.identityReady); XCTAssertTrue(app.hasEnteredDashboard)
        XCTAssertFalse(app.needsIdentityVerification)
    }
}

private actor AccountFixture {
    var signedOut = false; var expired = false; var failedRead = false; var recoveryExpired = false
    var identity = "20000000-0000-4000-8000-000000000001"
    func switchIdentity(_ value: String) { identity = value }
    func expireRecovery() { recoveryExpired = true }
    func recover() throws -> AppRecovery {
        if recoveryExpired { throw SessionError.sessionExpired }
        return .init(alerts: [], needsConfirmation: false, pending: false, pendingKind: nil)
    }
    func signOut() { signedOut = true }
    func signIn() { signedOut = false; expired = false }
    func expire() { expired = true }
    func reauthenticate() { signedOut = true; expired = false }
    func failContactRead(_ value: Bool) { failedRead = value }
    func prepare() throws {
        if signedOut { throw SessionError.verificationRequired }
        if expired { throw SessionError.sessionExpired }
    }
    func contact() throws -> TrustedContactProjection? {
        if failedRead { throw UserAPIError.unavailable }
        return .init(contactID: UUID(uuidString: "10000000-0000-4000-8000-000000000001")!, name: "Trusted person", status: "confirmed", confirmationExpiresAt: nil)
    }
}
