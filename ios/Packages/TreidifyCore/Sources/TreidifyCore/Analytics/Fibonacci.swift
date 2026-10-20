import Foundation

public struct FibonacciRetracement: Equatable, Sendable {
    public enum Direction: String, Sendable {
        /// Leg ran from a swing low up to a later swing high.
        case up
        /// Leg ran from a swing high down to a later swing low.
        case down
    }

    public struct Level: Equatable, Sendable, Identifiable {
        public let ratio: Double
        public let price: Double
        public var id: Double { ratio }
        public var label: String { ratio.formatted(.percent.precision(.fractionLength(1))) }
    }

    public let direction: Direction
    public let swingHigh: SwingPoint
    public let swingLow: SwingPoint
    public let levels: [Level]

    public static let ratios: [Double] = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

    /// Retracement of the most recent completed leg between the latest confirmed
    /// swing high and swing low. For an up leg, level(r) = high − (high − low)·r;
    /// for a down leg, level(r) = low + (high − low)·r.
    public static func latestLeg(in candles: [Candle], swingStrength: Int = 2) -> FibonacciRetracement? {
        let swings = SwingDetector.detect(candles, strength: swingStrength)
        guard let high = swings.last(where: { $0.kind == .high }),
              let low = swings.last(where: { $0.kind == .low }),
              high.price > low.price
        else { return nil }
        let direction: Direction = low.index < high.index ? .up : .down
        let range = high.price - low.price
        let levels = ratios.map { r in
            Level(ratio: r, price: direction == .up ? high.price - range * r : low.price + range * r)
        }
        return FibonacciRetracement(direction: direction, swingHigh: high, swingLow: low, levels: levels)
    }
}
