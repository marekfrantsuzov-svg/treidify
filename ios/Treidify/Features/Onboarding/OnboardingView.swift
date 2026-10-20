import SwiftUI
import TreidifyCore

struct OnboardingView: View {
    enum Page: Int, CaseIterable {
        case welcome, features, disclosure, preferences
    }

    @Environment(AppModel.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var page: Page = .welcome
    @State private var acknowledged = false

    var body: some View {
        ZStack {
            AmbientBackground()
            VStack(spacing: Spacing.m) {
                TabView(selection: $page) {
                    WelcomePage().tag(Page.welcome)
                    FeaturesPage().tag(Page.features)
                    DisclosurePage(acknowledged: $acknowledged).tag(Page.disclosure)
                    PreferencesPage().tag(Page.preferences)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .onChange(of: page) { _, _ in app.feedback.play(.navigation) }

                PageDots(count: Page.allCases.count, current: page.rawValue)

                Button(action: advance) {
                    Text(buttonTitle)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(page == .disclosure && !acknowledged)
                .opacity(page == .disclosure && !acknowledged ? 0.5 : 1)
                .padding(.horizontal, Spacing.l)
                .padding(.bottom, Spacing.m)
            }
        }
    }

    private var buttonTitle: String {
        switch page {
        case .welcome: "Get started"
        case .features, .disclosure: "Continue"
        case .preferences: "Start exploring"
        }
    }

    private func advance() {
        if page == .disclosure {
            app.settings.acceptedDisclosureVersion = AppSettings.currentDisclosureVersion
        }
        guard let next = Page(rawValue: page.rawValue + 1) else {
            app.feedback.play(.success)
            app.settings.hasCompletedOnboarding = true
            return
        }
        app.feedback.play(.buttonTap)
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { page = next }
    }
}

private struct PageDots: View {
    let count: Int
    let current: Int

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<count, id: \.self) { i in
                Capsule()
                    .fill(i == current ? Theme.accent : Theme.hairline)
                    .frame(width: i == current ? 18 : 6, height: 6)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: current)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Page \(current + 1) of \(count)")
    }
}

private struct OnboardingPage<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.l) { content }
                .padding(.horizontal, Spacing.l)
                .padding(.top, Spacing.xl)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
    }
}

private struct WelcomePage: View {
    var body: some View {
        OnboardingPage {
            Spacer(minLength: 40)
            BrandMark(size: 96)
            Wordmark(showsTagline: true, textStyle: .largeTitle)
            Text("Market intelligence for gold and the dollar, and clear analytics for your own trading.")
                .font(.title3)
                .foregroundStyle(Theme.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct FeaturesPage: View {
    private struct Feature: Identifiable {
        let icon: String
        let title: String
        let text: String
        var id: String { title }
    }

    private let features = [
        Feature(icon: "chart.xyaxis.line", title: "XAUUSD & DXY", text: "Prices, multi-timeframe structure and conditional levels from documented calculations."),
        Feature(icon: "globe", title: "Global intelligence", text: "Economic releases and major news explained for gold and the dollar, with sources."),
        Feature(icon: "chart.bar.xaxis", title: "Your performance", text: "Read-only MetaTrader 5 analytics: P&L, win rate, drawdown, costs."),
        Feature(icon: "sparkles", title: "Coaching", text: "Evidence-based reviews of your trading patterns and your own rules.")
    ]

    var body: some View {
        OnboardingPage {
            Text("What Treidify does")
                .font(.tdDisplay)
                .foregroundStyle(Theme.textPrimary)
            ForEach(features) { feature in
                HStack(alignment: .top, spacing: Spacing.m) {
                    Image(systemName: feature.icon)
                        .font(.title2)
                        .foregroundStyle(Theme.accent)
                        .frame(width: 36)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(feature.title).font(.headline).foregroundStyle(Theme.textPrimary)
                        Text(feature.text).font(.subheadline).foregroundStyle(Theme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }
}

private struct DisclosurePage: View {
    @Binding var acknowledged: Bool
    @Environment(AppModel.self) private var app

    var body: some View {
        OnboardingPage {
            Text("Before you start")
                .font(.tdDisplay)
                .foregroundStyle(Theme.textPrimary)
            GlassCard {
                VStack(alignment: .leading, spacing: Spacing.s) {
                    Text(LegalText.disclaimer)
                        .font(.body)
                        .foregroundStyle(Theme.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    Divider().overlay(Theme.hairline)
                    ForEach(LegalText.notOffered, id: \.self) { item in
                        Label(item, systemImage: "xmark.circle")
                            .font(.footnote)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            }
            Toggle(isOn: Binding(get: { acknowledged }, set: { value in
                app.feedback.play(.filterSelect)
                acknowledged = value
            })) {
                Text("I understand that Treidify provides information and analysis, not investment advice, and that trading involves risk.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .tint(Theme.accent)
        }
    }
}

private struct PreferencesPage: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        @Bindable var settings = app.settings
        OnboardingPage {
            Text("Make it yours")
                .font(.tdDisplay)
                .foregroundStyle(Theme.textPrimary)
            GlassCard {
                VStack(spacing: Spacing.s) {
                    Picker("Appearance", selection: $settings.appearance) {
                        ForEach(AppSettings.Appearance.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: settings.appearance) { _, _ in app.feedback.play(.themeSwitch) }
                    Toggle("Haptic feedback", isOn: $settings.hapticsEnabled)
                    Toggle("Interface sounds", isOn: $settings.soundsEnabled)
                        .onChange(of: settings.soundsEnabled) { _, on in if on { app.feedback.play(.buttonTap) } }
                }
                .tint(Theme.accent)
            }
            Text("Sounds are off by default and follow your silent switch. You can change these any time in Settings.")
                .font(.footnote)
                .foregroundStyle(Theme.textTertiary)
        }
    }
}

#Preview("Onboarding") {
    OnboardingView()
        .environment(AppModel.preview(onboarded: false))
}
