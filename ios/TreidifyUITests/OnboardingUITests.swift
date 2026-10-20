import XCTest

final class OnboardingUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    /// Walks onboarding (disclosure acceptance is required) and visits every tab.
    func testOnboardingThenAllTabs() {
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launch()

        app.buttons["Get started"].tap()
        app.buttons["Continue"].tap()
        let continueButton = app.buttons["Continue"]
        XCTAssertFalse(continueButton.isEnabled, "disclosure must be acknowledged first")
        app.switches.firstMatch.tap()
        XCTAssertTrue(continueButton.isEnabled)
        continueButton.tap()
        app.buttons["Start exploring"].tap()

        for tab in ["Markets", "News", "Journal", "More", "Home"] {
            app.tabBars.buttons[tab].tap()
            XCTAssertTrue(app.tabBars.buttons[tab].isSelected, tab)
        }
        XCTAssertTrue(app.staticTexts["Market Bias"].waitForExistence(timeout: 10))
    }
}
