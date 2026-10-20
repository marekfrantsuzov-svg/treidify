import XCTest
@testable import TreidifyCore

final class CoachTests: XCTestCase {
    func testDemoHistoryRevealsSizingAfterLosses() {
        let history = DemoAccountFactory.history(now: Date(timeIntervalSince1970: 1_790_000_000))
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let obs = CoachAnalyzer(calendar: cal).observations(for: history.trades)
        XCTAssertTrue(obs.contains { $0.kind == .riskAfterLosses })
        XCTAssertTrue(obs.allSatisfy { $0.sampleSize > 0 && !$0.evidence.isEmpty })
    }

    func testSmallSamplesProduceNoBehaviouralClaims() {
        let history = DemoAccountFactory.history(now: Date(), tradeCount: 10)
        XCTAssertTrue(CoachAnalyzer().observations(for: history.trades).isEmpty)
    }

    func testRulebookViolationsAreReportedEvenForSmallSamples() {
        let history = DemoAccountFactory.history(now: Date(), tradeCount: 10)
        let obs = CoachAnalyzer().observations(for: history.trades, rulebook: TradingRulebook(allowedSymbols: ["XAUUSD"]))
        XCTAssertEqual(obs.first?.kind, .ruleViolation)
    }

    func testObservationsNeverClaimEmotions() {
        let history = DemoAccountFactory.history(now: Date(timeIntervalSince1970: 1_790_000_000))
        let text = CoachAnalyzer().observations(for: history.trades)
            .flatMap { [$0.title, $0.finding, $0.suggestion] + $0.evidence }.joined(separator: " ").lowercased()
        for word in ["revenge", "emotional", "angry", "fear", "greed", "tilt"] {
            XCTAssertFalse(text.contains(word), word)
        }
    }
}
