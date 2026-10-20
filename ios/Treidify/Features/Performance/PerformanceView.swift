import SwiftUI
import TreidifyCore

struct PerformanceView: View {
    @Environment(AppModel.self) private var app
    @State private var history: Loadable<TradingHistory?> = .loading
    @State private var period: ReportingPeriod = .month

    var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()
                ScrollView {
                    VStack(spacing: Spacing.m) {
                        switch history {
                        case .loading:
                            ProgressView().padding(.top, 80)
                        case .failed(let message):
                            GlassCard { UnavailableState(title: "Performance unavailable", message: message) }
                        case .loaded(nil):
                            ConnectMT5Card()
                        case .loaded(let h?):
                            PerformanceContent(history: h, period: $period)
                        }
                    }
                    .padding(.horizontal, Spacing.screenHorizontal)
                    .padding(.bottom, Spacing.xl)
                }
                .scrollIndicators(.hidden)
            }
            .navigationTitle("Journal")
        }
        .task(id: app.dataContext) { await load() }
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

private struct PerformanceContent: View {
    let history: TradingHistory
    @Binding var period: ReportingPeriod

    private let calc = PerformanceCalculator()

    var body: some View {
        let now = Date()
        let trades = calc.trades(history.trades, in: period, now: now)
        let m = calc.metrics(for: trades, startingEquity: history.tradingCapitalBase)
        let currency = history.account.currency
        let isDemo = history.account.source.isDemo

        if isDemo { DemoModeBanner() }

        PillPicker(options: ReportingPeriod.allCases, selection: $period, title: \.shortLabel, accessibilityTitle: "Reporting period")
            .frame(maxWidth: .infinity, alignment: .leading)

        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: period.label, subtitle: sampleDescription(m)) {
                    if isDemo { DemoBadge() }
                }
                Text(Formatters.money(m.netProfit, currency: currency, signed: true))
                    .font(.tdDisplay)
                    .foregroundStyle(m.netProfit >= 0 ? Theme.bullish : Theme.bearish)
                    .accessibilityLabel("Net realized P&L \(Formatters.money(m.netProfit, currency: currency, signed: true))")
                Text("Realized, after \(Formatters.money(m.totalCosts, currency: currency)) in costs. Deposits and withdrawals excluded.")
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
                if m.tradeCount > 0 {
                    EquityCurveView(points: calc.equityCurve(for: trades, startingBalance: history.tradingCapitalBase), currency: currency)
                        .frame(height: 160)
                }
            }
        }

        if m.tradeCount == 0 {
            GlassCard { UnavailableState(title: "No closed trades", message: "No trades closed in this period.", systemImage: "tray") }
        } else {
            GlassCard {
                VStack(alignment: .leading, spacing: Spacing.s) {
                    SectionHeader(title: "Key metrics")
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: Spacing.xs), GridItem(.flexible())], spacing: Spacing.xs) {
                        MetricTile(title: "Win rate", value: Formatters.percent(m.winRate), detail: "\(m.wins)W · \(m.losses)L · \(m.breakevens) BE")
                        MetricTile(title: "Profit factor", value: Formatters.decimal(m.profitFactor), detail: m.profitFactor == nil ? "No losing trades" : nil)
                        MetricTile(title: "Expectancy", value: Formatters.money(m.expectancy, currency: currency, signed: true), detail: "Per trade")
                        MetricTile(title: "Reward : risk", value: Formatters.decimal(m.rewardToRisk), detail: "Avg win ÷ avg loss")
                        MetricTile(title: "Average winner", value: Formatters.money(m.averageWinner, currency: currency), tone: Theme.bullish)
                        MetricTile(title: "Average loser", value: Formatters.money(m.averageLoser, currency: currency), tone: Theme.bearish)
                        MetricTile(title: "Max drawdown", value: Formatters.money(m.maxDrawdown, currency: currency),
                                   detail: m.maxDrawdownPercent.map { Formatters.percent($0 / 100) + " from peak" }, tone: Theme.bearish)
                        MetricTile(title: "Streaks", value: "\(m.maxConsecutiveWins)W / \(m.maxConsecutiveLosses)L", detail: "Longest consecutive")
                    }
                }
            }

            GroupCard(title: "By session", subtitle: "Session at open time", groups: calc.bySession(trades), currency: currency)
            GroupCard(title: "By instrument", subtitle: nil, groups: calc.bySymbol(trades), currency: currency)
        }

        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: "Account activity", subtitle: "Reported separately from trading results")
                HStack(spacing: Spacing.xs) {
                    MetricTile(title: "Net cash flow", value: Formatters.money(calc.netCashFlow(history.cashTransactions), currency: currency, signed: true),
                               detail: "\(history.cashTransactions.count) deposits/withdrawals")
                    MetricTile(title: "Unrealized", value: Formatters.money(history.openPositions.map(\.floatingProfit).reduce(0, +), currency: currency, signed: true),
                               detail: "\(history.openPositions.count) open positions")
                }
                SourceFootnote(source: history.account.source, asOf: history.account.asOf)
            }
        }
    }

    private func sampleDescription(_ m: PerformanceMetrics) -> String {
        guard let start = m.periodStart, let end = m.periodEnd else { return "0 trades" }
        return "\(m.tradeCount) trades · \(start.formatted(date: .abbreviated, time: .omitted)) – \(end.formatted(date: .abbreviated, time: .omitted))"
    }
}

private struct GroupCard: View {
    let title: String
    let subtitle: String?
    let groups: [GroupPerformance]
    let currency: String

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: Spacing.s) {
                SectionHeader(title: title, subtitle: subtitle)
                ForEach(groups) { g in
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(g.key).font(.footnote.weight(.semibold)).foregroundStyle(Theme.textPrimary)
                            Text("\(g.metrics.tradeCount) trades · win \(Formatters.percent(g.metrics.winRate, digits: 0))")
                                .font(.caption2).foregroundStyle(Theme.textTertiary)
                        }
                        Spacer()
                        Text(Formatters.money(g.metrics.netProfit, currency: currency, signed: true))
                            .font(.tdNumericSmall)
                            .foregroundStyle(g.metrics.netProfit >= 0 ? Theme.bullish : Theme.bearish)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}

#Preview("Performance") {
    PerformanceView()
        .environment(AppModel.preview())
}
