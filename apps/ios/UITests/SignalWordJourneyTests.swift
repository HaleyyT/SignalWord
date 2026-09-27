import XCTest

@MainActor
final class SignalWordJourneyTests: XCTestCase {
    private var app: XCUIApplication!

    private func launchFresh() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state"]
        app.launch()
    }

    private func reveal(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        for _ in 0..<8 {
            if element.exists && element.isHittable { return }
            app.swipeUp()
        }
        XCTAssertTrue(element.exists && element.isHittable, "Expected visible control: \(element)", file: file, line: line)
    }

    private func tap(_ title: String) {
        let button = app.buttons[title].firstMatch
        reveal(button)
        button.tap()
    }

    private func completeContactSetup(waitForRecovery: Bool = false) {
        tap("Set up SignalWord")
        let name = app.textFields["Name they’ll recognise"]
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        name.tap(); name.typeText("Alex")
        let contact = app.textFields["Trusted person"]
        contact.tap(); contact.typeText("Sam")
        let email = app.textFields["name@example.com"]
        email.tap(); email.typeText("sam@example.test\n")
        if waitForRecovery {
            // The app reconciles every ten seconds. A slow typist must not lose a draft.
            Thread.sleep(forTimeInterval: 11)
            XCTAssertEqual(contact.value as? String, "Sam")
            XCTAssertEqual(email.value as? String, "sam@example.test")
        }
        tap("Send confirmation")
        XCTAssertTrue(app.buttons["Continue to home"].waitForExistence(timeout: 5))
        tap("Continue to home")
    }

    func testManualFallbackRecoveryResolutionAndDeletion() {
        launchFresh()
        completeContactSetup()
        // No shortcut, rehearsals, or location permission: manual fallback must work.
        let trigger = app.buttons["alert.trigger"]
        XCTAssertTrue(trigger.waitForExistence(timeout: 5))
        reveal(trigger)
        trigger.press(forDuration: 0.6)
        XCTAssertFalse(app.buttons["alert.resolve"].exists, "An early release must not create a REAL alert")
        trigger.press(forDuration: 1.8)
        XCTAssertTrue(app.buttons["alert.resolve"].waitForExistence(timeout: 5))

        app.terminate()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        let resolve = app.buttons["alert.resolve"]
        XCTAssertTrue(resolve.waitForExistence(timeout: 10), "Server alert must be reconciled on relaunch")
        reveal(resolve)
        resolve.press(forDuration: 1.8)
        XCTAssertTrue(app.buttons["alert.trigger"].waitForExistence(timeout: 5))

        app.tabBars.buttons["Settings"].tap()
        tap("account.delete")
        let confirmation = app.buttons["account.confirmDeletion"].firstMatch
        XCTAssertTrue(confirmation.waitForExistence(timeout: 5))
        confirmation.tap()
        XCTAssertTrue(app.buttons["Set up SignalWord"].waitForExistence(timeout: 5))
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Set up SignalWord"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["alert.resolve"].exists)
    }

    func testRecoveryDoesNotEraseContactDraft() {
        launchFresh()
        completeContactSetup(waitForRecovery: true)
        XCTAssertTrue(app.buttons["alert.trigger"].waitForExistence(timeout: 5))
    }

    func testWithdrawalDisablesManualFallback() {
        launchFresh()
        completeContactSetup()
        XCTAssertTrue(app.buttons["alert.trigger"].waitForExistence(timeout: 5))
        app.tabBars.buttons["People"].tap()
        tap("Withdraw this contact")
        tap("Withdraw consent")
        XCTAssertTrue(app.staticTexts["No trusted person yet"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Home"].tap()
        XCTAssertFalse(app.buttons["alert.trigger"].exists)
    }

    func testHoldActionOffersAnExplicitConfirmationAlternative() {
        launchFresh()
        completeContactSetup()
        let trigger = app.buttons["alert.trigger"]
        XCTAssertTrue(trigger.waitForExistence(timeout: 5))
        app.buttons["alert.trigger.review"].tap()
        XCTAssertTrue(app.buttons["Send REAL alert"].waitForExistence(timeout: 5))
        app.buttons["Cancel"].tap()
        XCTAssertTrue(trigger.exists)
        app.buttons["alert.trigger.review"].tap()
        app.buttons["Send REAL alert"].tap()
        XCTAssertTrue(app.buttons["alert.resolve"].waitForExistence(timeout: 5))
    }
}
