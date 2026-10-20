import Foundation

/// An evidence-backed observation about trading behaviour. Observations state
/// measurable facts and never infer emotions (e.g. they say "position size
/// increased after losses", not "revenge trading").
public struct CoachObservation: Identifiable, Equatable, Sendable {
    public enum Kind: String, Sendable {
        case tradeFrequency
        case riskAfterLosses
        case inconsistentSizing
        case sessionWeakness
        case negativeExpectancy
        case tradingCosts
        case ruleViolation
    }

    public enum Severity: Int, Sendable, Comparable {
        case info = 0, watch, important
        public static func < (lhs: Self, rhs: Self) -> Bool { lhs.rawValue < rhs.rawValue }
    }

    public let kind: Kind
    public let severity: Severity
    public let title: String
    public let finding: String
    public let evidence: [String]
    public let suggestion: String
    public let sampleSize: Int

    public var id: String { kind.rawValue }
}

/// User-defined rules the coach checks against.
public struct TradingRulebook: Equatable, Sendable, Codable {
    public var maxTradesPerDay: Int?
    public var maxVolumePerTrade: Double?
    public var allowedSymbols: [String]?

    public init(maxTradesPerDay: Int? = nil, maxVolumePerTrade: Double? = nil, allowedSymbols: [String]? = nil) {
        self.maxTradesPerDay = maxTradesPerDay
        self.maxVolumePerTrade = maxVolumePerTrade
        self.allowedSymbols = allowedSymbols
    }
}

/// Deterministic pattern detection. Each detector requires a minimum sample
/// size so small samples never produce confident claims.
public struct CoachAnalyzer: Sendable {
    public var minimumSample = 20
    public var calendar: Calendar

    public init(calendar: Calendar = .current, minimumSample: Int = 20) {
        self.calendar = calendar
        self.minimumSample = minimumSample
    }

    public func observations(for trades: [ClosedTrade], rulebook: TradingRulebook = TradingRulebook()) -> [CoachObservation] {
        let sorted = trades.sorted { $0.closeTime < $1.closeTime }
        var result: [CoachObservation] = []
        let calc = PerformanceCalculator(calendar: calendar)
        let pct = { (v: Double) in v.formatted(.percent.precision(.fractionLength(0))) }
        let money = { (v: Double) in v.formatted(.number.precision(.fractionLength(2))) }

        // Rule violations: user-defined, so no minimum sample.
        var violations: [String] = []
        if let maxPerDay = rulebook.maxTradesPerDay {
            let perDay = Dictionary(grouping: sorted) { calendar.startOfDay(for: $0.openTime) }
            let overDays = perDay.filter { $0.value.count > maxPerDay }
            if !overDays.isEmpty {
                violations.append("\(overDays.count) day(s) exceeded your limit of \(maxPerDay) trades per day.")
            }
        }
        if let maxVolume = rulebook.maxVolumePerTrade {
            let over = sorted.filter { $0.volume > maxVolume }.count
            if over > 0 { violations.append("\(over) trade(s) exceeded your maximum volume of \(maxVolume) lots.") }
        }
        if let allowed = rulebook.allowedSymbols {
            let outside = sorted.filter { !allowed.contains($0.symbol) }.count
            if outside > 0 { violations.append("\(outside) trade(s) were on symbols outside your allowed list.") }
        }
        if !violations.isEmpty {
            result.append(CoachObservation(kind: .ruleViolation, severity: .important, title: "Rulebook exceptions",
                                           finding: "Some trades broke rules you set for yourself.", evidence: violations,
                                           suggestion: "Review the flagged trades and decide whether the rule or the behaviour should change.",
                                           sampleSize: sorted.count))
        }

        guard sorted.count >= minimumSample else { return result }

        // Position size after losses versus after wins.
        var afterLoss: [Double] = [], afterWin: [Double] = []
        for i in 1..<sorted.count {
            let prev = sorted[i - 1].netProfit
            if prev < 0 { afterLoss.append(sorted[i].volume) } else if prev > 0 { afterWin.append(sorted[i].volume) }
        }
        if afterLoss.count >= 5, afterWin.count >= 5 {
            let lossAvg = afterLoss.reduce(0, +) / Double(afterLoss.count)
            let winAvg = afterWin.reduce(0, +) / Double(afterWin.count)
            if winAvg > 0, lossAvg / winAvg >= 1.25 {
                result.append(CoachObservation(
                    kind: .riskAfterLosses, severity: .important, title: "Size increases after losses",
                    finding: "Your average position after a losing trade is \(pct(lossAvg / winAvg - 1)) larger than after a winning trade.",
                    evidence: ["Average volume after a loss: \(money(lossAvg)) lots (\(afterLoss.count) trades).",
                               "Average volume after a win: \(money(winAvg)) lots (\(afterWin.count) trades)."],
                    suggestion: "Consider a fixed-risk sizing rule so the previous result does not change the next trade's size.",
                    sampleSize: afterLoss.count + afterWin.count))
            }
        }

        // Sizing consistency: coefficient of variation of volume.
        let volumes = sorted.map(\.volume)
        let mean = volumes.reduce(0, +) / Double(volumes.count)
        let variance = volumes.map { ($0 - mean) * ($0 - mean) }.reduce(0, +) / Double(volumes.count)
        let cv = mean > 0 ? variance.squareRoot() / mean : 0
        if cv > 0.5 {
            result.append(CoachObservation(
                kind: .inconsistentSizing, severity: .watch, title: "Inconsistent position sizing",
                finding: "Position sizes vary widely (coefficient of variation \(money(cv))).",
                evidence: ["Smallest \(money(volumes.min()!)) lots, largest \(money(volumes.max()!)) lots, average \(money(mean)) lots."],
                suggestion: "Define a sizing rule in your rulebook and compare results before and after.",
                sampleSize: volumes.count))
        }

        // Session weakness: negative expectancy with at least 10 trades.
        for group in calc.bySession(sorted) where group.metrics.tradeCount >= 10 {
            if let e = group.metrics.expectancy, e < 0 {
                result.append(CoachObservation(
                    kind: .sessionWeakness, severity: .watch, title: "\(group.key) session underperforms",
                    finding: "Trades opened during the \(group.key) session have a negative average result.",
                    evidence: ["\(group.metrics.tradeCount) trades, expectancy \(money(e)) per trade, net \(money(group.metrics.netProfit))."],
                    suggestion: "Review whether your setups suit \(group.key) session conditions, or trade it with reduced size while you investigate.",
                    sampleSize: group.metrics.tradeCount))
                break
            }
        }

        let overall = calc.metrics(for: sorted)
        if let e = overall.expectancy, e < 0 {
            result.append(CoachObservation(
                kind: .negativeExpectancy, severity: .important, title: "Negative historical expectancy",
                finding: "Across \(overall.tradeCount) trades, the average result is \(money(e)) per trade.",
                evidence: ["Win rate \(overall.winRate.map(pct) ?? "n/a"), profit factor \(overall.profitFactor.map(money) ?? "n/a")."],
                suggestion: "Focus on the setups and sessions with positive expectancy before increasing frequency.",
                sampleSize: overall.tradeCount))
        }

        let grossAbs = overall.grossProfit + abs(overall.grossLoss)
        if grossAbs > 0, overall.totalCosts / grossAbs > 0.15 {
            result.append(CoachObservation(
                kind: .tradingCosts, severity: .watch, title: "Costs are a large share of results",
                finding: "Commission, swap and fees equal \(pct(overall.totalCosts / grossAbs)) of your gross traded P&L.",
                evidence: ["Total costs \(money(overall.totalCosts)) over \(overall.tradeCount) trades."],
                suggestion: "Fewer, higher-quality trades or holding fewer positions overnight would reduce costs.",
                sampleSize: overall.tradeCount))
        }

        // Frequency: busiest days versus median day.
        let perDayCounts = Dictionary(grouping: sorted) { calendar.startOfDay(for: $0.openTime) }.values.map(\.count).sorted()
        if perDayCounts.count >= 5 {
            let median = Double(perDayCounts[perDayCounts.count / 2])
            let busy = perDayCounts.filter { Double($0) >= max(median * 2, median + 4) }.count
            if busy >= 2 {
                result.append(CoachObservation(
                    kind: .tradeFrequency, severity: .info, title: "Unusually busy days",
                    finding: "On \(busy) day(s) you traded at least twice your median daily count.",
                    evidence: ["Median trades per active day: \(Int(median)). Busiest day: \(perDayCounts.last!) trades."],
                    suggestion: "Compare results on busy days with normal days to see whether extra trades add value.",
                    sampleSize: sorted.count))
            }
        }

        return result.sorted { $0.severity > $1.severity }
    }
}
