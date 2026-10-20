import Foundation

public struct PerformanceMetrics: Equatable, Sendable {
    public let tradeCount: Int
    public let wins: Int
    public let losses: Int
    public let breakevens: Int
    public let netProfit: Double
    public let grossProfit: Double
    public let grossLoss: Double
    public let totalCosts: Double
    /// wins / (wins + losses); nil without decided trades.
    public let winRate: Double?
    /// grossProfit / |grossLoss|; nil when there are no losing trades.
    public let profitFactor: Double?
    /// Mean net P&L per trade.
    public let expectancy: Double?
    public let averageWinner: Double?
    public let averageLoser: Double?
    /// averageWinner / |averageLoser|.
    public let rewardToRisk: Double?
    public let maxConsecutiveWins: Int
    public let maxConsecutiveLosses: Int
    public let maxDrawdown: Double
    public let maxDrawdownPercent: Double?
    public let periodStart: Date?
    public let periodEnd: Date?

    public static let empty = PerformanceMetrics(tradeCount: 0, wins: 0, losses: 0, breakevens: 0, netProfit: 0,
                                                 grossProfit: 0, grossLoss: 0, totalCosts: 0, winRate: nil,
                                                 profitFactor: nil, expectancy: nil, averageWinner: nil,
                                                 averageLoser: nil, rewardToRisk: nil, maxConsecutiveWins: 0,
                                                 maxConsecutiveLosses: 0, maxDrawdown: 0, maxDrawdownPercent: nil,
                                                 periodStart: nil, periodEnd: nil)
}

public struct EquityPoint: Equatable, Sendable, Identifiable {
    public let index: Int
    public let time: Date
    /// Starting balance plus cumulative realized trading P&L. Deposits and
    /// withdrawals are excluded so the curve measures trading performance only.
    public let tradingEquity: Double
    public var id: Int { index }
}

public struct GroupPerformance: Equatable, Sendable, Identifiable {
    public let key: String
    public let metrics: PerformanceMetrics
    public var id: String { key }
}

public enum ReportingPeriod: String, CaseIterable, Sendable, Identifiable {
    case day, week, month, year, all

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .day: "Today"
        case .week: "This week"
        case .month: "This month"
        case .year: "This year"
        case .all: "All time"
        }
    }

    public var shortLabel: String {
        switch self {
        case .day: "1D"
        case .week: "1W"
        case .month: "1M"
        case .year: "1Y"
        case .all: "All"
        }
    }

    /// The calendar interval containing `now` (trades are assigned by close time).
    public func interval(containing now: Date, calendar: Calendar) -> DateInterval? {
        let component: Calendar.Component
        switch self {
        case .day: component = .day
        case .week: component = .weekOfYear
        case .month: component = .month
        case .year: component = .year
        case .all: return nil
        }
        return calendar.dateInterval(of: component, for: now)
    }
}

/// Deterministic trading-performance analytics. Trades are attributed to the
/// period in which they closed. Every metric is reproducible from the trade list.
public struct PerformanceCalculator: Sendable {
    public var calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    public func trades(_ trades: [ClosedTrade], in period: ReportingPeriod, now: Date) -> [ClosedTrade] {
        guard let interval = period.interval(containing: now, calendar: calendar) else { return trades }
        return trades.filter { $0.closeTime >= interval.start && $0.closeTime < interval.end }
    }

    public func metrics(for trades: [ClosedTrade], startingEquity: Double? = nil) -> PerformanceMetrics {
        guard !trades.isEmpty else { return .empty }
        let sorted = trades.sorted { ($0.closeTime, $0.id) < ($1.closeTime, $1.id) }
        let nets = sorted.map(\.netProfit)
        let winners = nets.filter { $0 > 0 }
        let losers = nets.filter { $0 < 0 }
        let grossProfit = winners.reduce(0, +)
        let grossLoss = losers.reduce(0, +)
        let decided = winners.count + losers.count

        var maxWinStreak = 0, maxLossStreak = 0, winStreak = 0, lossStreak = 0
        for n in nets {
            if n > 0 { winStreak += 1; lossStreak = 0 }
            else if n < 0 { lossStreak += 1; winStreak = 0 }
            else { winStreak = 0; lossStreak = 0 }
            maxWinStreak = max(maxWinStreak, winStreak)
            maxLossStreak = max(maxLossStreak, lossStreak)
        }

        // Drawdown on the trading-only equity path.
        let base = startingEquity ?? 0
        var equity = base, peak = base, maxDD = 0.0, maxDDPercent: Double? = nil
        for n in nets {
            equity += n
            peak = max(peak, equity)
            let dd = peak - equity
            if dd > maxDD {
                maxDD = dd
                maxDDPercent = peak > 0 ? dd / peak * 100 : nil
            }
        }

        let avgWin = winners.isEmpty ? nil : grossProfit / Double(winners.count)
        let avgLoss = losers.isEmpty ? nil : grossLoss / Double(losers.count)
        return PerformanceMetrics(
            tradeCount: sorted.count,
            wins: winners.count,
            losses: losers.count,
            breakevens: sorted.count - decided,
            netProfit: nets.reduce(0, +),
            grossProfit: grossProfit,
            grossLoss: grossLoss,
            totalCosts: sorted.map(\.costs).reduce(0, +),
            winRate: decided == 0 ? nil : Double(winners.count) / Double(decided),
            profitFactor: grossLoss == 0 ? nil : grossProfit / abs(grossLoss),
            expectancy: nets.reduce(0, +) / Double(nets.count),
            averageWinner: avgWin,
            averageLoser: avgLoss,
            rewardToRisk: (avgWin != nil && avgLoss != nil && avgLoss! != 0) ? avgWin! / abs(avgLoss!) : nil,
            maxConsecutiveWins: maxWinStreak,
            maxConsecutiveLosses: maxLossStreak,
            maxDrawdown: maxDD,
            maxDrawdownPercent: startingEquity == nil ? nil : (maxDD == 0 ? 0 : maxDDPercent),
            periodStart: sorted.first?.closeTime,
            periodEnd: sorted.last?.closeTime
        )
    }

    public func equityCurve(for trades: [ClosedTrade], startingBalance: Double) -> [EquityPoint] {
        let sorted = trades.sorted { ($0.closeTime, $0.id) < ($1.closeTime, $1.id) }
        var equity = startingBalance
        var points: [EquityPoint] = []
        if let first = sorted.first {
            points.append(EquityPoint(index: 0, time: first.openTime, tradingEquity: equity))
        }
        for (i, trade) in sorted.enumerated() {
            equity += trade.netProfit
            points.append(EquityPoint(index: i + 1, time: trade.closeTime, tradingEquity: equity))
        }
        return points
    }

    /// Net realized P&L for the period containing `now`.
    public func realizedPnL(_ trades: [ClosedTrade], period: ReportingPeriod, now: Date) -> Double {
        self.trades(trades, in: period, now: now).map(\.netProfit).reduce(0, +)
    }

    public func bySymbol(_ trades: [ClosedTrade]) -> [GroupPerformance] {
        Dictionary(grouping: trades, by: \.symbol)
            .map { GroupPerformance(key: $0.key, metrics: metrics(for: $0.value)) }
            .sorted { $0.metrics.tradeCount > $1.metrics.tradeCount || ($0.metrics.tradeCount == $1.metrics.tradeCount && $0.key < $1.key) }
    }

    /// Groups by the trading session active at the trade's open time. Overlaps are
    /// attributed to the later-opening session (London over Tokyo, New York over London).
    public func bySession(_ trades: [ClosedTrade], clock: SessionClock = SessionClock()) -> [GroupPerformance] {
        let groups = Dictionary(grouping: trades) { Self.sessionKey(for: $0.openTime, clock: clock) }
        let order = ["Sydney", "Tokyo", "London", "New York", "Off-session"]
        return groups.map { GroupPerformance(key: $0.key, metrics: metrics(for: $0.value)) }
            .sorted { (order.firstIndex(of: $0.key) ?? 99) < (order.firstIndex(of: $1.key) ?? 99) }
    }

    static func sessionKey(for date: Date, clock: SessionClock) -> String {
        let active = clock.activeSessions(at: date)
        for session in [TradingSession.newYork, .london, .tokyo, .sydney] where active.contains(session) {
            return session.name
        }
        return "Off-session"
    }

    /// Net deposits minus withdrawals, reported separately from trading P&L.
    public func netCashFlow(_ transactions: [CashTransaction]) -> Double {
        transactions.map(\.signedAmount).reduce(0, +)
    }
}
