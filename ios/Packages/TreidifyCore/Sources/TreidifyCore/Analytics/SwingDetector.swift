import Foundation

public struct SwingPoint: Hashable, Sendable, Codable {
    public enum Kind: String, Codable, Sendable { case high, low }

    public let kind: Kind
    public let index: Int
    public let time: Date
    public let price: Double

    public init(kind: Kind, index: Int, time: Date, price: Double) {
        self.kind = kind
        self.index = index
        self.time = time
        self.price = price
    }
}

/// Fractal swing detection.
///
/// A bar `i` is a swing high when its high is strictly greater than the highs of
/// the `strength` bars before it and greater than or equal to the highs of the
/// `strength` bars after it (the mirror rule applies to swing lows). Only
/// confirmed swings are returned: the last `strength` bars can never be swings,
/// so results never repaint.
public enum SwingDetector {
    public static func detect(_ candles: [Candle], strength: Int = 2) -> [SwingPoint] {
        precondition(strength > 0)
        guard candles.count >= strength * 2 + 1 else { return [] }
        var swings: [SwingPoint] = []
        for i in strength..<(candles.count - strength) {
            let c = candles[i]
            let left = candles[(i - strength)..<i]
            let right = candles[(i + 1)...(i + strength)]
            if left.allSatisfy({ c.high > $0.high }) && right.allSatisfy({ c.high >= $0.high }) {
                swings.append(SwingPoint(kind: .high, index: i, time: c.time, price: c.high))
            }
            if left.allSatisfy({ c.low < $0.low }) && right.allSatisfy({ c.low <= $0.low }) {
                swings.append(SwingPoint(kind: .low, index: i, time: c.time, price: c.low))
            }
        }
        return swings
    }
}
