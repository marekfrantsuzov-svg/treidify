import Foundation
import TreidifyCore

/// Number formatting shared by views and view models (Foundation-only).
enum Formatters {
    static func price(_ value: Double, for instrument: Instrument) -> String {
        instrument.format(value)
    }

    static func signed(_ value: Double, precision: Int = 2) -> String {
        value.formatted(.number.precision(.fractionLength(precision)).sign(strategy: .always(includingZero: false)))
    }

    static func signedPercent(_ value: Double) -> String {
        (value / 100).formatted(.percent.precision(.fractionLength(2)).sign(strategy: .always(includingZero: false)))
    }

    static func percent(_ fraction: Double?, digits: Int = 1) -> String {
        guard let fraction else { return "—" }
        return fraction.formatted(.percent.precision(.fractionLength(digits)))
    }

    static func money(_ value: Double?, currency: String, signed: Bool = false) -> String {
        guard let value else { return "—" }
        let style = FloatingPointFormatStyle<Double>.Currency(code: currency).precision(.fractionLength(2))
        return signed ? value.formatted(style.sign(strategy: .always(showZero: false))) : value.formatted(style)
    }

    static func decimal(_ value: Double?, digits: Int = 2) -> String {
        guard let value else { return "—" }
        return value.formatted(.number.precision(.fractionLength(digits)))
    }
}
