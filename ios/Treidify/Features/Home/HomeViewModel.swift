import Foundation
import Observation
import TreidifyCore

@MainActor
@Observable
final class HomeViewModel {
    struct InstrumentSnapshot: Equatable {
        let instrument: Instrument
        var quote: Quote?
        var sparkline: [Double] = []
        var freshness: DataFreshness = .loading
        var source: DataSource?
        var asOf: Date?
    }

    struct AccountSnapshot: Equatable {
        let account: TradingAccount
        let dailyPnL: Double
        let weeklyPnL: Double
        let monthlyPnL: Double
        let floatingPnL: Double
        let openPositions: Int
        /// All-time metrics (sample size = `metrics.tradeCount`).
        let metrics: PerformanceMetrics
    }

    struct Insight: Equatable {
        let title: String
        let text: String
        let basis: String
        let isDemo: Bool
    }

    private(set) var greeting = ""
    private(set) var advisory: MarketAdvisory?
    private(set) var marketStatus: MarketStatus = .open(activeSessions: [])
    private(set) var gold = InstrumentSnapshot(instrument: .xauusd)
    private(set) var dxy = InstrumentSnapshot(instrument: .dxy)
    private(set) var bias: [String: [Timeframe: BiasResult]] = [:]
    private(set) var biasFreshness: DataFreshness = .loading
    private(set) var chart: Loadable<[Candle]> = .loading
    private(set) var chartZones: [PriceZone] = []
    private(set) var chartSource: DataSource?
    private(set) var stories: Loadable<Sourced<[NewsStory]>> = .loading
    private(set) var account: Loadable<AccountSnapshot?> = .loading
    private(set) var insight: Insight?
    /// Today's scheduled releases, soonest first (high and medium importance).
    private(set) var keyEvents: Loadable<Sourced<[EconomicEvent]>> = .loading
    private(set) var isDemo = false

    var chartTimeframe: Timeframe = .h4
    var chartInstrument: Instrument = .xauusd
    var showsZones = true

    private let market: any MarketDataRepository
    private let intelligence: any IntelligenceRepository
    private let accounts: any TradingAccountRepository
    private let now: () -> Date
    private let clock = SessionClock()
    private let biasEngine = MarketBiasEngine()

    init(market: any MarketDataRepository, intelligence: any IntelligenceRepository,
         accounts: any TradingAccountRepository, now: @escaping () -> Date = Date.init) {
        self.market = market
        self.intelligence = intelligence
        self.accounts = accounts
        self.now = now
    }

    func load() async {
        let current = now()
        greeting = Greeting.text(for: current)
        marketStatus = clock.status(at: current)

        async let goldSnapshot = snapshot(for: .xauusd, at: current)
        async let dxySnapshot = snapshot(for: .dxy, at: current)
        async let goldBias = biasMatrix(for: .xauusd)
        async let dxyBias = biasMatrix(for: .dxy)
        async let goldDaily = try? market.candles(for: .xauusd, timeframe: .h1, count: 200)
        async let calendarResult = try? intelligence.calendar(from: current.addingTimeInterval(-3_600), to: current.addingTimeInterval(24 * 3_600))
        async let storiesResult = loadStories()
        async let accountResult = loadAccount(at: current)

        gold = await goldSnapshot
        dxy = await dxySnapshot
        let (gBias, gFresh) = await goldBias
        let (dBias, _) = await dxyBias
        bias = [Instrument.xauusd.symbol: gBias, Instrument.dxy.symbol: dBias]
        biasFreshness = gFresh
        stories = await storiesResult
        account = await accountResult
        isDemo = gold.source?.isDemo ?? false

        if let calendar = await calendarResult {
            let upcoming = calendar.value
                .filter { $0.importance >= .medium && $0.scheduledAt >= current.addingTimeInterval(-3_600) }
                .sorted { $0.scheduledAt < $1.scheduledAt }
            keyEvents = .loaded(Sourced(value: Array(upcoming.prefix(4)), source: calendar.source, asOf: calendar.asOf))
        } else {
            keyEvents = .failed("The economic calendar is unavailable.")
        }

        let volatility = await goldDaily.map { VolatilityAnalysis.analyze($0.value).regime } ?? .insufficientData
        let inputs = AdvisoryInputs(now: current, marketStatus: marketStatus, marketDataFreshness: gold.freshness,
                                    marketDataSource: gold.source, marketDataAsOf: gold.asOf,
                                    goldBias: gBias, dxyBias: dBias, goldVolatility: volatility,
                                    calendar: await calendarResult?.value)
        advisory = MarketAdvisoryComposer().compose(inputs)
        insight = makeInsight()

        await loadChart()
    }

    func loadChart() async {
        chart = .loading
        do {
            let result = try await market.candles(for: chartInstrument, timeframe: chartTimeframe, count: 160)
            chartZones = LevelDetector().analyze(result.value).zones
            chartSource = result.source
            chart = .loaded(result.value)
        } catch {
            chartZones = []
            chart = .failed(error.localizedDescription)
        }
    }

    private func snapshot(for instrument: Instrument, at current: Date) async -> InstrumentSnapshot {
        var snap = InstrumentSnapshot(instrument: instrument)
        do {
            let quote = try await market.quote(for: instrument)
            let spark = try await market.candles(for: instrument, timeframe: .m15, count: 64)
            snap.quote = quote.value
            snap.sparkline = spark.value.map(\.close)
            snap.source = quote.source
            snap.asOf = quote.asOf
            snap.freshness = FreshnessPolicy.quotes.classify(asOf: quote.asOf, now: current,
                                                             marketOpen: clock.status(at: current).isOpen)
        } catch {
            snap.freshness = Self.freshness(for: error)
        }
        return snap
    }

    private func biasMatrix(for instrument: Instrument) async -> ([Timeframe: BiasResult], DataFreshness) {
        var results: [Timeframe: BiasResult] = [:]
        var freshness: DataFreshness = .live
        for tf in Timeframe.biasTimeframes {
            do {
                let candles = try await market.candles(for: instrument, timeframe: tf, count: 150)
                results[tf] = biasEngine.evaluate(candles.value, timeframe: tf)
            } catch {
                freshness = Self.freshness(for: error)
            }
        }
        return (results, freshness)
    }

    private func loadStories() async -> Loadable<Sourced<[NewsStory]>> {
        do { return .loaded(try await intelligence.stories(limit: 3)) } catch { return .failed(error.localizedDescription) }
    }

    private func loadAccount(at current: Date) async -> Loadable<AccountSnapshot?> {
        do {
            guard let first = try await accounts.connectedAccounts().first else { return .loaded(nil) }
            let history = try await accounts.history(for: first.id)
            let calc = PerformanceCalculator()
            return .loaded(AccountSnapshot(
                account: history.account,
                dailyPnL: calc.realizedPnL(history.trades, period: .day, now: current),
                weeklyPnL: calc.realizedPnL(history.trades, period: .week, now: current),
                monthlyPnL: calc.realizedPnL(history.trades, period: .month, now: current),
                floatingPnL: history.openPositions.map(\.floatingProfit).reduce(0, +),
                openPositions: history.openPositions.count,
                metrics: calc.metrics(for: history.trades, startingEquity: history.tradingCapitalBase)))
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    /// Rule-based insight from verified figures only. Personal when an account is
    /// connected; otherwise a general observation from the bias calculation.
    private func makeInsight() -> Insight? {
        if case .loaded(let snapshot?) = account, snapshot.metrics.tradeCount > 0 {
            let m = snapshot.metrics
            let pf = m.profitFactor.map { Formatters.decimal($0) } ?? "n/a"
            return Insight(
                title: "Your trading",
                text: "Across \(m.tradeCount) closed trades, your win rate is \(Formatters.percent(m.winRate, digits: 0)) with a profit factor of \(pf) and a largest losing streak of \(m.maxConsecutiveLosses).",
                basis: "Calculated from your imported trade history. Costs are included.",
                isDemo: snapshot.account.source.isDemo)
        }
        guard let goldBias = bias[Instrument.xauusd.symbol], let h4 = goldBias[.h4], let h1 = goldBias[.h1],
              h4.bias != .insufficientData else { return nil }
        let relation = h4.bias == h1.bias ? "agrees with" : "differs from"
        return Insight(
            title: "Market observation",
            text: "Gold's 4H structure is \(h4.bias.label.lowercased()) and \(relation) the 1H reading (\(h1.bias.label.lowercased())). \(h4.invalidationDescription ?? "")",
            basis: "Swing-structure and EMA(50) calculation (\(MarketBiasEngine.algorithmVersion)).",
            isDemo: isDemo)
    }

    static func freshness(for error: Error) -> DataFreshness {
        if let e = error as? DataProviderError, case .providerNotConfigured = e {
            return .unavailable(reason: e.localizedDescription)
        }
        return .error(message: error.localizedDescription)
    }
}
