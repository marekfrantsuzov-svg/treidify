import Foundation

public struct PriceZone: Hashable, Sendable, Identifiable {
    public enum Kind: String, Sendable, CaseIterable {
        case support
        case resistance
        /// Clustered, still-unswept swing highs above price.
        case buySideLiquidity
        /// Clustered, still-unswept swing lows below price.
        case sellSideLiquidity

        public var label: String {
            switch self {
            case .support: "Support"
            case .resistance: "Resistance"
            case .buySideLiquidity: "Buy-side liquidity"
            case .sellSideLiquidity: "Sell-side liquidity"
            }
        }
    }

    public let kind: Kind
    public let lower: Double
    public let upper: Double
    /// Number of swing points that formed the zone (its sample size).
    public let touches: Int
    public let lastTouch: Date

    public var id: String { "\(kind.rawValue)-\(lower)-\(upper)" }
    public var mid: Double { (lower + upper) / 2 }
}

public struct LevelAnalysis: Sendable, Equatable {
    public let zones: [PriceZone]
    public let atr: Double?
    public let referencePrice: Double?
    /// Set when no zones could be computed, explaining why.
    public let unavailableReason: String?

    public func zones(of kind: PriceZone.Kind) -> [PriceZone] { zones.filter { $0.kind == kind } }
}

/// Conditional support/resistance and liquidity zones from swing clustering.
///
/// 1. Detect confirmed swings and ATR(14) at the last bar.
/// 2. Sort swing prices and cluster greedily: a price joins the current cluster
///    when it lies within `clusterToleranceATR × ATR` of the cluster's first price.
/// 3. Clusters with at least `minTouches` swings become zones spanning their
///    min…max price. Zones whose midpoint is at or below the last close are
///    support; above are resistance. The nearest `maxZonesPerSide` are kept.
/// 4. Liquidity uses swing highs (or lows) only with the tighter
///    `liquidityToleranceATR`, and keeps a cluster only while no later bar has
///    traded through it ("unswept").
public struct LevelDetector: Sendable {
    public struct Configuration: Sendable, Equatable {
        public var swingStrength = 2
        public var atrPeriod = 14
        public var clusterToleranceATR = 0.5
        public var liquidityToleranceATR = 0.15
        public var minTouches = 2
        public var maxZonesPerSide = 3
        public var minimumCandles = 50

        public init() {}
    }

    public let configuration: Configuration

    public init(configuration: Configuration = Configuration()) {
        self.configuration = configuration
    }

    public func analyze(_ candles: [Candle]) -> LevelAnalysis {
        let cfg = configuration
        guard candles.count >= cfg.minimumCandles, let close = candles.last?.close else {
            return LevelAnalysis(zones: [], atr: nil, referencePrice: candles.last?.close,
                                 unavailableReason: "At least \(cfg.minimumCandles) candles are required for level analysis.")
        }
        guard let atr = Indicators.atr(candles, period: cfg.atrPeriod).last ?? nil, atr > 0 else {
            return LevelAnalysis(zones: [], atr: nil, referencePrice: close, unavailableReason: "ATR could not be computed.")
        }
        let swings = SwingDetector.detect(candles, strength: cfg.swingStrength)

        var zones: [PriceZone] = []

        // Support / resistance from all swings.
        let srClusters = Self.cluster(swings, tolerance: cfg.clusterToleranceATR * atr)
            .filter { $0.count >= cfg.minTouches }
        let srZones = srClusters.map { cluster -> PriceZone in
            let prices = cluster.map(\.price)
            let lower = prices.min()!, upper = prices.max()!
            let kind: PriceZone.Kind = (lower + upper) / 2 <= close ? .support : .resistance
            return PriceZone(kind: kind, lower: lower, upper: upper, touches: cluster.count,
                             lastTouch: cluster.map(\.time).max()!)
        }
        zones += Self.nearest(srZones.filter { $0.kind == .support }, to: close, limit: cfg.maxZonesPerSide)
        zones += Self.nearest(srZones.filter { $0.kind == .resistance }, to: close, limit: cfg.maxZonesPerSide)

        // Liquidity from equal highs above / equal lows below that remain unswept.
        let liqTolerance = cfg.liquidityToleranceATR * atr
        let highClusters = Self.cluster(swings.filter { $0.kind == .high }, tolerance: liqTolerance)
            .filter { $0.count >= cfg.minTouches }
        let buySide = highClusters.compactMap { cluster -> PriceZone? in
            let upper = cluster.map(\.price).max()!, lower = cluster.map(\.price).min()!
            let lastIndex = cluster.map(\.index).max()!
            guard upper > close else { return nil }
            let swept = candles[(lastIndex + 1)...].contains { $0.high > upper }
            guard !swept else { return nil }
            return PriceZone(kind: .buySideLiquidity, lower: lower, upper: upper, touches: cluster.count,
                             lastTouch: cluster.map(\.time).max()!)
        }
        let lowClusters = Self.cluster(swings.filter { $0.kind == .low }, tolerance: liqTolerance)
            .filter { $0.count >= cfg.minTouches }
        let sellSide = lowClusters.compactMap { cluster -> PriceZone? in
            let upper = cluster.map(\.price).max()!, lower = cluster.map(\.price).min()!
            let lastIndex = cluster.map(\.index).max()!
            guard lower < close else { return nil }
            let swept = candles[(lastIndex + 1)...].contains { $0.low < lower }
            guard !swept else { return nil }
            return PriceZone(kind: .sellSideLiquidity, lower: lower, upper: upper, touches: cluster.count,
                             lastTouch: cluster.map(\.time).max()!)
        }
        zones += Self.nearest(buySide, to: close, limit: cfg.maxZonesPerSide)
        zones += Self.nearest(sellSide, to: close, limit: cfg.maxZonesPerSide)

        return LevelAnalysis(zones: zones, atr: atr, referencePrice: close,
                             unavailableReason: zones.isEmpty ? "No price level was touched by enough swings to qualify." : nil)
    }

    static func cluster(_ swings: [SwingPoint], tolerance: Double) -> [[SwingPoint]] {
        let sorted = swings.sorted { $0.price < $1.price }
        var clusters: [[SwingPoint]] = []
        for swing in sorted {
            if let anchor = clusters.last?.first, swing.price - anchor.price <= tolerance {
                clusters[clusters.count - 1].append(swing)
            } else {
                clusters.append([swing])
            }
        }
        return clusters
    }

    static func nearest(_ zones: [PriceZone], to price: Double, limit: Int) -> [PriceZone] {
        Array(zones.sorted { abs($0.mid - price) < abs($1.mid - price) }.prefix(limit))
    }
}
