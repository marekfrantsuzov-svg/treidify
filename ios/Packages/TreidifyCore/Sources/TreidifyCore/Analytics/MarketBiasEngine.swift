import Foundation

public enum MarketBias: String, Codable, Sendable, CaseIterable {
    case bullish
    case bearish
    case neutral
    case insufficientData

    public var label: String {
        switch self {
        case .bullish: "Bullish"
        case .bearish: "Bearish"
        case .neutral: "Neutral"
        case .insufficientData: "Insufficient data"
        }
    }

    public var isDirectional: Bool { self == .bullish || self == .bearish }
}

public enum StructureState: String, Codable, Sendable {
    case higherHighsHigherLows
    case lowerHighsLowerLows
    case mixed

    public var label: String {
        switch self {
        case .higherHighsHigherLows: "Higher highs and higher lows"
        case .lowerHighsLowerLows: "Lower highs and lower lows"
        case .mixed: "Mixed structure"
        }
    }
}

public struct BiasEvidence: Equatable, Sendable {
    public let previousSwingHigh: SwingPoint
    public let latestSwingHigh: SwingPoint
    public let previousSwingLow: SwingPoint
    public let latestSwingLow: SwingPoint
    public let structure: StructureState
    public let ema: Double
    public let emaPeriod: Int
    public let close: Double
}

/// The reproducible output of `MarketBiasEngine`. `rationale` lists each step of
/// the calculation in plain language so AI explanations can cite it verbatim.
public struct BiasResult: Equatable, Sendable {
    public let timeframe: Timeframe
    public let bias: MarketBias
    public let evidence: BiasEvidence?
    public let rationale: [String]
    /// Closing beyond this price invalidates the current classification.
    public let invalidationLevel: Double?
    public let invalidationDescription: String?
    public let candleCount: Int
    public let asOf: Date?
}

/// Technical market-structure bias. Version 1 algorithm (documented in
/// docs/ANALYTICS.md and mirrored in backend/treidify_backend/analytics/bias.py):
///
/// 1. Require at least `minimumCandles` bars, else `insufficientData`.
/// 2. Detect confirmed fractal swings (`SwingDetector`, strength `swingStrength`).
///    Require at least two swing highs and two swing lows, else `insufficientData`.
/// 3. Compare the latest two swing highs (H1 older, H2 newer) and lows (L1, L2):
///    H2 > H1 and L2 > L1 → higher highs / higher lows;
///    H2 < H1 and L2 < L1 → lower highs / lower lows; anything else → mixed.
/// 4. Compute EMA(`emaPeriod`) of closes; take the last close C.
/// 5. Bullish when HH/HL and C > EMA and C > L2.
///    Bearish when LH/LL and C < EMA and C < H2. Otherwise neutral.
/// 6. Invalidation: bullish → a close below L2; bearish → a close above H2.
public struct MarketBiasEngine: Sendable {
    public struct Configuration: Sendable, Equatable {
        public var swingStrength: Int
        public var emaPeriod: Int
        public var minimumCandles: Int

        public init(swingStrength: Int = 2, emaPeriod: Int = 50, minimumCandles: Int = 60) {
            self.swingStrength = swingStrength
            self.emaPeriod = emaPeriod
            self.minimumCandles = minimumCandles
        }
    }

    public static let algorithmVersion = "structure-ema-v1"

    public let configuration: Configuration

    public init(configuration: Configuration = Configuration()) {
        self.configuration = configuration
    }

    public func evaluate(_ candles: [Candle], timeframe: Timeframe) -> BiasResult {
        let cfg = configuration
        let asOf = candles.last?.time

        func insufficient(_ reason: String) -> BiasResult {
            BiasResult(timeframe: timeframe, bias: .insufficientData, evidence: nil, rationale: [reason],
                       invalidationLevel: nil, invalidationDescription: nil, candleCount: candles.count, asOf: asOf)
        }

        guard candles.count >= max(cfg.minimumCandles, cfg.emaPeriod) else {
            return insufficient("Only \(candles.count) \(timeframe.rawValue) candles available; at least \(max(cfg.minimumCandles, cfg.emaPeriod)) are required.")
        }

        let swings = SwingDetector.detect(candles, strength: cfg.swingStrength)
        let highs = swings.filter { $0.kind == .high }
        let lows = swings.filter { $0.kind == .low }
        guard highs.count >= 2, lows.count >= 2 else {
            return insufficient("Fewer than two confirmed swing highs and lows on \(timeframe.rawValue).")
        }

        let h1 = highs[highs.count - 2], h2 = highs[highs.count - 1]
        let l1 = lows[lows.count - 2], l2 = lows[lows.count - 1]

        let structure: StructureState
        if h2.price > h1.price && l2.price > l1.price {
            structure = .higherHighsHigherLows
        } else if h2.price < h1.price && l2.price < l1.price {
            structure = .lowerHighsLowerLows
        } else {
            structure = .mixed
        }

        guard let ema = Indicators.ema(candles.map(\.close), period: cfg.emaPeriod).last ?? nil else {
            return insufficient("EMA(\(cfg.emaPeriod)) could not be computed.")
        }
        let close = candles[candles.count - 1].close

        let bias: MarketBias
        switch structure {
        case .higherHighsHigherLows where close > ema && close > l2.price: bias = .bullish
        case .lowerHighsLowerLows where close < ema && close < h2.price: bias = .bearish
        default: bias = .neutral
        }

        let evidence = BiasEvidence(previousSwingHigh: h1, latestSwingHigh: h2, previousSwingLow: l1,
                                    latestSwingLow: l2, structure: structure, ema: ema,
                                    emaPeriod: cfg.emaPeriod, close: close)

        let f = { (v: Double) in v.formatted(.number.precision(.fractionLength(2...5)).grouping(.never)) }
        var rationale = [
            "Swing highs: \(f(h1.price)) then \(f(h2.price)). Swing lows: \(f(l1.price)) then \(f(l2.price)).",
            "Structure: \(structure.label.lowercased()).",
            "Last close \(f(close)) is \(close > ema ? "above" : close < ema ? "below" : "at") EMA(\(cfg.emaPeriod)) \(f(ema))."
        ]

        let invalidationLevel: Double?
        let invalidationDescription: String?
        switch bias {
        case .bullish:
            invalidationLevel = l2.price
            invalidationDescription = "A \(timeframe.rawValue) close below the latest higher low at \(f(l2.price)) would invalidate the bullish structure."
            rationale.append("Classification: bullish, because structure is rising and price holds above both the EMA and the latest swing low.")
        case .bearish:
            invalidationLevel = h2.price
            invalidationDescription = "A \(timeframe.rawValue) close above the latest lower high at \(f(h2.price)) would invalidate the bearish structure."
            rationale.append("Classification: bearish, because structure is falling and price holds below both the EMA and the latest swing high.")
        case .neutral, .insufficientData:
            invalidationLevel = nil
            invalidationDescription = "Neutral until structure and the EMA agree: a close above \(f(h2.price)) or below \(f(l2.price)) would be the next structural signal."
            rationale.append("Classification: neutral, because structure and the EMA do not agree.")
        }

        return BiasResult(timeframe: timeframe, bias: bias, evidence: evidence, rationale: rationale,
                          invalidationLevel: invalidationLevel, invalidationDescription: invalidationDescription,
                          candleCount: candles.count, asOf: asOf)
    }
}
