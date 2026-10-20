import SwiftUI
import TreidifyCore

/// The fifth tab: AI Coach, the trading account, preferences and legal.
struct MoreView: View {
    @Environment(AppModel.self) private var app
    @State private var showsRulebook = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        CoachView(embedded: true)
                    } label: {
                        MoreRow(title: "AI Coach", subtitle: "Evidence-based observations on your trading",
                                systemImage: "sparkles", tint: Theme.accent)
                    }
                    Button {
                        app.feedback.play(.navigation)
                        showsRulebook = true
                    } label: {
                        MoreRow(title: "Trading rulebook", subtitle: "Your own limits, checked against your trades",
                                systemImage: "list.bullet.clipboard", tint: Theme.accent)
                    }
                    .buttonStyle(.plain)
                }

                Section("Account") {
                    MoreRow(title: "MetaTrader 5",
                            subtitle: app.settings.demoAccountConnected ? "Demo account connected" : "Read-only connection is not available in this build",
                            systemImage: "link", tint: Theme.dollar)
                    MoreRow(title: "Treidify Premium", subtitle: "Trial and subscription are not available in this build",
                            systemImage: "star.circle", tint: Theme.gold)
                }

                Section {
                    NavigationLink {
                        SettingsView(embedded: true)
                    } label: {
                        MoreRow(title: "Settings", subtitle: "Appearance, feedback, data and legal",
                                systemImage: "gearshape", tint: Theme.neutral)
                    }
                }

                Section {
                    Text(LegalText.shortDisclaimer)
                        .font(.caption2)
                        .foregroundStyle(Theme.textTertiary)
                        .listRowBackground(Color.clear)
                }
            }
            .scrollContentBackground(.hidden)
            .background { AmbientBackground() }
            .navigationTitle("More")
            .sheet(isPresented: $showsRulebook) { RulebookView() }
        }
    }
}

private struct MoreRow: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let tint: Color

    var body: some View {
        HStack(spacing: Spacing.s) {
            Image(systemName: systemImage)
                .font(.body.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(tint.gradient, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(Theme.textTertiary)
            }
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

#Preview("More – dark") {
    MoreView()
        .environment(AppModel.preview())
        .preferredColorScheme(.dark)
}
