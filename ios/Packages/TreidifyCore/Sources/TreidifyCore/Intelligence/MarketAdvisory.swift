import Foundation

public enum Greeting {
    /// "Good morning ☀️" 05:00–11:59, "Good afternoon" 12:00–17:59, "Good evening" otherwise.
    public static func text(for date: Date, calendar: Calendar = .current) -> String {
        switch calendar.component(.hour, from: date) {
        case 5..<12: "Good morning ☀️"
        case 12..<18: "Good afternoon 🌤️"
        default: "Good evening 🌙"
        }
    }
}

public struct MarketAdvisory: Equatable, Sendable {
    public enum Kind: String, Sendable {
        case dataUnavailable
        case marketClosed
        case highImpactEvent
        case conflictingSignals
        case elevatedVolatility
        case calm
        case mixed
    }

    public let kind: Kind
    public let message: String
    /// The verified facts the message was built from, shown on expansion.
    public let basis: [String]
    public let asOf: Date?
    public let source: DataSource?

    public var isDemo: Bool { source?.isDemo ?? false }
}

/// Inputs to the dashboard advisory. Everything here must come from a sourced
/// repository or a deterministic calculation.
public struct AdvisoryInputs: Sendable {
    public var now: Date
    public var marketStatus: MarketStatus
    public var marketDataFreshness: DataFreshness
    public var marketDataSource: DataSource?
    public var marketDataAsOf: Date?
    public var goldBias: [Timeframe: BiasResult]
    public var dxyBias: [Timeframe: BiasResult]
    public var goldVolatility: VolatilityRegime
    /// Calendar events with their own provenance; nil when the calendar is unavailable.
    public var calendar: [EconomicEvent]?

    public init(now: Date, marketStatus: MarketStatus, marketDataFreshness: DataFreshness,
                marketDataSource: DataSource?, marketDataAsOf: Date?, goldBias: [Timeframe: BiasResult],
                dxyBias: [Timeframe: BiasResult], goldVolatility: VolatilityRegime, calendar: [EconomicEvent]?) {
        self.now = now
        self.marketStatus = marketStatus
        self.marketDataFreshness = marketDataFreshness
        self.marketDataSource = marketDataSource
        self.marketDataAsOf = marketDataAsOf
        self.goldBias = goldBias
        self.dxyBias = dxyBias
        self.goldVolatility = goldVolatility
        self.calendar = calendar
    }
}

/// Builds the one-line market-conditions advisory from verified inputs.
///
/// Priority order: data unavailable → market closed → high-impact USD event in
/// the next `eventWindow` → conflicting gold/DXY or gold 4H/1H structure →
/// elevated volatility → calm → mixed. Messages never say trading is safe or
/// profitable; tests enforce a banned-phrase list.
public struct MarketAdvisoryComposer: Sendable {
    public var eventWindow: TimeInterval

    public init(eventWindow: TimeInterval = 12 * 3_600) {
        self.eventWindow = eventWindow
    }

    public static let bannedPhrases = ["safe to trade", "guaranteed", "risk-free", "risk free", "sure profit", "can't lose", "will rise", "will fall", "buy now", "sell now"]

    public func compose(_ input: AdvisoryInputs) -> MarketAdvisory {
        let source = input.marketDataSource
        let asOf = input.marketDataAsOf

        func advisory(_ kind: MarketAdvisory.Kind, _ message: String, _ basis: [String]) -> MarketAdvisory {
            MarketAdvisory(kind: kind, message: message, basis: basis, asOf: asOf, source: source)
        }

        if case .weekendClosed(let reopens) = input.marketStatus {
            return advisory(.marketClosed,
                            "Markets are closed. Review your performance and prepare for the next session.",
                            ["Spot gold reopens \(Self.describe(reopens, relativeTo: input.now)) (New York 18:00, broker hours vary)."])
        }

        guard input.marketDataFreshness.isUsable else {
            return MarketAdvisory(kind: .dataUnavailable,
                                  message: "Live market data is \(input.marketDataFreshness.label.lowercased()) right now, so no market-conditions summary is shown.",
                                  basis: ["Market data state: \(input.marketDataFreshness.label)."],
                                  asOf: asOf, source: source)
        }

        if let calendar = input.calendar {
            let upcoming = calendar
                .filter { $0.currency == "USD" && $0.importance == .high && $0.status == .scheduled }
                .filter { $0.scheduledAt >= input.now && $0.scheduledAt.timeIntervalSince(input.now) <= eventWindow }
                .sorted { $0.scheduledAt < $1.scheduledAt }
            if let next = upcoming.first {
                let others = upcoming.count - 1
                let more = others > 0 ? " and \(others) other high-impact USD release\(others == 1 ? "" : "s")" : ""
                return MarketAdvisory(
                    kind: .highImpactEvent,
                    message: "High-impact USD news is scheduled: \(next.title) \(Self.describe(next.scheduledAt, relativeTo: input.now))\(more). Gold may see increased volatility around the release.",
                    basis: upcoming.map { "\($0.title) · \($0.currency) · \($0.importance.label) importance · source: \($0.source.name)" },
                    asOf: asOf, source: next.source.isDemo ? next.source : source)
            }
        }

        let goldH4 = input.goldBias[.h4]?.bias, goldH1 = input.goldBias[.h1]?.bias
        let dxyH1 = input.dxyBias[.h1]?.bias
        var conflicts: [String] = []
        if let g = goldH1, let d = dxyH1, g.isDirectional, g == d {
            conflicts.append("Gold 1H and DXY 1H are both \(g.label.lowercased()), although they usually move in opposite directions.")
        }
        if let g4 = goldH4, let g1 = goldH1, g4.isDirectional, g1.isDirectional, g4 != g1 {
            conflicts.append("Gold 4H structure is \(g4.label.lowercased()) while 1H is \(g1.label.lowercased()).")
        }
        if !conflicts.isEmpty {
            return advisory(.conflictingSignals,
                            "Gold and DXY signals are conflicting. Consider waiting for clearer structure.",
                            conflicts)
        }

        switch input.goldVolatility {
        case .elevated:
            return advisory(.elevatedVolatility,
                            "Gold volatility is elevated compared with its recent range. Wider swings than usual are possible.",
                            ["Gold ATR is above the 75th percentile of its recent lookback window."])
        case .low, .normal:
            return advisory(.calm,
                            "Market conditions are relatively calm. Watch for confirmation around important technical levels.",
                            ["No high-impact USD release in the next \(Int(eventWindow / 3_600)) hours.",
                             "Gold volatility is \(input.goldVolatility.label.lowercased()) relative to its recent range."])
        case .insufficientData:
            return advisory(.mixed,
                            "There is not enough recent data to characterise conditions. Treat levels and bias as provisional.",
                            ["Volatility regime: insufficient data."])
        }
    }

    /// "in 45 minutes", "in 3 hours", "in 2 days", or "now". Implemented by hand
    /// (not RelativeDateTimeFormatter) so output is identical on every platform.
    static func describe(_ date: Date, relativeTo now: Date) -> String {
        let seconds = date.timeIntervalSince(now)
        let future = seconds >= 0
        let minutes = Int((abs(seconds) / 60).rounded())
        func unit(_ n: Int, _ name: String) -> String { "\(n) \(name)\(n == 1 ? "" : "s")" }
        let amount: String
        switch minutes {
        case 0: return "now"
        case 1..<60: amount = unit(minutes, "minute")
        case 60..<(48 * 60): amount = unit(Int((Double(minutes) / 60).rounded()), "hour")
        default: amount = unit(Int((Double(minutes) / 1_440).rounded()), "day")
        }
        return future ? "in \(amount)" : "\(amount) ago"
    }
}
