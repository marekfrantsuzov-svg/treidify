import Charts
import SwiftUI
import TreidifyCore

private struct IndexedCandle: Identifiable {
    let index: Int
    let candle: Candle
    var id: Int { index }
}

/// Interactive candlestick chart.
///
/// - Index-based x axis, so weekend and daily-break gaps do not leave holes.
/// - Drag to inspect a candle (OHLC readout). Inspection gives no sound or haptic
///   per candle, by design.
/// - Optional conditional zones from `LevelDetector`; nothing is drawn when the
///   detector found none (levels are never invented).
struct CandlestickChartView: View {
    let candles: [Candle]
    let instrument: Instrument
    var timeframe: Timeframe
    var zones: [PriceZone] = []
    var showsZones = true
    var visibleCount = 60
    var height: CGFloat = 240
    var showsVolume = true

    /// Raw selection from Charts (x is plotted as Double so zones and candles share one scale).
    @State private var selectedX: Double?

    private var selectedIndex: Int? { selectedX.map { Int($0.rounded()) } }

    /// Only the nearest support and nearest resistance carry a text label, so the
    /// chart stays readable.
    private var labelledZoneIDs: Set<PriceZone.ID> {
        guard let close = candles.last?.close else { return [] }
        let support = zones.filter { $0.kind == .support }.min { abs($0.upper - close) < abs($1.upper - close) }
        let resistance = zones.filter { $0.kind == .resistance }.min { abs($0.lower - close) < abs($1.lower - close) }
        return Set([support?.id, resistance?.id].compactMap { $0 })
    }

    private var window: [IndexedCandle] {
        Array(candles.suffix(visibleCount)).enumerated().map { IndexedCandle(index: $0.offset, candle: $0.element) }
    }

    var body: some View {
        let items = window
        let lows = items.map(\.candle.low), highs = items.map(\.candle.high)
        let lo = lows.min() ?? 0, hi = highs.max() ?? 1
        let pad = max((hi - lo) * 0.08, hi * 0.0005)
        let domain = (lo - pad)...(hi + pad)
        let minBody = (hi - lo) * 0.003
        let visibleZones = showsZones ? zones.filter { $0.upper >= domain.lowerBound && $0.lower <= domain.upperBound } : []

        VStack(alignment: .leading, spacing: Spacing.xs) {
            readout(items)
            Chart {
                ForEach(visibleZones) { zone in
                    RectangleMark(
                        xStart: .value("Start", -0.5),
                        xEnd: .value("End", Double(items.count) - 0.5),
                        yStart: .value("Zone low", max(zone.lower, domain.lowerBound)),
                        yEnd: .value("Zone high", min(max(zone.upper, zone.lower + minBody), domain.upperBound))
                    )
                    .foregroundStyle(zone.kind.color.opacity(0.16))
                    .annotation(position: .overlay, alignment: .topTrailing, spacing: 0) {
                        if labelledZoneIDs.contains(zone.id) {
                            ZoneTag(zone: zone, instrument: instrument)
                        }
                    }
                }
                ForEach(items) { item in
                    let c = item.candle
                    let tone = c.isBullish ? Theme.bullish : Theme.bearish
                    RectangleMark(
                        x: .value("Candle", Double(item.index)),
                        yStart: .value("Low", c.low),
                        yEnd: .value("High", c.high),
                        width: .fixed(1)
                    )
                    .foregroundStyle(tone.opacity(0.9))
                    RectangleMark(
                        x: .value("Candle", Double(item.index)),
                        yStart: .value("Open", min(c.open, c.close)),
                        yEnd: .value("Close", max(max(c.open, c.close), min(c.open, c.close) + minBody)),
                        width: .ratio(0.62)
                    )
                    .foregroundStyle(tone)
                }
                if let last = items.last?.candle {
                    RuleMark(y: .value("Last", last.close))
                        .foregroundStyle((last.isBullish ? Theme.bullish : Theme.bearish).opacity(0.7))
                        .lineStyle(StrokeStyle(lineWidth: 0.75, dash: [2, 3]))
                        .annotation(position: .top, alignment: .trailing, spacing: 2) {
                            Text(instrument.format(last.close))
                                .font(.caption2.weight(.bold).monospacedDigit())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(last.isBullish ? Theme.bullish : Theme.bearish,
                                            in: RoundedRectangle(cornerRadius: 5, style: .continuous))
                        }
                }
                if let selectedIndex, items.indices.contains(selectedIndex) {
                    RuleMark(x: .value("Selected", Double(selectedIndex)))
                        .foregroundStyle(Theme.textTertiary.opacity(0.6))
                        .lineStyle(StrokeStyle(lineWidth: 0.75, dash: [3, 3]))
                }
            }
            .chartXScale(domain: -1.0...Double(max(items.count, 1)))
            .chartYScale(domain: domain)
            .chartXAxis(.hidden)
            .chartYAxis {
                AxisMarks(position: .trailing, values: .automatic(desiredCount: 4)) { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5)).foregroundStyle(Theme.hairline)
                    AxisValueLabel().font(.caption2).foregroundStyle(Theme.textTertiary)
                }
            }
            .chartXSelection(value: $selectedX)
            .frame(height: height)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibilitySummary(items))

            if showsVolume, items.contains(where: { $0.candle.volume != nil }) {
                Chart(items) { item in
                    BarMark(x: .value("Candle", Double(item.index)), y: .value("Volume", item.candle.volume ?? 0), width: .ratio(0.62))
                        .foregroundStyle((item.candle.isBullish ? Theme.bullish : Theme.bearish).opacity(0.35))
                }
                .chartXScale(domain: -1.0...Double(max(items.count, 1)))
                .chartXAxis(.hidden)
                .chartYAxis(.hidden)
                .frame(height: 28)
                .accessibilityHidden(true)
            }

            if showsZones && !visibleZones.isEmpty {
                ZoneLegend(kinds: Array(Set(visibleZones.map(\.kind))).sorted { $0.rawValue < $1.rawValue })
            }
        }
    }

    @ViewBuilder
    private func readout(_ items: [IndexedCandle]) -> some View {
        let item = selectedIndex.flatMap { i in items.indices.contains(i) ? items[i] : nil } ?? items.last
        if let c = item?.candle {
            HStack(spacing: Spacing.s) {
                ohlc("O", c.open)
                ohlc("H", c.high)
                ohlc("L", c.low)
                ohlc("C", c.close)
                Spacer(minLength: 0)
                Text(c.time, format: .dateTime.month(.abbreviated).day().hour().minute())
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .accessibilityElement(children: .combine)
        }
    }

    private func ohlc(_ label: String, _ value: Double) -> some View {
        HStack(spacing: 2) {
            Text(label).foregroundStyle(Theme.textTertiary)
            Text(instrument.format(value)).foregroundStyle(Theme.textSecondary)
        }
        .font(.tdNumericSmall)
    }

    private func accessibilitySummary(_ items: [IndexedCandle]) -> String {
        guard let first = items.first?.candle, let last = items.last?.candle else { return "No chart data" }
        let hi = items.map(\.candle.high).max() ?? last.high, lo = items.map(\.candle.low).min() ?? last.low
        return "\(instrument.shortName) \(timeframe.accessibilityName) candlestick chart, \(items.count) candles. Opened at \(instrument.format(first.open)), last close \(instrument.format(last.close)), high \(instrument.format(hi)), low \(instrument.format(lo))."
    }
}

/// "Resistance / 2,670.00 – 2,690.00" label pinned to a zone's corner.
private struct ZoneTag: View {
    let zone: PriceZone
    let instrument: Instrument

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            Text(zone.kind.label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(zone.kind.color)
            Text("\(instrument.format(zone.lower)) – \(instrument.format(zone.upper))")
                .font(.caption2.monospacedDigit())
                .foregroundStyle(Theme.textSecondary)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
    }
}

private struct ZoneLegend: View {
    let kinds: [PriceZone.Kind]

    var body: some View {
        HStack(spacing: Spacing.s) {
            ForEach(kinds, id: \.self) { kind in
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 2).fill(kind.color.opacity(0.5)).frame(width: 10, height: 6)
                    Text(kind.label)
                }
            }
            Spacer(minLength: 0)
            Text("Conditional zones")
        }
        .font(.caption2)
        .foregroundStyle(Theme.textTertiary)
        .accessibilityElement(children: .combine)
    }
}

extension PriceZone.Kind {
    var color: Color {
        switch self {
        case .support: Theme.bullish
        case .resistance: Theme.bearish
        case .buySideLiquidity, .sellSideLiquidity: Theme.accent
        }
    }
}

/// Minimal line chart for quotes.
struct SparklineView: View {
    let values: [Double]
    var tone: Color = Theme.accent

    var body: some View {
        let lo = values.min() ?? 0, hi = values.max() ?? 1
        let pad = max((hi - lo) * 0.1, 0.000_001)
        Chart {
            ForEach(Array(values.enumerated()), id: \.offset) { point in
                AreaMark(
                    x: .value("Index", point.offset),
                    yStart: .value("Base", lo - pad),
                    yEnd: .value("Value", point.element)
                )
                .foregroundStyle(LinearGradient(colors: [tone.opacity(0.22), tone.opacity(0)], startPoint: .top, endPoint: .bottom))
                .interpolationMethod(.monotone)
                LineMark(x: .value("Index", point.offset), y: .value("Value", point.element))
                    .foregroundStyle(tone)
                    .lineStyle(StrokeStyle(lineWidth: 1.5, lineCap: .round))
                    .interpolationMethod(.monotone)
            }
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: (lo - pad)...(hi + pad))
        .chartLegend(.hidden)
        .accessibilityHidden(true)
    }
}

/// Trading-only equity curve (deposits/withdrawals excluded).
struct EquityCurveView: View {
    let points: [EquityPoint]
    let currency: String

    var body: some View {
        let values = points.map(\.tradingEquity)
        let lo = values.min() ?? 0, hi = values.max() ?? 1
        let pad = max((hi - lo) * 0.1, 1)
        let tone = (values.last ?? 0) >= (values.first ?? 0) ? Theme.bullish : Theme.bearish
        Chart {
            ForEach(points) { p in
                AreaMark(x: .value("Trade", p.index), yStart: .value("Base", lo - pad), yEnd: .value("Equity", p.tradingEquity))
                    .foregroundStyle(LinearGradient(colors: [tone.opacity(0.2), tone.opacity(0)], startPoint: .top, endPoint: .bottom))
                LineMark(x: .value("Trade", p.index), y: .value("Equity", p.tradingEquity))
                    .foregroundStyle(tone)
                    .lineStyle(StrokeStyle(lineWidth: 1.75, lineCap: .round))
            }
        }
        .chartYScale(domain: (lo - pad)...(hi + pad))
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisValueLabel().font(.caption2).foregroundStyle(Theme.textTertiary)
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5)).foregroundStyle(Theme.hairline)
                AxisValueLabel().font(.caption2).foregroundStyle(Theme.textTertiary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Equity curve over \(max(points.count - 1, 0)) trades, from \(Formatters.money(values.first, currency: currency)) to \(Formatters.money(values.last, currency: currency)).")
    }
}
