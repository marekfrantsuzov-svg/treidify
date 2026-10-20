import SwiftUI
import TreidifyCore

@main
struct TreidifyApp: App {
    @State private var appModel = TreidifyApp.makeModel()

    private static func makeModel() -> AppModel {
        let settings = AppSettings(defaults: launchDefaults)
        if LaunchOptions.skipsOnboarding {
            settings.hasCompletedOnboarding = true
            settings.acceptedDisclosureVersion = AppSettings.currentDisclosureVersion
        }
        if let appearance = LaunchOptions.appearance { settings.appearance = appearance }
        if LaunchOptions.connectsDemoAccount { settings.demoAccountConnected = true }
        return AppModel(settings: settings)
    }

    /// UI tests launch with `-ui-testing` to start from a clean, isolated state.
    private static var launchDefaults: UserDefaults {
        if ProcessInfo.processInfo.arguments.contains("-ui-testing") {
            let suite = "treidify.uitests"
            UserDefaults().removePersistentDomain(forName: suite)
            return UserDefaults(suiteName: suite) ?? .standard
        }
        return .standard
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appModel)
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        ZStack {
            if app.settings.needsOnboarding {
                OnboardingView()
                    .transition(.opacity)
            } else {
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: app.settings.needsOnboarding)
        .preferredColorScheme(app.settings.appearance.colorScheme)
        .tint(Theme.accent)
    }
}

enum AppTab: String, CaseIterable, Hashable {
    case home, markets, news, journal, more

    var title: String {
        switch self {
        case .home: "Home"
        case .markets: "Markets"
        case .news: "News"
        case .journal: "Journal"
        case .more: "More"
        }
    }

    var systemImage: String {
        switch self {
        case .home: "house.fill"
        case .markets: "chart.bar.xaxis"
        case .news: "newspaper"
        case .journal: "book.closed"
        case .more: "line.3.horizontal"
        }
    }
}

struct MainTabView: View {
    @Environment(AppModel.self) private var app
    @State private var selection: AppTab = LaunchOptions.initialTab ?? .home

    var body: some View {
        // The system tab bar: on iOS 26 it becomes the floating Liquid Glass bar.
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label(AppTab.home.title, systemImage: AppTab.home.systemImage) }
                .tag(AppTab.home)
            MarketsView()
                .tabItem { Label(AppTab.markets.title, systemImage: AppTab.markets.systemImage) }
                .tag(AppTab.markets)
            NewsView()
                .tabItem { Label(AppTab.news.title, systemImage: AppTab.news.systemImage) }
                .tag(AppTab.news)
            PerformanceView()
                .tabItem { Label(AppTab.journal.title, systemImage: AppTab.journal.systemImage) }
                .tag(AppTab.journal)
            MoreView()
                .tabItem { Label(AppTab.more.title, systemImage: AppTab.more.systemImage) }
                .tag(AppTab.more)
        }
        .onChange(of: selection) { _, _ in
            app.feedback.play(.tabSwitch)
        }
        .onAppear { app.feedback.prepare() }
    }
}

/// Launch arguments used by UI tests and the CI screenshot step:
/// `-ui-testing` (clean state), `-skip-onboarding`, `-appearance dark|light`, `-tab journal`,
/// `-demo-account`, `-scroll-to-chart`.
enum LaunchOptions {
    private static let arguments = ProcessInfo.processInfo.arguments

    static var skipsOnboarding: Bool { arguments.contains("-skip-onboarding") }

    static var appearance: AppSettings.Appearance? { value(after: "-appearance").flatMap(AppSettings.Appearance.init(rawValue:)) }

    static var scrollsToChart: Bool { arguments.contains("-scroll-to-chart") }

    static var connectsDemoAccount: Bool { arguments.contains("-demo-account") }

    static var initialTab: AppTab? { value(after: "-tab").flatMap(AppTab.init(rawValue:)) }

    private static func value(after flag: String) -> String? {
        guard let i = arguments.firstIndex(of: flag), arguments.indices.contains(i + 1) else { return nil }
        return arguments[i + 1]
    }
}

#Preview("App – dark") {
    RootView()
        .environment(AppModel.preview())
        .preferredColorScheme(.dark)
}

#Preview("App – light") {
    RootView()
        .environment(AppModel.preview())
        .preferredColorScheme(.light)
}
