import SwiftUI
import TreidifyCore

/// Milestone 1 preview of the coach: deterministic, evidence-based observations
/// from `CoachAnalyzer`. Language-model explanations (Claude API, server-side)
/// arrive in Milestone 5 and will only rephrase these verified findings.
struct CoachView: View {
    @Environment(AppModel.self) private var app
    @State private var history: Loadable<TradingHistory?> = .loading
    @State private var showsRulebook = false
    /// True when pushed inside another navigation stack (from More).
    var embedded = false

    var body: some View {
        if embedded {
            content
        } else {
            NavigationStack { content }
        }
    }

    private var content: some View {
            ZStack {
                AmbientBackground()
                ScrollView {
                    VStack(spacing: Spacing.m) {
                        GlassCard {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Label("Rule-based preview", systemImage: "sparkles")
                                    .font(.tdCaption)
                                    .foregroundStyle(Theme.accent)
                                Text("Observations below are calculated from your trade history with documented rules and minimum sample sizes. They describe behaviour; they never guess at emotions.")
                                    .font(.footnote)
                                    .foregroundStyle(Theme.textSecondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        switch history {
                        case .loading:
                            ProgressView().padding(.top, 60)
                        case .failed(let message):
                            GlassCard { UnavailableState(title: "Coach unavailable", message: message) }
                        case .loaded(nil):
                            ConnectMT5Card()
                        case .loaded(let h?):
                            observations(for: h)
                        }
                    }
                    .padding(.horizontal, Spacing.screenHorizontal)
                    .padding(.bottom, Spacing.xl)
                }
                .scrollIndicators(.hidden)
            }
            .navigationTitle("AI Coach")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        app.feedback.play(.navigation)
                        showsRulebook = true
                    } label: {
                        Label("Rulebook", systemImage: "list.bullet.clipboard")
                    }
                }
            }
            .sheet(isPresented: $showsRulebook) { RulebookView() }
            .task(id: app.dataContext) { await load() }
    }

    @ViewBuilder
    private func observations(for history: TradingHistory) -> some View {
        let items = CoachAnalyzer().observations(for: history.trades, rulebook: app.settings.rulebook)
        if history.account.source.isDemo { DemoModeBanner() }
        if items.isEmpty {
            GlassCard {
                UnavailableState(title: "Nothing notable yet",
                                 message: "No pattern met its evidence threshold across \(history.trades.count) trades.",
                                 systemImage: "checkmark.circle")
            }
        }
        ForEach(items) { item in ObservationCard(observation: item) }
    }

    private func load() async {
        let repo = app.accounts
        do {
            guard let account = try await repo.connectedAccounts().first else { history = .loaded(nil); return }
            history = .loaded(try await repo.history(for: account.id))
        } catch {
            history = .failed(error.localizedDescription)
        }
    }
}

private struct ObservationCard: View {
    let observation: CoachObservation
    @State private var expanded = false
    @Environment(AppModel.self) private var app

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                HStack {
                    Circle().fill(tone).frame(width: 8, height: 8)
                    Text(observation.title).font(.tdSectionTitle).foregroundStyle(Theme.textPrimary)
                    Spacer()
                    Text("n = \(observation.sampleSize)").font(.caption2.monospacedDigit()).foregroundStyle(Theme.textTertiary)
                }
                Text(observation.finding).font(.tdCallout).foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                if expanded {
                    ForEach(observation.evidence, id: \.self) { line in
                        Label(line, systemImage: "chart.bar.doc.horizontal").font(.footnote).foregroundStyle(Theme.textSecondary)
                    }
                    Label(observation.suggestion, systemImage: "lightbulb").font(.footnote.weight(.medium)).foregroundStyle(Theme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Button(expanded ? "Hide evidence" : "Show evidence") {
                    app.feedback.play(.cardExpand)
                    withAnimation(.easeInOut(duration: 0.22)) { expanded.toggle() }
                }
                .font(.footnote.weight(.semibold))
            }
        }
    }

    private var tone: Color {
        switch observation.severity {
        case .important: Theme.bearish
        case .watch: Theme.warning
        case .info: Theme.accent
        }
    }
}

struct RulebookView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let settings = app.settings
        NavigationStack {
            Form {
                Section {
                    Toggle("Limit trades per day", isOn: Binding(
                        get: { settings.rulebook.maxTradesPerDay != nil },
                        set: { settings.rulebook.maxTradesPerDay = $0 ? 5 : nil }))
                    if let max = settings.rulebook.maxTradesPerDay {
                        Stepper("Maximum \(max) trades", value: Binding(
                            get: { max }, set: { settings.rulebook.maxTradesPerDay = $0 }), in: 1...50)
                    }
                } footer: {
                    Text("The coach reports days that exceeded this limit.")
                }
                Section {
                    Toggle("Limit volume per trade", isOn: Binding(
                        get: { settings.rulebook.maxVolumePerTrade != nil },
                        set: { settings.rulebook.maxVolumePerTrade = $0 ? 1.0 : nil }))
                    if let max = settings.rulebook.maxVolumePerTrade {
                        Stepper("Maximum \(max.formatted(.number.precision(.fractionLength(2)))) lots", value: Binding(
                            get: { max }, set: { settings.rulebook.maxVolumePerTrade = $0 }), in: 0.01...100, step: 0.05)
                    }
                }
                Section {
                    Toggle("Gold only (XAUUSD)", isOn: Binding(
                        get: { settings.rulebook.allowedSymbols == ["XAUUSD"] },
                        set: { settings.rulebook.allowedSymbols = $0 ? ["XAUUSD"] : nil }))
                } footer: {
                    Text("Your rules stay on this device in Milestone 1.")
                }
            }
            .navigationTitle("Trading rulebook")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        app.feedback.play(.success)
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview("Coach") {
    CoachView()
        .environment(AppModel.preview())
}
