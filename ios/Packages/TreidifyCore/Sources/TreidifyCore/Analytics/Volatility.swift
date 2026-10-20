import Foundation

public enum VolatilityRegime: String, Sendable, Equatable {
    case low
    case normal
    case elevated
    case insufficientData

    public var label: String {
        switch self {
        case .low: "Low"
        case .normal: "Normal"
        case .elevated: "Elevated"
        case .insufficientData: "Insufficient data"
        }
    }
}

public struct VolatilityAnalysis: Equatable, Sendable {
    public let atr: Double?
    /// ATR as a percentage of the last close.
    public let atrPercent: Double?
    /// Percentile (0–100) of the current ATR within the lookback window.
    public let percentile: Double?
    public let regime: VolatilityRegime
    public let sampleSize: Int

    /// Regime from the percentile of the current ATR(`atrPeriod`) among the last
    /// `lookback` ATR values: below 25 → low, above 75 → elevated, else normal.
    public static func analyze(_ candles: [Candle], atrPeriod: Int = 14, lookback: Int = 100) -> VolatilityAnalysis {
        let atrSeries = Indicators.atr(candles, period: atrPeriod).compactMap { $0 }
        guard atrSeries.count >= lookback, let current = atrSeries.last, let close = candles.last?.close else {
            return VolatilityAnalysis(atr: atrSeries.last, atrPercent: nil, percentile: nil,
                                      regime: .insufficientData, sampleSize: atrSeries.count)
        }
        let window = atrSeries.suffix(lookback)
        let below = window.filter { $0 < current }.count
        let percentile = Double(below) / Double(window.count) * 100
        let regime: VolatilityRegime = percentile < 25 ? .low : percentile > 75 ? .elevated : .normal
        return VolatilityAnalysis(atr: current, atrPercent: current / close * 100, percentile: percentile,
                                  regime: regime, sampleSize: window.count)
    }
}
