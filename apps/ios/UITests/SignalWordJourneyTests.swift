import XCTest

@MainActor
final class SignalWordJourneyTests: XCTestCase {
    private var app: XCUIApplication!

    func testExistingPasswordSignInKeepsEmailCodeOption() {
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state", "--ui-invited-login"]
        app.launch()
        let email = app.textFields["onboarding.invitedEmail"]
        XCTAssertTrue(email.waitForExistence(timeout: 5))
        tap("Use an existing password")
        let password = app.secureTextFields["onboarding.password"]
        XCTAssertTrue(password.exists)
        XCTAssertFalse(app.buttons["onboarding.verifyIdentity"].isEnabled)
        email.tap(); email.typeText("review@example.test")
        password.tap(); password.typeText("fixture-password")
        XCTAssertTrue(app.buttons["onboarding.verifyIdentity"].isEnabled)
        app.swipeDown()
        tap("Use an email code")
        XCTAssertFalse(password.exists)
        XCTAssertTrue(app.buttons["Verify and request code"].exists)
        tap("Use an existing password")
        XCTAssertFalse(app.buttons["onboarding.verifyIdentity"].isEnabled, "Switching modes must clear the password")
    }

    func testPreparationWarningClearsAfterSuccessfulRetryWithoutRelaunch() {
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state", "--ui-layout-ready", "--ui-contact-read-fails-once"]
        app.launch()
        let warning = app.staticTexts["Your account data could not be loaded. Check the connection and retry. Your saved contact has not been replaced."]
        XCTAssertTrue(warning.waitForExistence(timeout: 5))
        XCTAssertTrue(warning.waitForNonExistence(timeout: 25))
        XCTAssertTrue(app.buttons["Send TEST alert"].exists)
    }

    func testPreparationWarningRemainsWhileContactReadStillFails() {
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state", "--ui-layout-ready", "--ui-contact-read-failure"]
        app.launch()
        let warning = app.staticTexts["Your account data could not be loaded. Check the connection and retry. Your saved contact has not been replaced."]
        XCTAssertTrue(warning.waitForExistence(timeout: 5))
        XCTAssertFalse(warning.waitForNonExistence(timeout: 15))
    }

    func testCancelledPreparationDoesNotShowSessionFailure() {
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state", "--ui-layout-ready", "--ui-contact-read-cancelled"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Finish your setup"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Your account data could not be loaded. Check the connection and retry. Your saved contact has not been replaced."].exists)
    }

    func testSignOutKeepsAccountAndReturnsToSignIn() {
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state", "--ui-layout-ready"]
        app.launch()
        XCTAssertTrue(app.buttons["navigation.Settings"].waitForExistence(timeout: 5))
        app.buttons["navigation.Settings"].tap()
        tap("account.signOut")
        tap("account.confirmSignOut")
        XCTAssertTrue(app.textFields["onboarding.invitedEmail"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Signed out on this iPhone. Your account and server data have not been deleted."].exists)
        app.terminate()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.textFields["onboarding.invitedEmail"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["navigation.Home"].exists)
    }

    func testUnsafeSignOutLeavesAccountUsable() {
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state", "--ui-layout-ready", "--ui-signout-blocked"]
        app.launch()
        XCTAssertTrue(app.buttons["navigation.Settings"].waitForExistence(timeout: 5))
        app.buttons["navigation.Settings"].tap()
        tap("account.signOut")
        tap("account.confirmSignOut")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Could not sign out safely.")).firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["navigation.Home"].exists)
    }

    private func launchFresh() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-ui-state"]
        app.launch()
    }

    private func reveal(_ element: XCUIElement, scrollingUp: Bool = true, useMargin: Bool = false, file: StaticString = #filePath, line: UInt = #line) {
        // The keyboard's prediction strip is also a ScrollView. Target setup
        // explicitly so typing cannot change which container the test pans.
        let setupScroll = app.scrollViews["onboarding.scroll"]
        let isSetup = setupScroll.exists
        let scroll = isSetup ? setupScroll : app.scrollViews.firstMatch
        let largestText = app.launchArguments.contains("--ui-testing-largest-text")
        for _ in 0..<(largestText ? 60 : 18) {
            // Keep the existing navigation for standard-size journeys. Only
            // AX5 needs measured pans to reach its tall labels and fields.
            if !largestText {
                if element.exists && element.isHittable { return }
                if useMargin {
                    scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: scrollingUp ? 0.8 : 0.2))
                        .press(forDuration: 0.05, thenDragTo: scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: scrollingUp ? 0.2 : 0.8)))
                } else if scrollingUp { app.swipeUp() } else { app.swipeDown() }
                continue
            }
            var top = scroll.frame.minY + 4
            var bottom = scroll.frame.maxY - 4
            if app.navigationBars.firstMatch.exists { top = max(top, app.navigationBars.firstMatch.frame.maxY + 4) }
            if app.buttons["navigation.Home"].exists { bottom = min(bottom, app.buttons["navigation.Home"].frame.minY - 4) }
            if app.keyboards.firstMatch.exists { bottom = min(bottom, app.keyboards.firstMatch.frame.minY - 4) }
            let hasFrame = element.exists && !element.frame.isEmpty
            if hasFrame && element.isHittable && element.frame.minY >= top && element.frame.maxY <= bottom { return }
            // Pan inside the visible scroll area, above the keyboard. At AX5 a
            // screen-wide swipe can hit the keyboard or overshoot a text field.
            // SwiftUI can expose an offscreen field with a zero frame. That is
            // unknown geometry, not evidence that the field is above the form.
            let upward = hasFrame ? element.frame.maxY > bottom : scrollingUp
            let height = bottom - top
            let overflow = !hasFrame ? height / 2 : upward ? element.frame.maxY - bottom : top - element.frame.minY
            let distance = min(height / 2, max(30, overflow + 8))
            let start = app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(
                // A drag inside a focused text field moves its selection rather
                // than the form. The setup margin belongs to the scroll view.
                dx: scroll.frame.minX + scroll.frame.width * ((useMargin || isSetup) ? 0.02 : 0.5),
                dy: upward ? bottom - height * 0.2 : top + height * 0.2))
            start.press(forDuration: 0.02,
                        thenDragTo: start.withOffset(CGVector(dx: 0, dy: upward ? -distance : distance)),
                        withVelocity: .slow, thenHoldForDuration: 0.15)
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

    func testSupporterAppearanceDoesNotGateSafety() {
        launchFresh()
        completeContactSetup()
        app.buttons["navigation.Settings"].tap()
        tap("supporter.open")
        XCTAssertTrue(app.buttons["supporter.buy"].waitForExistence(timeout: 5))
        tap("supporter.buy")
        XCTAssertTrue(app.staticTexts["SignalWord supporter"].waitForExistence(timeout: 5))
        tap("supporter.appearance.ocean")
        tap("supporter.restore")
        XCTAssertTrue(app.staticTexts["Your supporter purchase is restored."].waitForExistence(timeout: 5))
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Shipaton supporter screen — simulator fixture"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.buttons["supporter.open"].waitForExistence(timeout: 5))
        app.buttons["navigation.Home"].tap()
        XCTAssertTrue(app.buttons["alert.trigger"].waitForExistence(timeout: 5))
    }

    func testSupporterPurchaseAndSelectedAppearanceSurviveColdLaunch() {
        launchFresh(); completeContactSetup()
        app.buttons["navigation.Settings"].tap(); tap("supporter.open")
        tap("supporter.buy")
        // A single non-consumable unlocks both accents; switching must replace the
        // previous preference and survive a real process restart and restore.
        for choice in ["ocean", "lavender"] {
            tap("supporter.appearance." + choice)
            XCTAssertTrue(app.buttons["supporter.appearance." + choice].isSelected)
            app.terminate(); app.launchArguments = ["--ui-testing"]; app.launch()
            XCTAssertTrue(app.buttons["navigation.Home"].waitForExistence(timeout: 10))
            XCTAssertTrue(app.otherElements.matching(NSPredicate(format: "value == %@", "Appearance: " + choice)).firstMatch.waitForExistence(timeout: 10), "Saved accent refreshes before opening Settings")
            let homeAccent = XCTAttachment(screenshot: app.screenshot())
            homeAccent.name = choice.capitalized + " Home accent after cold launch — simulator fixture"
            homeAccent.lifetime = .keepAlways
            add(homeAccent)
            app.buttons["navigation.Settings"].tap(); tap("supporter.open")
            XCTAssertTrue(app.buttons["supporter.appearance." + choice].waitForExistence(timeout: 5))
            XCTAssertTrue(app.buttons["supporter.appearance." + choice].isSelected)
            XCTAssertFalse(app.buttons["supporter.buy"].exists)
            tap("supporter.restore")
            XCTAssertTrue(app.staticTexts["Your supporter purchase is restored."].waitForExistence(timeout: 5))
            XCTAssertTrue(app.buttons["supporter.appearance." + choice].isSelected)
        }
    }

    func testContactNetworkInvitationRoutingAndRelaunch() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--network-ui-testing", "--reset-ui-state"]
        app.launch()
        completeContactSetup()
        app.buttons["navigation.People"].tap()
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
        app.buttons["navigation.People"].tap()
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
        tap("Safety check-in")
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

        app.buttons["navigation.Settings"].tap()
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
        app.buttons["navigation.People"].tap()
        tap("Withdraw this contact")
        tap("Withdraw consent")
        XCTAssertTrue(app.staticTexts["No trusted person yet"].waitForExistence(timeout: 5))
        app.buttons["navigation.Home"].tap()
        XCTAssertFalse(app.buttons["alert.trigger"].exists)
    }

    func testHoldActionOffersAnExplicitConfirmationAlternative() {
        launchFresh()
        completeContactSetup()
        let trigger = app.buttons["alert.trigger"]
        XCTAssertTrue(trigger.waitForExistence(timeout: 5))
        reveal(app.buttons["alert.trigger.review"], useMargin: true)
        app.buttons["alert.trigger.review"].tap()
        XCTAssertTrue(app.buttons["Send REAL alert"].waitForExistence(timeout: 5))
        app.buttons["Cancel"].tap()
        XCTAssertTrue(trigger.exists)
        reveal(app.buttons["alert.trigger.review"], useMargin: true)
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
