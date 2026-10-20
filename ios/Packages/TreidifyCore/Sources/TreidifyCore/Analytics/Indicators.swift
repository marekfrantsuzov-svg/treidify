import Foundation

/// Deterministic technical indicators. Each function documents its exact formula
/// so results can be reproduced by the backend (see backend/treidify_backend/analytics).
public enum Indicators {
    /// Exponential moving average.
    ///
    /// Seeded with the simple average of the first `period` values; afterwards
    /// `ema[i] = value[i] * k + ema[i-1] * (1 - k)` with `k = 2 / (period + 1)`.
    /// Indices before the seed are nil.
    public static func ema(_ values: [Double], period: Int) -> [Double?] {
        precondition(period > 0)
        var result = [Double?](repeating: nil, count: values.count)
        guard values.count >= period else { return result }
        let k = 2.0 / Double(period + 1)
        var current = values[0..<period].reduce(0, +) / Double(period)
        result[period - 1] = current
        for i in period..<values.count {
            current = values[i] * k + current * (1 - k)
            result[i] = current
        }
        return result
    }

    /// True range: max(high - low, |high - prevClose|, |low - prevClose|).
    /// The first bar uses high - low.
    public static func trueRanges(_ candles: [Candle]) -> [Double] {
        candles.indices.map { i in
            let c = candles[i]
            guard i > 0 else { return c.high - c.low }
            let prev = candles[i - 1].close
            return max(c.high - c.low, abs(c.high - prev), abs(c.low - prev))
        }
    }

    /// Average true range using Wilder smoothing.
    ///
    /// Seeded with the simple average of the first `period` true ranges, then
    /// `atr[i] = (atr[i-1] * (period - 1) + tr[i]) / period`.
    public static func atr(_ candles: [Candle], period: Int = 14) -> [Double?] {
        precondition(period > 0)
        let tr = trueRanges(candles)
        var result = [Double?](repeating: nil, count: tr.count)
        guard tr.count >= period else { return result }
        var current = tr[0..<period].reduce(0, +) / Double(period)
        result[period - 1] = current
        for i in period..<tr.count {
            current = (current * Double(period - 1) + tr[i]) / Double(period)
            result[i] = current
        }
        return result
    }
}
