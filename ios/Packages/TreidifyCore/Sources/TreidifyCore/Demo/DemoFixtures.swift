import Foundation

// DEMO FIXTURES
// Everything in this file is generated sample data. It is tagged with
// `DataSource.demoFixture`, and the UI must render a visible "Demo" label for any
// value whose source `isDemo`. None of it represents real prices, news,
// releases or accounts.

/// SplitMix64: small, fast, deterministic PRNG so fixtures are reproducible.
public struct SeededGenerator: RandomNumberGenerator, Sendable {
    private var state: UInt64

    public init(seed: UInt64) { state = seed }

    public mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// Uniform in [0, 1).
    public mutating func unit() -> Double { Double(next() >> 11) / Double(1 << 53) }

    /// Standard normal via Box–Muller.
    public mutating func gaussian() -> Double {
        let u1 = max(unit(), .leastNonzeroMagnitude)
        let u2 = unit()
        return (-2 * log(u1)).squareRoot() * cos(2 * .pi * u2)
    }
}

public enum DemoCandleFactory {
    struct Profile {
        let seed: UInt64
        let basePrice: Double
        let volatility: Double // per 5-minute bar, fractional
    }

    static func profile(for instrument: Instrument) -> Profile {
        switch instrument.symbol {
        case Instrument.xauusd.symbol: Profile(seed: 0x7A5C_0001, basePrice: 2_400, volatility: 0.00085)
        case Instrument.dxy.symbol: Profile(seed: 0x7A5C_0002, basePrice: 104, volatility: 0.00022)
        default: Profile(seed: UInt64(truncatingIfNeeded: instrument.symbol.hashValue), basePrice: 100, volatility: 0.0005)
        }
    }

    /// 5-minute candles for `days` days ending at the last market-open bar at or
    /// before `end`, skipping closed hours so higher timeframes aggregate cleanly.
    public static func fiveMinuteCandles(for instrument: Instrument, endingAt end: Date, days: Int = 40,
                                         clock: SessionClock = SessionClock()) -> [Candle] {
        let p = profile(for: instrument)
        var rng = SeededGenerator(seed: p.seed)
        let lastOpen = clock.lastOpenMoment(atOrBefore: end)
        let alignedEnd = (lastOpen.timeIntervalSince1970 / 300).rounded(.down) * 300
        let start = alignedEnd - Double(days) * 86_400

        var candles: [Candle] = []
        candles.reserveCapacity(days * 288)
        var price = p.basePrice
        var drift = 0.0
        var t = start
        var bar = 0
        while t <= alignedEnd {
            let date = Date(timeIntervalSince1970: t)
            t += 300
            guard clock.status(at: date).isOpen else { continue }
            if bar % 240 == 0 { drift = rng.gaussian() * p.volatility * 0.18 }
            bar += 1
            let open = price
            let ret = drift + rng.gaussian() * p.volatility
            let close = max(open * (1 + ret), 0.01)
            let wickUp = abs(rng.gaussian()) * p.volatility * open * 0.6
            let wickDown = abs(rng.gaussian()) * p.volatility * open * 0.6
            let high = max(open, close) + wickUp
            let low = min(open, close) - wickDown
            candles.append(Candle(time: date, open: open, high: high, low: low, close: close,
                                  volume: (200 + rng.unit() * 800).rounded()))
            price = close
        }
        return candles
    }
}

/// Memoises the generated 5-minute series per instrument for the current
/// 5-minute bucket, so a dashboard refresh generates each series once.
actor DemoSeriesCache {
    static let shared = DemoSeriesCache()
    private var store: [String: (bucket: Double, candles: [Candle])] = [:]

    func fiveMinute(for instrument: Instrument, endingAt end: Date, clock: SessionClock) -> [Candle] {
        let bucket = (end.timeIntervalSince1970 / 300).rounded(.down)
        if let hit = store[instrument.symbol], hit.bucket == bucket { return hit.candles }
        let candles = DemoCandleFactory.fiveMinuteCandles(for: instrument, endingAt: end, clock: clock)
        store[instrument.symbol] = (bucket, candles)
        return candles
    }
}

/// Generated market data for demo mode and SwiftUI previews.
public struct DemoMarketDataRepository: MarketDataRepository {
    private let now: @Sendable () -> Date
    private let clock = SessionClock()

    public init(now: @escaping @Sendable () -> Date = { Date() }) {
        self.now = now
    }

    public func candles(for instrument: Instrument, timeframe: Timeframe, count: Int) async throws -> Sourced<[Candle]> {
        let base = await DemoSeriesCache.shared.fiveMinute(for: instrument, endingAt: now(), clock: clock)
        let series = timeframe == .m5 ? base : CandleAggregator.aggregate(base, into: timeframe)
        let result = Array(series.suffix(count))
        let asOf = result.last.map { $0.time.addingTimeInterval(min(timeframe.seconds, 300)) } ?? now()
        return Sourced(value: result, source: .demoFixture, asOf: min(asOf, now()))
    }

    public func quote(for instrument: Instrument) async throws -> Sourced<Quote> {
        let current = now()
        let base = await DemoSeriesCache.shared.fiveMinute(for: instrument, endingAt: current, clock: clock)
        guard let last = base.last else { throw DataProviderError.invalidResponse("empty demo series") }
        let daily = CandleAggregator.aggregate(base, into: .d1)
        let reference = daily.count >= 2 ? daily[daily.count - 2].close : last.open
        let open = clock.status(at: current).isOpen
        let asOf = open ? current : last.time.addingTimeInterval(300)
        return Sourced(value: Quote(instrument: instrument, price: last.close, referencePrice: reference, time: asOf),
                       source: .demoFixture, asOf: asOf)
    }
}

/// Generated educational stories and calendar entries for demo mode.
public struct DemoIntelligenceRepository: IntelligenceRepository {
    private let now: @Sendable () -> Date

    public init(now: @escaping @Sendable () -> Date = { Date() }) {
        self.now = now
    }

    public func stories(limit: Int) async throws -> Sourced<[NewsStory]> {
        let n = now()
        return Sourced(value: Array(DemoIntelligence.stories(now: n).prefix(limit)), source: .demoFixture, asOf: n)
    }

    public func calendar(from: Date, to: Date) async throws -> Sourced<[EconomicEvent]> {
        let n = now()
        let events = DemoIntelligence.calendar(now: n).filter { $0.scheduledAt >= from && $0.scheduledAt <= to }
        return Sourced(value: events, source: .demoFixture, asOf: n)
    }
}

public enum DemoIntelligence {
    public static func stories(now: Date) -> [NewsStory] {
        let src = DataSource.demoFixture
        return [
            NewsStory(
                id: "demo-cpi-explainer",
                headline: "Sample: How an inflation surprise can move gold and the dollar",
                whatHappened: "Illustrative scenario: US consumer prices rise faster than the consensus forecast.",
                originalSource: "Treidify demo (educational sample, not a news report)",
                sourceURL: nil, publishedAt: now.addingTimeInterval(-40 * 60), eventTime: now.addingTimeInterval(-60 * 60),
                categories: [.inflation, .monetaryPolicy],
                goldImpact: ImpactAssessment(direction: .mixed, explanation: "Hotter inflation can raise rate expectations and real yields, which tends to weigh on gold, while also lifting inflation-hedge demand."),
                usdImpact: ImpactAssessment(direction: .bullish, explanation: "Higher expected policy rates usually support the dollar if Treasury yields rise with the surprise."),
                mechanisms: ["Rate expectations", "Real Treasury yields", "Inflation-hedge demand"],
                supportingEvidence: ["Two-year yields rising after the release would support the rate channel."],
                opposingEvidence: ["Falling real yields despite the surprise would point to a different driver."],
                watchItems: ["2-year and 10-year Treasury yields", "DXY reaction in the first hour", "Fed speaker commentary"],
                invalidation: "If yields fall and the dollar weakens after the release, the rate-expectations reading does not hold.",
                observedReaction: nil, provider: src),
            NewsStory(
                id: "demo-geopolitics-explainer",
                headline: "Sample: Why geopolitical stress does not automatically lift gold",
                whatHappened: "Illustrative scenario: tensions escalate in an energy-producing region.",
                originalSource: "Treidify demo (educational sample, not a news report)",
                sourceURL: nil, publishedAt: now.addingTimeInterval(-3 * 3_600), eventTime: nil,
                categories: [.geopolitics, .energy],
                goldImpact: ImpactAssessment(direction: .uncertain, explanation: "Safe-haven demand can support gold, but a stronger dollar or higher yields from an oil-driven inflation shock can offset it."),
                usdImpact: ImpactAssessment(direction: .uncertain, explanation: "The dollar can attract safe-haven flows, yet the effect depends on US exposure and rate expectations."),
                mechanisms: ["Safe-haven demand", "Oil prices and inflation expectations", "Dollar funding demand", "Market positioning"],
                supportingEvidence: ["Gold rising alongside falling real yields would support safe-haven demand."],
                opposingEvidence: ["Gold falling while the dollar rises would show dollar strength dominating."],
                watchItems: ["Brent crude", "Breakeven inflation", "Gold versus DXY correlation"],
                invalidation: "If gold weakens while risk assets are stable, the safe-haven interpretation is not supported.",
                observedReaction: nil, provider: src),
            NewsStory(
                id: "demo-fomc-explainer",
                headline: "Sample: Reading a central-bank decision beyond the headline rate",
                whatHappened: "Illustrative scenario: the policy rate is unchanged but the statement changes its guidance.",
                originalSource: "Treidify demo (educational sample, not a news report)",
                sourceURL: nil, publishedAt: now.addingTimeInterval(-26 * 3_600), eventTime: now.addingTimeInterval(-26 * 3_600),
                categories: [.centralBanks, .monetaryPolicy, .treasuryYields],
                goldImpact: ImpactAssessment(direction: .mixed, explanation: "Guidance that lowers the expected rate path can support gold through lower real yields; the opposite can weigh on it."),
                usdImpact: ImpactAssessment(direction: .mixed, explanation: "The dollar responds to the change in expected rate path versus what was priced in."),
                mechanisms: ["Forward guidance", "Expected rate path", "Real yields"],
                supportingEvidence: ["Futures-implied rate changes after the statement."],
                opposingEvidence: ["Little movement in rate futures would suggest the guidance was already priced."],
                watchItems: ["Press conference tone", "Rate futures", "DXY and gold in the following session"],
                invalidation: "If rate expectations do not move, the decision is unlikely to be the main driver of later moves.",
                observedReaction: nil, provider: src)
        ]
    }

    public static func calendar(now: Date) -> [EconomicEvent] {
        let src = DataSource.demoFixture
        let hour: TimeInterval = 3_600
        return [
            EconomicEvent(id: "demo-retail", title: "Retail Sales (m/m)", category: .retailSales, currency: "USD",
                          importance: .medium, scheduledAt: now.addingTimeInterval(-20 * hour), unit: "%",
                          forecast: 0.3, previous: 0.2, revisedPrevious: 0.1, actual: 0.5, status: .released, source: src),
            EconomicEvent(id: "demo-pmi", title: "Manufacturing PMI", category: .pmi, currency: "EUR",
                          importance: .medium, scheduledAt: now.addingTimeInterval(-4 * hour), unit: "",
                          forecast: 47.8, previous: 47.5, revisedPrevious: nil, actual: 47.6, status: .released, source: src),
            EconomicEvent(id: "demo-cpi", title: "CPI (y/y)", category: .cpi, currency: "USD",
                          importance: .high, scheduledAt: now.addingTimeInterval(3 * hour), unit: "%",
                          forecast: 2.9, previous: 3.0, revisedPrevious: nil, actual: nil, status: .scheduled, source: src),
            EconomicEvent(id: "demo-fedspeech", title: "Fed Governor Speech", category: .fedSpeech, currency: "USD",
                          importance: .medium, scheduledAt: now.addingTimeInterval(6 * hour), unit: "",
                          forecast: nil, previous: nil, revisedPrevious: nil, actual: nil, status: .scheduled, source: src),
            EconomicEvent(id: "demo-nfp", title: "Non-Farm Payrolls", category: .nfp, currency: "USD",
                          importance: .high, scheduledAt: now.addingTimeInterval(50 * hour), unit: "K",
                          forecast: 165, previous: 142, revisedPrevious: nil, actual: nil, status: .scheduled, source: src),
            EconomicEvent(id: "demo-fomc", title: "FOMC Rate Decision", category: .fomc, currency: "USD",
                          importance: .high, scheduledAt: now.addingTimeInterval(120 * hour), unit: "%",
                          forecast: nil, previous: nil, revisedPrevious: nil, actual: nil, status: .scheduled, source: src)
        ]
    }
}

/// A generated MT5-style account for demo mode. Not a real account.
public struct DemoTradingAccountRepository: TradingAccountRepository {
    private let now: @Sendable () -> Date

    public init(now: @escaping @Sendable () -> Date = { Date() }) {
        self.now = now
    }

    public static let accountID = "demo-account"

    public func connectedAccounts() async throws -> [TradingAccount] {
        [try await history(for: Self.accountID).account]
    }

    public func history(for accountID: String) async throws -> TradingHistory {
        guard accountID == Self.accountID else { throw DataProviderError.invalidResponse("unknown demo account") }
        return DemoAccountFactory.history(now: now())
    }
}

public enum DemoAccountFactory {
    public static func history(now: Date, tradeCount: Int = 140) -> TradingHistory {
        var rng = SeededGenerator(seed: 0x7A5C_00AC)
        let startingBalance = 10_000.0
        let span: TimeInterval = 45 * 86_400
        let start = now.addingTimeInterval(-span)
        var trades: [ClosedTrade] = []
        var lastNet = 0.0
        for i in 0..<tradeCount {
            let open = start.addingTimeInterval(span * Double(i) / Double(tradeCount) + rng.unit() * 3_600)
            let duration = 600 + rng.unit() * 4 * 3_600
            let close = min(open.addingTimeInterval(duration), now.addingTimeInterval(-60))
            // Built-in pattern for the coach to find: size grows after a loss.
            var volume = (0.1 + (rng.unit() * 0.4)).rounded(toPlaces: 2)
            if lastNet < 0 { volume = (volume * 1.5).rounded(toPlaces: 2) }
            let symbol = rng.unit() < 0.82 ? "XAUUSD" : "EURUSD"
            let side: TradeSide = rng.unit() < 0.5 ? .buy : .sell
            let win = rng.unit() < 0.53
            let magnitude = (40 + rng.unit() * 160) * volume / 0.25
            let gross = (win ? magnitude * 1.1 : -magnitude).rounded(toPlaces: 2)
            let commission = (-7 * volume).rounded(toPlaces: 2)
            let swap = duration > 3 * 3_600 ? (-1.2 * volume).rounded(toPlaces: 2) : 0
            let openPrice = symbol == "XAUUSD" ? 2_400 + rng.gaussian() * 20 : 1.08 + rng.gaussian() * 0.005
            let move = gross / (volume * (symbol == "XAUUSD" ? 100 : 100_000))
            let closePrice = side == .buy ? openPrice + move : openPrice - move
            let trade = ClosedTrade(id: String(format: "demo-%04d", i), symbol: symbol, side: side, volume: volume,
                                    openTime: open, closeTime: close, openPrice: openPrice, closePrice: closePrice,
                                    profit: gross, commission: commission, swap: swap)
            trades.append(trade)
            lastNet = trade.netProfit
        }
        let cash = [
            CashTransaction(id: "demo-dep-1", kind: .deposit, amount: startingBalance, time: start.addingTimeInterval(-3_600)),
            CashTransaction(id: "demo-wd-1", kind: .withdrawal, amount: 500, time: start.addingTimeInterval(span / 2))
        ]
        let realized = trades.map(\.netProfit).reduce(0, +)
        let balance = startingBalance + realized - 500
        let position = OpenPosition(id: "demo-open-1", symbol: "XAUUSD", side: .buy, volume: 0.2,
                                    openTime: now.addingTimeInterval(-2 * 3_600), openPrice: 2_398.40,
                                    currentPrice: 2_401.15, floatingProfit: 55.0)
        let account = TradingAccount(id: DemoTradingAccountRepository.accountID, displayName: "Demo account",
                                     broker: "Demo broker (sample data)", currency: "USD",
                                     balance: balance.rounded(toPlaces: 2),
                                     equity: (balance + position.floatingProfit).rounded(toPlaces: 2),
                                     source: .demoFixture, asOf: now)
        return TradingHistory(account: account, startingBalance: 0, trades: trades,
                              cashTransactions: cash, openPositions: [position])
    }
}

extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let m = pow(10, Double(places))
        return (self * m).rounded() / m
    }
}
