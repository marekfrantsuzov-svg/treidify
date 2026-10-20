import Foundation

/// A tradable or referenced market instrument.
///
/// XAUUSD and DXY are first-class; any other instrument can be described with the
/// same type so charts, bias and level analysis are reusable.
public struct Instrument: Hashable, Codable, Sendable, Identifiable {
    public let symbol: String
    public let displayName: String
    public let shortName: String
    /// Number of decimal places used when formatting prices.
    public let pricePrecision: Int

    public var id: String { symbol }

    public init(symbol: String, displayName: String, shortName: String, pricePrecision: Int) {
        self.symbol = symbol
        self.displayName = displayName
        self.shortName = shortName
        self.pricePrecision = pricePrecision
    }

    public static let xauusd = Instrument(symbol: "XAUUSD", displayName: "Gold / US Dollar", shortName: "Gold", pricePrecision: 2)
    public static let dxy = Instrument(symbol: "DXY", displayName: "US Dollar Index", shortName: "DXY", pricePrecision: 3)

    /// Instruments prioritised throughout the product.
    public static let primary: [Instrument] = [.xauusd, .dxy]

    public func format(_ price: Double) -> String {
        price.formatted(.number.precision(.fractionLength(pricePrecision)).grouping(.automatic))
    }
}

/// A point-in-time price snapshot.
public struct Quote: Hashable, Codable, Sendable {
    public let instrument: Instrument
    public let price: Double
    /// Reference price the change is measured against (previous session close).
    public let referencePrice: Double
    public let time: Date

    public init(instrument: Instrument, price: Double, referencePrice: Double, time: Date) {
        self.instrument = instrument
        self.price = price
        self.referencePrice = referencePrice
        self.time = time
    }

    public var change: Double { price - referencePrice }
    public var changePercent: Double { referencePrice == 0 ? 0 : change / referencePrice * 100 }
}
