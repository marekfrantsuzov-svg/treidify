import SwiftUI
import TreidifyCore

struct HomeView: View {
    @Environment(AppModel.self) private var app
    @State private var model: HomeViewModel?
    @State private var showsSettings = false

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()
                ScrollViewReader { proxy in
                    ScrollView {
                        if let model {
                            HomeContent(model: model, showsSettings: $showsSettings)
                        } else {
                            ProgressView().padding(.top, 120)
                        }
                    }
                    .task(id: model == nil) {
                        // Screenshot runs can open Home scrolled to the chart.
                        guard model != nil, LaunchOptions.scrollsToChart else { return }
                        try? await Task.sleep(for: .seconds(1.5))
                        proxy.scrollTo(HomeAnchor.chart, anchor: .top)
                    }
                }
                .scrollIndicators(.hidden)
                .refreshable { await model?.load() }
                .navigationDestination(for: NewsStory.self) { StoryDetailView(story: $0) }
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showsSettings) { SettingsView() }
        }
        .task(id: app.dataContext) {
            let vm = HomeViewModel(market: app.marketData, intelligence: app.intelligence, accounts: app.accounts)
            model = vm
            await vm.load()
        }
    }
}

enum HomeAnchor: Hashable { case chart }

enum HomeSection: String, CaseIterable, Hashable {
    case overview = "Overview", news = "News", analysis = "Analysis"
}

private struct HomeContent: View {
    @Bindable var model: HomeViewModel
    @Binding var showsSettings: Bool
    @Environment(AppModel.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var section: HomeSection = .overview
    @State private var appeared = false

    var body: some View {
        LazyVStack(spacing: Spacing.m) {
            header
            PillPicker(options: HomeSection.allCases, selection: $section, title: \.rawValue,
                       accessibilityTitle: "Home section", fillsWidth: true)
            Group {
                switch section {
                case .overview:
                    HeroQuoteCard(model: model)
                    CompactQuoteRow(snapshot: model.chartInstrument == .xauusd ? model.dxy : model.gold) {
                        app.feedback.play(.filterSelect)
                        withAnimation(reduceMotion ? nil : .spring(response: 0.38, dampingFraction: 0.86)) {
                            model.chartInstrument = model.chartInstrument == .xauusd ? .dxy : .xauusd
                        }
                        Task { await model.loadChart() }
                    }
                    MarketBiasCard(bias: model.bias, isDemo: model.isDemo)
                    MainChartCard(model: model)
                        .id(HomeAnchor.chart)
                    KeyNewsCard(events: model.keyEvents)
                case .news:
                    NewsPreviewCard(stories: model.stories)
                    KeyNewsCard(events: model.keyEvents)
                case .analysis:
                    AdvisoryCard(advisory: model.advisory, status: model.marketStatus)
                    if let insight = model.insight { InsightCard(insight: insight) }
                    BiasMatrixCard(bias: model.bias, freshness: model.biasFreshness, isDemo: model.isDemo)
                    AccountSummaryCard(account: model.account)
                }
            }
            .transition(.opacity.combined(with: .offset(y: reduceMotion ? 0 : 8)))
            DisclaimerFootnote()
        }
        .animation(reduceMotion ? nil : .spring(response: 0.4, dampingFraction: 0.9), value: section)
        .padding(.horizontal, Spacing.screenHorizontal)
        .padding(.bottom, Spacing.xl)
        // Opening animation: content rises gently into place once.
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared || reduceMotion ? 0 : 14)
        .onAppear {
            withAnimation(reduceMotion ? nil : .spring(response: 0.6, dampingFraction: 0.9)) { appeared = true }
        }
        .onChange(of: section) { _, _ in app.feedback.play(.tabSwitch) }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: Spacing.s) {
            VStack(alignment: .leading, spacing: 2) {
                Text(model.greeting)
                    .font(.tdTitle)
                    .foregroundStyle(Theme.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                Text("Let's see what's moving the market today.")
                    .font(.tdFootnote)
                    .foregroundStyle(Theme.textTertiary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
            Spacer(minLength: Spacing.xs)
            if model.isDemo { DemoBadge() }
            GlassIconButton(systemImage: "person.crop.circle", accessibilityLabel: "Profile and settings") {
                app.feedback.play(.navigation)
                showsSettings = true
            }
        }
        .padding(.top, Spacing.xs)
    }
}

/// Large price card for the selected instrument, with sparkline and the
/// timeframe chips that drive the main chart.
struct HeroQuoteCard: View {
    @Bindable var model: HomeViewModel

    var body: some View {
        let snapshot = model.chartInstrument == .xauusd ? model.gold : model.dxy
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                HStack(spacing: Spacing.xs) {
                    InstrumentIcon(instrument: snapshot.instrument)
                    Text(snapshot.instrument.symbol)
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)
                    Spacer()
                    FreshnessBadge(freshness: snapshot.freshness, source: snapshot.source)
                }
                HStack(alignment: .bottom, spacing: Spacing.s) {
                    VStack(alignment: .leading, spacing: 4) {
                        if let quote = snapshot.quote {
                            Text(snapshot.instrument.format(quote.price))
                                .font(.tdHeroNumber)
                                .foregroundStyle(Theme.textPrimary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)
                                .contentTransition(.numericText(value: quote.price))
                            ChangeLabel(change: quote.change, percent: quote.changePercent,
                                        precision: snapshot.instrument.pricePrecision)
                        } else if snapshot.freshness == .loading {
                            Text("0,000.00").font(.tdHeroNumber).redacted(reason: .placeholder)
                        } else {
                            Text("Unavailable").font(.tdNumericLarge).foregroundStyle(Theme.textSecondary)
                            Text("No price is shown without a verified source.")
                                .font(.caption2).foregroundStyle(Theme.textTertiary)
                        }
                    }
                    .layoutPriority(1)
                    if let quote = snapshot.quote {
                        SparklineView(values: snapshot.sparkline, tone: quote.change >= 0 ? Theme.bullish : Theme.bearish)
                            .frame(height: 52)
                    }
                }
                TimeframeChips(options: Timeframe.allCases, selection: $model.chartTimeframe)
            }
        }
        .accessibilityElement(children: .contain)
    }
}

/// One-line card for the other instrument. Tapping it swaps it into the hero card.
struct CompactQuoteRow: View {
    let snapshot: HomeViewModel.InstrumentSnapshot
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            GlassCard(padding: Spacing.s) {
                HStack(spacing: Spacing.s) {
                    InstrumentIcon(instrument: snapshot.instrument, size: 26)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(snapshot.instrument.symbol)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.textPrimary)
                        Text(snapshot.instrument.displayName)
                            .font(.caption2)
                            .foregroundStyle(Theme.textTertiary)
                    }
                    Spacer(minLength: Spacing.xs)
                    if let quote = snapshot.quote {
                        SparklineView(values: snapshot.sparkline, tone: quote.change >= 0 ? Theme.bullish : Theme.bearish)
                            .frame(width: 64, height: 26)
                        VStack(alignment: .trailing, spacing: 1) {
                            Text(snapshot.instrument.format(quote.price))
                                .font(.tdNumeric)
                                .foregroundStyle(Theme.textPrimary)
                            Text(Formatters.signedPercent(quote.changePercent))
                                .font(.tdNumericSmall)
                                .foregroundStyle(quote.change >= 0 ? Theme.bullish : Theme.bearish)
                        }
                    } else {
                        Text(snapshot.freshness.label).font(.footnote).foregroundStyle(Theme.textSecondary)
                    }
                }
            }
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityHint("Shows this instrument in the main card and chart")
    }
}

/// Bias for both instruments: headline bias from 4H, plus a tile per timeframe.
struct MarketBiasCard: View {
    let bias: [String: [Timeframe: BiasResult]]
    let isDemo: Bool

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.m) {
                SectionHeader(title: "Market Bias") {
                    if isDemo { DemoBadge() }
                }
                ForEach(Instrument.primary) { instrument in
                    let results = bias[instrument.symbol] ?? [:]
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack(spacing: Spacing.xs) {
                            InstrumentIcon(instrument: instrument, size: 24)
                            Text(instrument.symbol)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.textPrimary)
                            Spacer()
                            BiasLabel(bias: results[.h4]?.bias ?? .insufficientData)
                        }
                        HStack(spacing: 6) {
                            ForEach(Timeframe.biasTimeframes) { tf in
                                BiasTile(timeframe: tf, bias: results[tf]?.bias ?? .insufficientData)
                            }
                        }
                    }
                    .accessibilityElement(children: .contain)
                }
                Text("Technical structure only (swing highs and lows with EMA 50). Not a forecast.")
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
    }
}

/// Today's scheduled high- and medium-importance releases.
struct KeyNewsCard: View {
    let events: Loadable<Sourced<[EconomicEvent]>>

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "Today's Key News") {
                    if let s = events.value, s.source.isDemo { DemoBadge() }
                }
                switch events {
                case .loading:
                    ProgressView().frame(maxWidth: .infinity, minHeight: 60)
                case .failed(let message):
                    UnavailableState(title: "Calendar unavailable", message: message, systemImage: "calendar")
                case .loaded(let sourced) where sourced.value.isEmpty:
                    Text("No high- or medium-importance releases are scheduled for the rest of today.")
                        .font(.footnote)
                        .foregroundStyle(Theme.textSecondary)
                case .loaded(let sourced):
                    ForEach(sourced.value) { event in
                        KeyEventRow(event: event)
                        if event.id != sourced.value.last?.id { Divider().overlay(Theme.hairline) }
                    }
                    SourceFootnote(source: sourced.source, asOf: sourced.asOf)
                }
            }
        }
    }
}

struct KeyEventRow: View {
    let event: EconomicEvent

    var body: some View {
        HStack(alignment: .center, spacing: Spacing.s) {
            Text(event.scheduledAt, format: .dateTime.hour(.twoDigits(amPM: .omitted)).minute())
                .font(.footnote.monospacedDigit())
                .foregroundStyle(Theme.textTertiary)
                .frame(minWidth: 40, alignment: .leading)
            Text(CurrencyFlag.emoji(for: event.currency) ?? event.currency)
                .font(.body)
                .accessibilityLabel(event.currency)
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
                    .lineLimit(1)
            }
            Spacer(minLength: Spacing.xs)
            ImportancePill(importance: event.importance)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }

    /// Facts only: forecast and previous, or actual versus forecast. No direction is asserted.
    private var detail: String {
        func f(_ v: Double) -> String { v.formatted(.number.precision(.fractionLength(0...2))) + event.unit }
        if let actual = event.actual, let forecast = event.forecast {
            let relation = actual > forecast ? "above" : actual < forecast ? "below" : "in line with"
            return "Actual \(f(actual)), \(relation) the \(f(forecast)) forecast"
        }
        var parts: [String] = []
        if let forecast = event.forecast { parts.append("Forecast \(f(forecast))") }
        if let previous = event.previous { parts.append("Previous \(f(previous))") }
        return parts.isEmpty ? event.status.label : parts.joined(separator: " · ")
    }
}

// MARK: - Cards

struct AdvisoryCard: View {
    let advisory: MarketAdvisory?
    let status: MarketStatus
    @State private var expanded = false
    @Environment(AppModel.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                HStack {
                    Label("Market conditions", systemImage: icon)
                        .font(.tdCaption)
                        .foregroundStyle(Theme.accent)
                    Spacer()
                    SessionStatusPill(status: status)
                }
                if let advisory {
                    Text(advisory.message)
                        .font(.tdBody)
                        .foregroundStyle(Theme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    if expanded {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(advisory.basis, id: \.self) { line in
                                Label(line, systemImage: "checkmark.seal")
                                    .font(.footnote)
                                    .foregroundStyle(Theme.textSecondary)
                            }
                        }
                        .transition(.opacity)
                    }
                    HStack {
                        if advisory.isDemo { DemoBadge() }
                        SourceFootnote(source: advisory.source, asOf: advisory.asOf)
                        Spacer()
                        Button(expanded ? "Hide basis" : "Show basis") {
                            app.feedback.play(.cardExpand)
                            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) { expanded.toggle() }
                        }
                        .font(.footnote.weight(.semibold))
                        .accessibilityHint("Shows the data this summary is based on")
                    }
                } else {
                    Text("Preparing today's summary…")
                        .font(.tdBody)
                        .foregroundStyle(Theme.textSecondary)
                        .redacted(reason: .placeholder)
                }
            }
        }
    }

    private var icon: String {
        switch advisory?.kind {
        case .highImpactEvent: "calendar.badge.exclamationmark"
        case .conflictingSignals: "arrow.left.arrow.right"
        case .marketClosed: "moon.zzz"
        case .elevatedVolatility: "waveform.path.ecg"
        case .dataUnavailable: "exclamationmark.icloud"
        default: "sun.max"
        }
    }
}

struct SessionStatusPill: View {
    let status: MarketStatus

    var body: some View {
        let (text, tone): (String, Color) = {
            switch status {
            case .open(let sessions):
                let names = sessions.map(\.name).joined(separator: " · ")
                return (names.isEmpty ? "Market open" : names, Theme.bullish)
            case .dailyBreak: return ("Daily break", Theme.warning)
            case .weekendClosed: return ("Closed", Theme.neutral)
            }
        }()
        HStack(spacing: 5) {
            Circle().fill(tone).frame(width: 6, height: 6)
            Text(text).lineLimit(1)
        }
        .font(.caption2.weight(.semibold))
        .foregroundStyle(Theme.textSecondary)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Theme.surfaceInset, in: Capsule())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Sessions: \(text)")
    }
}

struct BiasMatrixCard: View {
    let bias: [String: [Timeframe: BiasResult]]
    let freshness: DataFreshness
    let isDemo: Bool

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "Market bias", subtitle: "Technical structure") {
                    if isDemo { DemoBadge() }
                }
                Grid(alignment: .leading, horizontalSpacing: Spacing.xs, verticalSpacing: Spacing.xs) {
                    GridRow {
                        Text("")
                        ForEach(Timeframe.biasTimeframes) { tf in
                            Text(tf.rawValue)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(Theme.textTertiary)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    ForEach(Instrument.primary) { instrument in
                        GridRow {
                            Text(instrument.symbol)
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(Theme.textPrimary)
                            ForEach(Timeframe.biasTimeframes) { tf in
                                BiasChip(bias: bias[instrument.symbol]?[tf]?.bias ?? .insufficientData, compact: true)
                                    .frame(maxWidth: .infinity)
                                    .accessibilityLabel("\(instrument.shortName) \(tf.accessibilityName): \((bias[instrument.symbol]?[tf]?.bias ?? .insufficientData).label)")
                            }
                        }
                    }
                }
                Divider().overlay(Theme.hairline)
                HStack(alignment: .top, spacing: Spacing.xs) {
                    Image(systemName: "newspaper")
                        .foregroundStyle(Theme.textTertiary)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Macro interpretation")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Theme.textPrimary)
                        Text("News-based interpretation is kept separate from technical structure. It is not available yet because it requires the licensed news intelligence engine.")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Text("Bias is a reproducible swing-structure and EMA(50) calculation, not a forecast. Details are in Markets.")
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
    }
}

struct MainChartCard: View {
    @Bindable var model: HomeViewModel
    @Environment(AppModel.self) private var app

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "\(model.chartInstrument.symbol) · \(model.chartTimeframe.rawValue)") {
                    Toggle(isOn: Binding(get: { model.showsZones }, set: { value in
                        app.feedback.play(.filterSelect)
                        model.showsZones = value
                    })) {
                        Text("Zones").font(.caption.weight(.semibold))
                    }
                    .toggleStyle(.button)
                    .controlSize(.small)
                }
                switch model.chart {
                case .loading:
                    RoundedRectangle(cornerRadius: Radius.inner).fill(Theme.surfaceInset).frame(height: 240)
                        .overlay { ProgressView() }
                case .failed(let message):
                    UnavailableState(title: "Chart unavailable", message: message)
                        .frame(minHeight: 120)
                case .loaded(let candles):
                    CandlestickChartView(candles: candles, instrument: model.chartInstrument, timeframe: model.chartTimeframe,
                                         zones: model.chartZones, showsZones: model.showsZones)
                }
                SourceFootnote(source: model.chartSource)
            }
        }
        .onChange(of: model.chartTimeframe) { _, _ in
            Task { await model.loadChart() }
        }
    }
}

struct AccountSummaryCard: View {
    let account: Loadable<HomeViewModel.AccountSnapshot?>
    @Environment(AppModel.self) private var app

    var body: some View {
        switch account {
        case .loading:
            GlassCard { ProgressView().frame(maxWidth: .infinity, minHeight: 80) }
        case .failed(let message):
            GlassCard { UnavailableState(title: "Account unavailable", message: message) }
        case .loaded(nil):
            ConnectMT5Card()
        case .loaded(let snapshot?):
            GlassCard {
                VStack(alignment: .leading, spacing: Spacing.s) {
                    SectionHeader(title: snapshot.account.displayName, subtitle: snapshot.account.broker) {
                        if snapshot.account.source.isDemo { DemoBadge() }
                    }
                    let currency = snapshot.account.currency
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.xs), GridItem(.flexible(), spacing: Spacing.xs), GridItem(.flexible())],
                              spacing: Spacing.xs) {
                        MetricTile(title: "Balance", value: Formatters.money(snapshot.account.balance, currency: currency))
                        MetricTile(title: "Equity", value: Formatters.money(snapshot.account.equity, currency: currency))
                        MetricTile(title: "Floating", value: Formatters.money(snapshot.floatingPnL, currency: currency, signed: true),
                                   detail: "\(snapshot.openPositions) open · unrealized", tone: tone(snapshot.floatingPnL))
                        MetricTile(title: "Today", value: Formatters.money(snapshot.dailyPnL, currency: currency, signed: true), tone: tone(snapshot.dailyPnL))
                        MetricTile(title: "Week", value: Formatters.money(snapshot.weeklyPnL, currency: currency, signed: true), tone: tone(snapshot.weeklyPnL))
                        MetricTile(title: "Month", value: Formatters.money(snapshot.monthlyPnL, currency: currency, signed: true), tone: tone(snapshot.monthlyPnL))
                        MetricTile(title: "Win rate", value: Formatters.percent(snapshot.metrics.winRate, digits: 0))
                        MetricTile(title: "Profit factor", value: Formatters.decimal(snapshot.metrics.profitFactor))
                        MetricTile(title: "Max DD", value: Formatters.percent(snapshot.metrics.maxDrawdownPercent.map { $0 / 100 }), tone: Theme.bearish)
                    }
                    Text("Realized P&L after costs by close time. Ratios use all \(snapshot.metrics.tradeCount) closed trades.")
                        .font(.caption2)
                        .foregroundStyle(Theme.textTertiary)
                }
            }
        }
    }

    private func tone(_ v: Double) -> Color { v > 0 ? Theme.bullish : v < 0 ? Theme.bearish : Theme.textPrimary }
}

struct ConnectMT5Card: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                HStack(spacing: Spacing.s) {
                    Image(systemName: "link.circle.fill")
                        .font(.largeTitle)
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(Theme.accent)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Connect MetaTrader 5")
                            .font(.tdSectionTitle)
                            .foregroundStyle(Theme.textPrimary)
                        Text("Read-only performance analytics: balance, P&L, win rate, drawdown. Treidify never places trades.")
                            .font(.footnote)
                            .foregroundStyle(Theme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                if app.settings.demoModeEnabled {
                    Button("Explore with a demo account") {
                        app.feedback.play(.mt5Connected)
                        app.settings.demoAccountConnected = true
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }
                Text("Live MT5 connection is not available in this build.")
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
    }
}

struct NewsPreviewCard: View {
    let stories: Loadable<Sourced<[NewsStory]>>

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "Global intelligence") {
                    if let s = stories.value { FreshnessBadge(freshness: .live, source: s.source) }
                }
                switch stories {
                case .loading:
                    ProgressView().frame(maxWidth: .infinity)
                case .failed(let message):
                    UnavailableState(title: "News unavailable", message: message, systemImage: "newspaper")
                case .loaded(let sourced):
                    ForEach(sourced.value) { story in
                        NavigationLink(value: story) {
                            StoryRow(story: story)
                        }
                        .buttonStyle(PressableButtonStyle())
                        if story.id != sourced.value.last?.id { Divider().overlay(Theme.hairline) }
                    }
                }
            }
        }
    }
}

struct StoryRow: View {
    let story: NewsStory

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(story.headline)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: Spacing.xs) {
                ImpactTag(market: "Gold", impact: story.goldImpact)
                ImpactTag(market: "USD", impact: story.usdImpact)
                Spacer(minLength: 0)
            }
            HStack(spacing: 4) {
                Text(story.originalSource).lineLimit(1)
                Text("·")
                Text(story.publishedAt, format: .relative(presentation: .named))
            }
            .font(.caption2)
            .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

struct ImpactTag: View {
    let market: String
    let impact: ImpactAssessment

    var body: some View {
        HStack(spacing: 3) {
            Text(market).foregroundStyle(Theme.textTertiary)
            Text(impact.direction.label).foregroundStyle(impact.direction.color)
        }
        .font(.caption2.weight(.semibold))
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(impact.direction.color.opacity(0.1), in: Capsule())
    }
}

struct InsightCard: View {
    let insight: HomeViewModel.Insight

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Label(insight.title, systemImage: "sparkles")
                        .font(.tdCaption)
                        .foregroundStyle(Theme.accent)
                    Spacer()
                    if insight.isDemo { DemoBadge() }
                }
                Text(insight.text)
                    .font(.tdBody)
                    .foregroundStyle(Theme.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(insight.basis)
                    .font(.caption2)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
    }
}

struct DisclaimerFootnote: View {
    var body: some View {
        Text(LegalText.shortDisclaimer)
            .font(.caption2)
            .foregroundStyle(Theme.textTertiary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, Spacing.s)
            .padding(.top, Spacing.xs)
    }
}

#Preview("Home – dark") {
    HomeView()
        .environment(AppModel.preview())
        .preferredColorScheme(.dark)
}

#Preview("Home – light, no account") {
    HomeView()
        .environment(AppModel.preview(accountConnected: false))
        .preferredColorScheme(.light)
}
