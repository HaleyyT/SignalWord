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

    private func reveal(_ element: XCUIElement, scrollingUp: Bool = true, useMargin: Bool = false, file: StaticString = #filePath, line: UInt = #line) {
        for _ in 0..<8 {
            if element.exists && element.isHittable { return }
            // Drag the scroll margin: a centre-screen swipe can land on the
            // safety hold control, which intentionally consumes that gesture.
            if useMargin {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: scrollingUp ? 0.75 : 0.25))
                    .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: scrollingUp ? 0.25 : 0.75)))
            } else if scrollingUp { app.swipeUp() } else { app.swipeDown() }
        }
        if !element.exists || !element.isHittable {
            let screenshot = XCTAttachment(screenshot: app.screenshot())
            screenshot.lifetime = .keepAlways
            add(screenshot)
            print(app.debugDescription)
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
        reveal(name); name.tap(); name.typeText("Alex")
        let contact = app.textFields["Trusted person"]
        reveal(contact); contact.tap(); contact.typeText("Sam")
        let email = app.textFields["name@example.com"]
        reveal(email); email.tap(); email.typeText("sam@example.test\n")
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

    func testContactNetworkInvitationRoutingAndRelaunch() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--network-ui-testing", "--reset-ui-state"]
        app.launch()
        completeContactSetup()
        app.tabBars.buttons["People"].tap()
        tap("Invite another person")
        let name = app.textFields["Contact name"]
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        name.tap(); name.typeText("Taylor")
        let email = app.textFields["Email"]
        email.tap(); email.typeText("taylor@example.test\n")
        tap("Send invitation")
        tap("Primary now, others after 2 minutes")
        app.terminate()
        app.launchArguments = ["--ui-testing", "--network-ui-testing"]
        app.launch()
        app.tabBars.buttons["People"].tap()
        let invited = app.staticTexts["Taylor"]
        reveal(invited)
        XCTAssertTrue(invited.exists, "Server contact snapshot should recover on relaunch")
        let routing = app.buttons["Primary now, others after 2 minutes"]
        reveal(routing)
        XCTAssertTrue(routing.isSelected, "Confirmed policy survives relaunch")
        tap("Withdraw Taylor")
        tap("Withdraw consent")
        XCTAssertTrue(app.staticTexts["Disabled"].firstMatch.waitForExistence(timeout: 5))
    }

    func testEscalatedTimerRequiresExplicitIncidentResolution() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--timer-ui-testing", "--timer-escalated", "--reset-ui-state"]
        app.launch()
        completeContactSetup()
        let warning = app.staticTexts["An alert already exists"]
        reveal(warning, useMargin: true)
        XCTAssertTrue(warning.exists)
        XCTAssertFalse(app.buttons["Check in now"].exists)
        let resolve = app.buttons["alert.resolve"]
        // Return to the persistent incident card above the timer panel.
        reveal(resolve, scrollingUp: false, useMargin: true)
        resolve.press(forDuration: 1.8)
        XCTAssertTrue(app.buttons["alert.trigger"].waitForExistence(timeout: 5))
    }

    func testConfirmedCheckInTimerRelaunchAndCompletion() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--timer-ui-testing", "--reset-ui-state"]
        app.launch()
        completeContactSetup()
        tap("Start 15-minute check-in")
        XCTAssertTrue(app.staticTexts["timer.active"].waitForExistence(timeout: 5))
        tap("Extend by 30 minutes")
        app.terminate()
        app.launchArguments = ["--ui-testing", "--timer-ui-testing"]
        app.launch()
        tap("Check in now")
        XCTAssertTrue(app.staticTexts["Checked in — confirmed by server"].waitForExistence(timeout: 5))
        tap("Start 60-minute check-in")
        tap("Cancel check-in timer")
        XCTAssertTrue(app.staticTexts["Cancelled — confirmed by server"].waitForExistence(timeout: 5))
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
    func testLargestTextKeepsSetupAndAccessibleAlertConfirmationUsable() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state", "--ui-testing-largest-text"]
        app.launch()
        completeContactSetup()
        let review = app.buttons["alert.trigger.review"]
        reveal(review, useMargin: true)
        XCTAssertFalse(review.label.isEmpty, "The alternative trigger needs an accessible name")
        review.tap()
        XCTAssertTrue(app.buttons["Send REAL alert"].waitForExistence(timeout: 5))
        app.buttons["Cancel"].tap()
        XCTAssertFalse(app.buttons["alert.resolve"].exists, "Review/cancel must not send")
    }

}
