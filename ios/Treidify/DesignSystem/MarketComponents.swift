import SwiftUI
import TreidifyCore

/// Round instrument mark: a gold coin for XAUUSD, a green dollar coin for DXY.
/// These identify instruments only; they are not the Treidify logo.
struct InstrumentIcon: View {
    let instrument: Instrument
    var size: CGFloat = 28

    var body: some View {
        let isGold = instrument == .xauusd
        let top = isGold ? Theme.gold : Theme.dollar
        let bottom = isGold ? Theme.goldDeep : Theme.dollarDeep
        ZStack {
            Circle().fill(LinearGradient(colors: [top, bottom], startPoint: .topLeading, endPoint: .bottomTrailing))
            Circle().strokeBorder(Color.white.opacity(0.35), lineWidth: 0.75)
            Image(systemName: isGold ? "crown.fill" : "dollarsign")
                .font(.system(size: size * 0.44, weight: .bold))
                .foregroundStyle(.white.opacity(0.95))
        }
        .frame(width: size, height: size)
        .shadow(color: top.opacity(0.35), radius: 4, y: 1)
        .accessibilityHidden(true)
    }
}

/// Compact row of timeframe chips. The selected chip is filled with the accent,
/// matching the reference design's highlighted "4H".
struct TimeframeChips: View {
    let options: [Timeframe]
    @Binding var selection: Timeframe

    @Environment(AppModel.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var namespace

    var body: some View {
        HStack(spacing: 4) {
            ForEach(options) { tf in
                let selected = tf == selection
                Button {
                    guard tf != selection else { return }
                    app.feedback.play(.filterSelect)
                    withAnimation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.82)) { selection = tf }
                } label: {
                    Text(tf.rawValue)
                        .font(.footnote.weight(selected ? .bold : .medium).monospacedDigit())
                        .foregroundStyle(selected ? Color.white : Theme.textSecondary)
                        .frame(maxWidth: .infinity, minHeight: 32)
                        .background {
                            if selected {
                                RoundedRectangle(cornerRadius: Radius.chip, style: .continuous)
                                    .fill(Theme.accent)
                                    .shadow(color: Theme.accent.opacity(0.35), radius: 6, y: 2)
                                    .matchedGeometryEffect(id: "tf", in: namespace)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tf.accessibilityName)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(3)
        .background(Theme.surfaceInset, in: RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Timeframe")
    }
}

/// Bias as an icon plus word, e.g. "↘ Bearish".
struct BiasLabel: View {
    let bias: MarketBias

    var body: some View {
        Label(bias == .insufficientData ? "No data" : bias.label, systemImage: bias.trendSymbol)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(bias.color)
            .labelStyle(.titleAndIcon)
            .accessibilityLabel("Bias \(bias.label)")
    }
}

/// One timeframe's bias as a small tile: "4H" over "Bearish", tinted by bias.
struct BiasTile: View {
    let timeframe: Timeframe
    let bias: MarketBias

    var body: some View {
        VStack(spacing: 2) {
            Text(timeframe.rawValue)
                .font(.caption2.weight(.bold))
                .foregroundStyle(bias == .insufficientData ? Theme.textTertiary : bias.color)
            Text(bias == .insufficientData ? "—" : bias.label)
                .font(.caption2.weight(.medium))
                .foregroundStyle(Theme.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, minHeight: 40)
        .background(bias.color.opacity(bias == .insufficientData ? 0.06 : 0.14),
                    in: RoundedRectangle(cornerRadius: Radius.chip, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(timeframe.accessibilityName): \(bias.label)")
    }
}

/// Importance of a calendar event: "High" in red, "Medium" in amber.
struct ImportancePill: View {
    let importance: EventImportance

    private var tone: Color {
        switch importance {
        case .high: Theme.bearish
        case .medium: Theme.warning
        case .low: Theme.neutral
        }
    }

    var body: some View {
        Text(importance.label)
            .font(.caption2.weight(.bold))
            .foregroundStyle(tone)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tone.opacity(0.14), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
            .accessibilityLabel("\(importance.label) impact")
    }
}

/// Flag emoji for a currency code. Falls back to the code itself.
enum CurrencyFlag {
    static func emoji(for currency: String) -> String? {
        let map = ["USD": "🇺🇸", "EUR": "🇪🇺", "GBP": "🇬🇧", "JPY": "🇯🇵", "CNY": "🇨🇳", "CHF": "🇨🇭",
                   "CAD": "🇨🇦", "AUD": "🇦🇺", "NZD": "🇳🇿"]
        return map[currency.uppercased()]
    }
}

/// Circular glass button used in headers (profile, settings, close).
struct GlassIconButton: View {
    let systemImage: String
    let accessibilityLabel: String
    var size: CGFloat = 40
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: size * 0.42, weight: .medium))
                .foregroundStyle(Theme.textSecondary)
                .frame(width: size, height: size)
                .background(.ultraThinMaterial, in: Circle())
                .overlay { Circle().strokeBorder(Theme.hairline, lineWidth: 0.5) }
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Circle())
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityLabel(accessibilityLabel)
    }
}

extension MarketBias {
    /// Trend arrows as in the reference ("↗ Bullish", "↘ Bearish").
    var trendSymbol: String {
        switch self {
        case .bullish: "chart.line.uptrend.xyaxis"
        case .bearish: "chart.line.downtrend.xyaxis"
        case .neutral: "arrow.left.and.right"
        case .insufficientData: "questionmark"
        }
    }
}
