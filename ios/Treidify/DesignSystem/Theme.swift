import SwiftUI
import UIKit
import TreidifyCore

/// Treidify colour tokens. Every token is defined separately for light and dark
/// appearance (the two modes are designed, not inverted). Text tokens meet
/// WCAG AA contrast (≥ 4.5:1) against their own mode's background.
enum Theme {
    // MARK: Backgrounds
    static let backgroundTop = Color(light: Color(hex: 0xF4F7FC), dark: Color(hex: 0x0A1020))
    static let backgroundBottom = Color(light: Color(hex: 0xE6ECF5), dark: Color(hex: 0x03050A))
    static let ambientGlow = Color(light: Color(hex: 0xB9CCEA).opacity(0.45), dark: Color(hex: 0x3A5A8C).opacity(0.22))
    static let ambientGlowSecondary = Color(light: Color(hex: 0xD9E3F2).opacity(0.55), dark: Color(hex: 0x1A2740).opacity(0.35))

    // MARK: Surfaces
    /// Tint layered over the system material to give the "smoked" (dark) or
    /// "ice" (light) glass character.
    static let surfaceTint = Color(light: Color.white.opacity(0.62), dark: Color(hex: 0x0C1322).opacity(0.62))
    /// Used instead of material when Reduce Transparency is on.
    static let surfaceOpaque = Color(light: Color(hex: 0xFFFFFF), dark: Color(hex: 0x0E1524))
    static let surfaceInset = Color(light: Color(hex: 0x0A1F44).opacity(0.04), dark: Color.white.opacity(0.05))
    static let hairline = Color(light: Color(hex: 0x0A1F44).opacity(0.09), dark: Color.white.opacity(0.09))
    /// Top-edge reflection on glass surfaces.
    static let reflection = Color(light: Color.white.opacity(0.95), dark: Color.white.opacity(0.20))
    static let shadow = Color(light: Color(hex: 0x1B3A6B).opacity(0.10), dark: Color.black.opacity(0.50))

    // MARK: Text
    static let textPrimary = Color(light: Color(hex: 0x0A1426), dark: Color(hex: 0xF2F6FC))
    static let textSecondary = Color(light: Color(hex: 0x3F4D66), dark: Color(hex: 0xB0BDD3))
    static let textTertiary = Color(light: Color(hex: 0x5B6880), dark: Color(hex: 0x8291AB))

    // MARK: Semantic
    static let accent = Color(light: Color(hex: 0x1F6BF0), dark: Color(hex: 0x3B82FF))
    static let accentSoft = Color(light: Color(hex: 0x1F6BF0).opacity(0.10), dark: Color(hex: 0x3B82FF).opacity(0.18))
    static let silver = Color(light: Color(hex: 0x8A97AD), dark: Color(hex: 0xC7D0DD))
    static let bullish = Color(light: Color(hex: 0x0E8F4E), dark: Color(hex: 0x2FD27A))
    static let bearish = Color(light: Color(hex: 0xD12F3C), dark: Color(hex: 0xFF5A66))
    static let neutral = Color(light: Color(hex: 0x5B6880), dark: Color(hex: 0x9AA8BF))
    static let warning = Color(light: Color(hex: 0x9A5B00), dark: Color(hex: 0xFFC14D))

    // MARK: Instruments
    /// Instrument marks (not the Treidify logo): a gold coin for XAUUSD and a
    /// green dollar coin for DXY.
    static let gold = Color(light: Color(hex: 0xC9921E), dark: Color(hex: 0xE7B04A))
    static let goldDeep = Color(light: Color(hex: 0x9A6A0E), dark: Color(hex: 0xB07A1C))
    static let dollar = Color(light: Color(hex: 0x14935A), dark: Color(hex: 0x2FBF71))
    static let dollarDeep = Color(light: Color(hex: 0x0B6B40), dark: Color(hex: 0x17804A))
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: opacity)
    }

    /// A colour that resolves per appearance (and follows `preferredColorScheme`).
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
        })
    }
}

enum Spacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let s: CGFloat = 12
    static let m: CGFloat = 16
    static let l: CGFloat = 20
    static let xl: CGFloat = 28
    static let screenHorizontal: CGFloat = 16
}

enum Radius {
    static let card: CGFloat = 26
    static let inner: CGFloat = 16
    static let chip: CGFloat = 10
    static let control: CGFloat = 12
}

extension Font {
    // All styles are Dynamic Type text styles, so they scale with the user's setting.
    static let tdDisplay = Font.system(.largeTitle, design: .default, weight: .bold)
    static let tdTitle = Font.system(.title2, design: .default, weight: .semibold)
    static let tdSectionTitle = Font.system(.headline, design: .default, weight: .semibold)
    static let tdBody = Font.system(.body)
    static let tdCallout = Font.system(.callout)
    static let tdFootnote = Font.system(.footnote)
    static let tdCaption = Font.system(.caption, design: .default, weight: .medium)
    static let tdHeroNumber = Font.system(.largeTitle, design: .rounded, weight: .semibold).monospacedDigit()
    static let tdNumericLarge = Font.system(.title2, design: .rounded, weight: .semibold).monospacedDigit()
    static let tdNumeric = Font.system(.body, design: .rounded, weight: .semibold).monospacedDigit()
    static let tdNumericSmall = Font.system(.footnote, design: .rounded, weight: .medium).monospacedDigit()
}

extension MarketBias {
    var color: Color {
        switch self {
        case .bullish: Theme.bullish
        case .bearish: Theme.bearish
        case .neutral: Theme.neutral
        case .insufficientData: Theme.textTertiary
        }
    }

    var symbolName: String {
        switch self {
        case .bullish: "arrow.up.right"
        case .bearish: "arrow.down.right"
        case .neutral: "arrow.right"
        case .insufficientData: "questionmark"
        }
    }
}

extension ImpactDirection {
    var color: Color {
        switch self {
        case .bullish: Theme.bullish
        case .bearish: Theme.bearish
        case .mixed: Theme.warning
        case .uncertain: Theme.neutral
        }
    }
}

extension DataFreshness {
    var color: Color {
        switch self {
        case .live: Theme.bullish
        case .delayed, .marketClosed: Theme.warning
        case .loading: Theme.textTertiary
        case .stale, .unavailable, .error: Theme.bearish
        }
    }
}
