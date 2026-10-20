import SwiftUI
import TreidifyCore

/// Visible label for generated data. Required wherever `DataSource.isDemo` is true.
struct DemoBadge: View {
    var body: some View {
        Text("DEMO")
            .font(.caption2.weight(.bold))
            .tracking(0.6)
            .foregroundStyle(Theme.warning)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Theme.warning.opacity(0.14), in: Capsule())
            .accessibilityLabel("Demo data")
    }
}

/// Data state + provenance, shown on every live-data component.
struct FreshnessBadge: View {
    let freshness: DataFreshness
    var source: DataSource?
    var asOf: Date?

    var body: some View {
        HStack(spacing: 6) {
            if source?.isDemo == true { DemoBadge() }
            HStack(spacing: 4) {
                if freshness == .loading {
                    ProgressView().controlSize(.mini)
                } else {
                    Circle().fill(freshness.color).frame(width: 6, height: 6)
                }
                // Demo fixtures are never labelled "Live".
                Text(source?.isDemo == true && freshness == .live ? "Simulated" : freshness.label)
            }
            .font(.caption2.weight(.semibold))
            .foregroundStyle(Theme.textSecondary)
            if let asOf, freshness.isUsable {
                Text(asOf, style: .time)
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Footer line naming the provider and update time.
struct SourceFootnote: View {
    let source: DataSource?
    var asOf: Date?

    var body: some View {
        if let source {
            HStack(spacing: 4) {
                Image(systemName: source.isDemo ? "flask" : "antenna.radiowaves.left.and.right")
                    .imageScale(.small)
                Text(source.name)
                if let asOf {
                    Text("·")
                    Text(asOf, format: .dateTime.hour().minute())
                }
            }
            .font(.caption2)
            .foregroundStyle(Theme.textTertiary)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Source \(source.name)")
        }
    }
}

struct DemoModeBanner: View {
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
            DemoBadge()
            Text("Demo mode. Prices, news, calendar and account figures are generated samples, not live data.")
                .font(.footnote)
                .foregroundStyle(Theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.s)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.warning.opacity(0.08), in: RoundedRectangle(cornerRadius: Radius.inner, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.inner, style: .continuous).strokeBorder(Theme.warning.opacity(0.25), lineWidth: 0.5)
        }
        .accessibilityElement(children: .combine)
    }
}

struct SectionHeader<Trailing: View>: View {
    let title: String
    var subtitle: String?
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.tdSectionTitle)
                    .foregroundStyle(Theme.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                if let subtitle {
                    Text(subtitle)
                        .font(.tdFootnote)
                        .foregroundStyle(Theme.textTertiary)
                }
            }
            Spacer(minLength: Spacing.xs)
            trailing
        }
    }
}

extension SectionHeader where Trailing == EmptyView {
    init(title: String, subtitle: String? = nil) {
        self.init(title: title, subtitle: subtitle) { EmptyView() }
    }
}

struct MetricTile: View {
    let title: String
    let value: String
    var detail: String?
    var tone: Color = Theme.textPrimary

    var body: some View {
        InsetSurface {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.tdCaption)
                    .foregroundStyle(Theme.textTertiary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Text(value)
                    .font(.tdNumeric)
                    .foregroundStyle(tone)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                if let detail {
                    Text(detail)
                        .font(.caption2)
                        .foregroundStyle(Theme.textTertiary)
                        .lineLimit(2)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
}

struct BiasChip: View {
    let bias: MarketBias
    var compact = false

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: bias.symbolName)
                .font(.caption2.weight(.bold))
            if !compact {
                Text(bias == .insufficientData ? "No data" : bias.label)
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
            }
        }
        .foregroundStyle(bias.color)
        .padding(.horizontal, compact ? 6 : 8)
        .padding(.vertical, 4)
        .background(bias.color.opacity(0.13), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(bias.label)
    }
}

struct ChangeLabel: View {
    let change: Double
    let percent: Double
    var precision = 2

    var body: some View {
        let tone = change > 0 ? Theme.bullish : change < 0 ? Theme.bearish : Theme.neutral
        HStack(spacing: 3) {
            Image(systemName: change > 0 ? "arrow.up" : change < 0 ? "arrow.down" : "minus")
                .font(.caption2.weight(.bold))
            Text(Formatters.signed(change, precision: precision))
            Text("(\(Formatters.signedPercent(percent)))")
        }
        .font(.tdNumericSmall)
        .foregroundStyle(tone)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(change >= 0 ? "Up" : "Down") \(Formatters.signedPercent(percent))")
    }
}

/// Capsule segmented control with a sliding selection and filter feedback.
struct PillPicker<Option: Hashable>: View {
    let options: [Option]
    @Binding var selection: Option
    let title: (Option) -> String
    var accessibilityTitle: String = "Options"
    /// Stretch segments to fill the available width (segmented-control style).
    var fillsWidth = false

    @Environment(AppModel.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var namespace

    var body: some View {
        HStack(spacing: 2) {
            ForEach(options, id: \.self) { option in
                let selected = option == selection
                Button {
                    guard option != selection else { return }
                    app.feedback.play(.filterSelect)
                    withAnimation(reduceMotion ? nil : .spring(response: 0.32, dampingFraction: 0.85)) {
                        selection = option
                    }
                } label: {
                    Text(title(option))
                        .font(.footnote.weight(selected ? .semibold : .medium))
                        .foregroundStyle(selected ? Theme.textPrimary : Theme.textSecondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .frame(minWidth: 36, maxWidth: fillsWidth ? .infinity : nil, minHeight: 32)
                        .background {
                            if selected {
                                Capsule()
                                    .fill(Theme.surfaceOpaque)
                                    .shadow(color: Theme.shadow, radius: 4, y: 1)
                                    .matchedGeometryEffect(id: "pill", in: namespace)
                            }
                        }
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(3)
        .background(fillsWidth ? AnyShapeStyle(.ultraThinMaterial) : AnyShapeStyle(Theme.surfaceInset), in: Capsule())
        .overlay { if fillsWidth { Capsule().strokeBorder(Theme.hairline, lineWidth: 0.5) } }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(accessibilityTitle)
    }
}

/// Subtle press response used by all tappable cards and buttons.
struct PressableButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.975 : 1)
            .opacity(configuration.isPressed ? 0.88 : 1)
            .animation(.easeOut(duration: 0.16), value: configuration.isPressed)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(
                LinearGradient(colors: [Theme.accent, Theme.accent.opacity(0.85)], startPoint: .top, endPoint: .bottom),
                in: Capsule()
            )
            .overlay { Capsule().strokeBorder(Color.white.opacity(0.18), lineWidth: 0.5) }
            .shadow(color: Theme.accent.opacity(0.25), radius: 10, y: 4)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(Theme.accent)
            .frame(maxWidth: .infinity, minHeight: 46)
            .background(Theme.accentSoft, in: Capsule())
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

/// Standard empty / unavailable state inside a card.
struct UnavailableState: View {
    let title: String
    let message: String
    var systemImage = "exclamationmark.icloud"

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.s) {
            Image(systemName: systemImage)
                .font(.title3)
                .foregroundStyle(Theme.textTertiary)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.textPrimary)
                Text(message).font(.footnote).foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
