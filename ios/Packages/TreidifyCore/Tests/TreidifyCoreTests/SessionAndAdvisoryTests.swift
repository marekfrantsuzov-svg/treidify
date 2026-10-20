import XCTest
@testable import TreidifyCore

final class SessionAndAdvisoryTests: XCTestCase {
    private func date(_ iso: String) -> Date { ISO8601DateFormatter().date(from: iso)! }

    func testWeeklyAndDailyMarketHours() {
        let clock = SessionClock()
        // 2026-10-17 is a Saturday.
        XCTAssertFalse(clock.status(at: date("2026-10-17T12:00:00Z")).isOpen)
        // Sunday 2026-10-18 21:30Z = 17:30 New York (EDT): still closed.
        XCTAssertFalse(clock.status(at: date("2026-10-18T21:30:00Z")).isOpen)
        // Sunday 22:30Z = 18:30 New York: open.
        XCTAssertTrue(clock.status(at: date("2026-10-18T22:30:00Z")).isOpen)
        // Tuesday 21:30Z = 17:30 New York: daily break.
        if case .dailyBreak = clock.status(at: date("2026-10-20T21:30:00Z")) {} else { XCTFail("expected daily break") }
        // Friday 21:30Z = 17:30 New York: weekend close, reopening Sunday 18:00 New York (22:00Z).
        guard case .weekendClosed(let reopen) = clock.status(at: date("2026-10-23T21:30:00Z")) else { return XCTFail() }
        XCTAssertEqual(reopen, date("2026-10-25T22:00:00Z"))
    }

    func testSessionsFollowDaylightSaving() {
        let clock = SessionClock()
        // London opens 08:00 local: 07:00Z in BST (October 20), 08:00Z in GMT (November 3).
        XCTAssertTrue(clock.isSessionActive(.london, at: date("2026-10-20T07:30:00Z")))
        XCTAssertFalse(clock.isSessionActive(.london, at: date("2026-11-03T07:30:00Z")))
        XCTAssertEqual(clock.activeSessions(at: date("2026-10-20T13:00:00Z")), [.london, .newYork])
    }

    func testFreshnessPolicy() {
        let now = date("2026-10-20T12:00:00Z")
        let p = FreshnessPolicy.quotes
        XCTAssertEqual(p.classify(asOf: now.addingTimeInterval(-5), now: now), .live)
        XCTAssertEqual(p.classify(asOf: now.addingTimeInterval(-120), now: now), .delayed(by: 120))
        XCTAssertEqual(p.classify(asOf: now.addingTimeInterval(-3_600), now: now), .stale(since: now.addingTimeInterval(-3_600)))
        XCTAssertEqual(p.classify(asOf: now, now: now, marketOpen: false), .marketClosed(lastUpdate: now))
        XCTAssertFalse(DataFreshness.stale(since: now).isUsable)
    }

    private func inputs(now: Date, status: MarketStatus = .open(activeSessions: [.london]),
                        freshness: DataFreshness = .live, calendar: [EconomicEvent]? = [],
                        gold: [Timeframe: MarketBias] = [:], dxy: [Timeframe: MarketBias] = [:],
                        vol: VolatilityRegime = .normal) -> AdvisoryInputs {
        func results(_ m: [Timeframe: MarketBias]) -> [Timeframe: BiasResult] {
            m.mapValues { BiasResult(timeframe: .h1, bias: $0, evidence: nil, rationale: [], invalidationLevel: nil, invalidationDescription: nil, candleCount: 100, asOf: now) }
        }
        return AdvisoryInputs(now: now, marketStatus: status, marketDataFreshness: freshness, marketDataSource: .demoFixture,
                              marketDataAsOf: now, goldBias: results(gold), dxyBias: results(dxy), goldVolatility: vol, calendar: calendar)
    }

    func testAdvisoryPriorities() {
        let now = date("2026-10-20T10:00:00Z")
        let composer = MarketAdvisoryComposer()
        XCTAssertEqual(composer.compose(inputs(now: now, status: .weekendClosed(reopensAt: now.addingTimeInterval(3_600)))).kind, .marketClosed)
        XCTAssertEqual(composer.compose(inputs(now: now, freshness: .stale(since: now))).kind, .dataUnavailable)
        XCTAssertEqual(composer.compose(inputs(now: now, calendar: DemoIntelligence.calendar(now: now))).kind, .highImpactEvent)
        XCTAssertEqual(composer.compose(inputs(now: now, gold: [.h1: .bullish], dxy: [.h1: .bullish])).kind, .conflictingSignals)
        XCTAssertEqual(composer.compose(inputs(now: now, gold: [.h4: .bearish, .h1: .bullish])).kind, .conflictingSignals)
        XCTAssertEqual(composer.compose(inputs(now: now, gold: [.h1: .bullish], dxy: [.h1: .bearish], vol: .elevated)).kind, .elevatedVolatility)
        XCTAssertEqual(composer.compose(inputs(now: now)).kind, .calm)
        XCTAssertEqual(composer.compose(inputs(now: now, vol: .insufficientData)).kind, .mixed)
    }

    func testHighImpactAdvisoryNamesEventAndSource() {
        let now = date("2026-10-20T10:00:00Z")
        let a = MarketAdvisoryComposer().compose(inputs(now: now, calendar: DemoIntelligence.calendar(now: now)))
        XCTAssertTrue(a.message.contains("CPI"))
        XCTAssertTrue(a.isDemo)
        XCTAssertTrue(a.basis.allSatisfy { $0.contains("source:") })
    }

    func testAdvisoriesNeverUseBannedPhrases() {
        let now = date("2026-10-20T10:00:00Z")
        let composer = MarketAdvisoryComposer()
        let variants = [
            inputs(now: now, status: .weekendClosed(reopensAt: now)), inputs(now: now, freshness: .error(message: "x")),
            inputs(now: now, calendar: DemoIntelligence.calendar(now: now)), inputs(now: now, gold: [.h1: .bullish], dxy: [.h1: .bullish]),
            inputs(now: now, vol: .elevated), inputs(now: now), inputs(now: now, vol: .insufficientData)
        ]
        for v in variants {
            let a = composer.compose(v)
            let text = ([a.message] + a.basis).joined(separator: " ").lowercased()
            for phrase in MarketAdvisoryComposer.bannedPhrases { XCTAssertFalse(text.contains(phrase), "\(a.kind): \(phrase)") }
        }
    }

    func testGreeting() {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        XCTAssertEqual(Greeting.text(for: date("2026-10-20T07:00:00Z"), calendar: cal), "Good morning ☀️")
        XCTAssertEqual(Greeting.text(for: date("2026-10-20T13:00:00Z"), calendar: cal), "Good afternoon 🌤️")
        XCTAssertEqual(Greeting.text(for: date("2026-10-20T22:00:00Z"), calendar: cal), "Good evening 🌙")
    }

    func testEconomicSurpriseExplanationAvoidsFixedDirection() {
        let e = DemoIntelligence.calendar(now: Date()).first { $0.id == "demo-retail" }!
        XCTAssertEqual(e.surprise ?? 0, 0.2, accuracy: 1e-9)
        XCTAssertTrue(e.surpriseExplanation.contains("above"))
        XCTAssertTrue(e.surpriseExplanation.contains("revised"))
        XCTAssertFalse(e.surpriseExplanation.lowercased().contains("gold will"))
    }
}
