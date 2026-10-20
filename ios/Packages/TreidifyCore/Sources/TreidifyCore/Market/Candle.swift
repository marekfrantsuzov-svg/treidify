import Foundation

/// Chart timeframes supported by Treidify.
public enum Timeframe: String, CaseIterable, Codable, Sendable, Identifiable {
    case m5 = "5M"
    case m15 = "15M"
    case h1 = "1H"
    case h4 = "4H"
    case d1 = "1D"

    public var id: String { rawValue }

    public var seconds: TimeInterval {
        switch self {
        case .m5: 300
        case .m15: 900
        case .h1: 3_600
        case .h4: 14_400
        case .d1: 86_400
        }
    }

    public var accessibilityName: String {
        switch self {
        case .m5: "5 minute"
        case .m15: "15 minute"
        case .h1: "1 hour"
        case .h4: "4 hour"
        case .d1: "1 day"
        }
    }

    /// Timeframes shown in the market-bias matrix, highest first.
    public static let biasTimeframes: [Timeframe] = [.h4, .h1, .m15, .m5]
}

/// One OHLC bar. `time` is the bar's open time.
public struct Candle: Hashable, Codable, Sendable, Identifiable {
    public let time: Date
    public let open: Double
    public let high: Double
    public let low: Double
    public let close: Double
    public let volume: Double?

    public var id: Date { time }

    public init(time: Date, open: Double, high: Double, low: Double, close: Double, volume: Double? = nil) {
        self.time = time
        self.open = open
        self.high = high
        self.low = low
        self.close = close
        self.volume = volume
    }

    /// Returns nil when the bar is internally inconsistent. Provider adapters must
    /// drop invalid bars rather than "repair" them.
    public init?(validatingTime time: Date, open: Double, high: Double, low: Double, close: Double, volume: Double? = nil) {
        let values = [open, high, low, close]
        guard values.allSatisfy({ $0.isFinite && $0 > 0 }),
              high >= max(open, close), low <= min(open, close), high >= low
        else { return nil }
        self.init(time: time, open: open, high: high, low: low, close: close, volume: volume)
    }

    public var isBullish: Bool { close >= open }
    public var range: Double { high - low }
}

public enum CandleAggregator {
    /// Aggregates lower-timeframe candles into `timeframe` buckets aligned to the
    /// Unix epoch (UTC). Input must be sorted ascending by time.
    public static func aggregate(_ candles: [Candle], into timeframe: Timeframe) -> [Candle] {
        var result: [Candle] = []
        var bucketStart: TimeInterval?
        var open = 0.0, high = 0.0, low = 0.0, close = 0.0, volume: Double? = nil

        func flush() {
            guard let start = bucketStart else { return }
            result.append(Candle(time: Date(timeIntervalSince1970: start), open: open, high: high, low: low, close: close, volume: volume))
        }

        for candle in candles {
            let t = candle.time.timeIntervalSince1970
            let start = (t / timeframe.seconds).rounded(.down) * timeframe.seconds
            if start != bucketStart {
                flush()
                bucketStart = start
                open = candle.open
                high = candle.high
                low = candle.low
                volume = candle.volume
            } else {
                high = max(high, candle.high)
                low = min(low, candle.low)
                if let v = candle.volume { volume = (volume ?? 0) + v }
            }
            close = candle.close
        }
        flush()
        return result
    }
}
