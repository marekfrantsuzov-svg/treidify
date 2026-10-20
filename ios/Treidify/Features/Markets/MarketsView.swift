import Observation
import SwiftUI
import TreidifyCore

@MainActor
@Observable
final class MarketsViewModel {
    struct Analysis {
        let candles: [Candle]
        let bias: BiasResult
        let levels: LevelAnalysis
        let fibonacci: FibonacciRetracement?
        let volatility: VolatilityAnalysis
        let source: DataSource
        let freshness: DataFreshness
        let asOf: Date
    }

    var instrument: Instrument = .xauusd
    var timeframe: Timeframe = .h1
    var showsZones = true
    private(set) var analysis: Loadable<Analysis> = .loading

    private let market: any MarketDataRepository
    private let clock = SessionClock()

    init(market: any MarketDataRepository) {
        self.market = market
    }

    func load() async {
        analysis = .loading
        do {
            let result = try await market.candles(for: instrument, timeframe: timeframe, count: 200)
            let now = Date()
            let candles = result.value
            analysis = .loaded(Analysis(
                candles: candles,
                bias: MarketBiasEngine().evaluate(candles, timeframe: timeframe),
                levels: LevelDetector().analyze(candles),
                fibonacci: FibonacciRetracement.latestLeg(in: candles),
                volatility: VolatilityAnalysis.analyze(candles),
                source: result.source,
                freshness: FreshnessPolicy.candles(timeframe).classify(asOf: result.asOf, now: now,
                                                                       marketOpen: clock.status(at: now).isOpen),
                asOf: result.asOf))
        } catch {
            analysis = .failed(error.localizedDescription)
        }
    }
}

struct MarketsView: View {
    @Environment(AppModel.self) private var app
    @State private var model: MarketsViewModel?

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()
                ScrollView {
                    if let model { MarketsContent(model: model) }
                }
                .scrollIndicators(.hidden)
            }
            .navigationTitle("Markets")
        }
        .task(id: app.dataContext) {
            let vm = MarketsViewModel(market: app.marketData)
            model = vm
            await vm.load()
        }
    }
}

private struct MarketsContent: View {
    @Bindable var model: MarketsViewModel

    var body: some View {
        VStack(spacing: Spacing.m) {
            PillPicker(options: Instrument.primary, selection: $model.instrument, title: \.symbol,
                       accessibilityTitle: "Instrument")
                .frame(maxWidth: .infinity, alignment: .leading)

            GlassCard {
                VStack(alignment: .leading, spacing: Spacing.s) {
                    SectionHeader(title: model.instrument.displayName, subtitle: model.instrument.symbol) {
                        if let a = model.analysis.value { FreshnessBadge(freshness: a.freshness, source: a.source, asOf: a.asOf) }
                    }
                    PillPicker(options: Timeframe.allCases, selection: $model.timeframe, title: \.rawValue,
                               accessibilityTitle: "Timeframe")
                    switch model.analysis {
                    case .loading:
                        RoundedRectangle(cornerRadius: Radius.inner).fill(Theme.surfaceInset).frame(height: 280)
                            .overlay { ProgressView() }
                    case .failed(let message):
                        UnavailableState(title: "Market data unavailable", message: message)
                    case .loaded(let a):
                        CandlestickChartView(candles: a.candles, instrument: model.instrument, timeframe: model.timeframe,
                                             zones: a.levels.zones, showsZones: model.showsZones, visibleCount: 80, height: 280)
                        Toggle("Show conditional zones", isOn: $model.showsZones)
                            .font(.footnote)
                            .tint(Theme.accent)
                    }
                }
            }

            if case .loaded(let a) = model.analysis {
                BiasDetailCard(result: a.bias, instrument: model.instrument)
                LevelsCard(levels: a.levels, instrument: model.instrument)
                if let fib = a.fibonacci { FibonacciCard(fib: fib, instrument: model.instrument) }
                VolatilityCard(volatility: a.volatility, timeframe: model.timeframe)
                Text("Conditional analysis for education. It describes market structure and is not an instruction to buy or sell.")
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, Spacing.screenHorizontal)
        .padding(.bottom, Spacing.xl)
        .onChange(of: model.instrument) { _, _ in Task { await model.load() } }
        .onChange(of: model.timeframe) { _, _ in Task { await model.load() } }
    }
}

struct BiasDetailCard: View {
    let result: BiasResult
    let instrument: Instrument

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "\(result.timeframe.rawValue) structure", subtitle: "Algorithm \(MarketBiasEngine.algorithmVersion)") {
                    BiasChip(bias: result.bias)
                }
                ForEach(Array(result.rationale.enumerated()), id: \.offset) { step in
                    HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                        Text("\(step.offset + 1)")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Theme.accent)
                            .frame(width: 18, height: 18)
                            .background(Theme.accentSoft, in: Circle())
                        Text(step.element)
                            .font(.footnote)
                            .foregroundStyle(Theme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                if let invalidation = result.invalidationDescription {
                    Label(invalidation, systemImage: "xmark.octagon")
                        .font(.footnote)
                        .foregroundStyle(Theme.textPrimary)
                        .padding(Spacing.s)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.surfaceInset, in: RoundedRectangle(cornerRadius: Radius.inner, style: .continuous))
                }
                Text("Sample: \(result.candleCount) candles.")
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
    }
}

struct LevelsCard: View {
    let levels: LevelAnalysis
    let instrument: Instrument

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "Support, resistance & liquidity", subtitle: levels.atr.map { "ATR(14) \(instrument.format($0))" })
                if levels.zones.isEmpty {
                    UnavailableState(title: "No qualifying levels", message: levels.unavailableReason ?? "No zones were found.",
                                     systemImage: "ruler")
                } else {
                    ForEach(levels.zones.sorted { $0.mid > $1.mid }) { zone in
                        HStack {
                            RoundedRectangle(cornerRadius: 2).fill(zone.kind.color).frame(width: 4, height: 28)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(zone.kind.label).font(.footnote.weight(.semibold)).foregroundStyle(Theme.textPrimary)
                                Text("\(zone.touches) swing touches")
                                    .font(.caption2).foregroundStyle(Theme.textTertiary)
                            }
                            Spacer()
                            Text(zone.lower == zone.upper ? instrument.format(zone.lower)
                                 : "\(instrument.format(zone.lower)) – \(instrument.format(zone.upper))")
                                .font(.tdNumericSmall)
                                .foregroundStyle(Theme.textSecondary)
                        }
                        .accessibilityElement(children: .combine)
                    }
                    Text("Zones cluster confirmed swing points within half an ATR. Liquidity marks equal highs or lows that price has not yet traded through.")
                        .font(.caption2)
                        .foregroundStyle(Theme.textTertiary)
                }
            }
        }
    }
}

struct FibonacciCard: View {
    let fib: FibonacciRetracement
    let instrument: Instrument

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SectionHeader(title: "Fibonacci retracement",
                              subtitle: "Latest \(fib.direction == .up ? "up" : "down") leg \(instrument.format(fib.swingLow.price)) – \(instrument.format(fib.swingHigh.price))")
                ForEach(fib.levels) { level in
                    HStack {
                        Text(level.label).font(.footnote.weight(.medium)).foregroundStyle(Theme.textSecondary)
                        Spacer()
                        Text(instrument.format(level.price)).font(.tdNumericSmall).foregroundStyle(Theme.textPrimary)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}

struct VolatilityCard: View {
    let volatility: VolatilityAnalysis
    let timeframe: Timeframe

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "Volatility", subtitle: "\(timeframe.rawValue) ATR(14) versus last \(volatility.sampleSize) values")
                HStack(spacing: Spacing.xs) {
                    MetricTile(title: "Regime", value: volatility.regime.label)
                    MetricTile(title: "ATR % of price", value: volatility.atrPercent.map { Formatters.decimal($0, digits: 3) + "%" } ?? "—")
                    MetricTile(title: "Percentile", value: volatility.percentile.map { Formatters.decimal($0, digits: 0) } ?? "—")
                }
            }
        }
    }
}

#Preview("Markets") {
    MarketsView()
        .environment(AppModel.preview())
}
