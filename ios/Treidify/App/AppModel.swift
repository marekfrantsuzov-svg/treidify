import Foundation
import Observation
import SwiftUI
import TreidifyCore

/// User preferences persisted in UserDefaults (no sensitive data is stored here).
@MainActor
@Observable
final class AppSettings {
    enum Appearance: String, CaseIterable, Identifiable {
        case system, light, dark
        var id: String { rawValue }
        var label: String { rawValue.capitalized }
        var colorScheme: ColorScheme? {
            switch self {
            case .system: nil
            case .light: .light
            case .dark: .dark
            }
        }
    }

    /// Bump when the risk disclosure text changes materially; users re-accept.
    static let currentDisclosureVersion = 1

    @ObservationIgnored private let defaults: UserDefaults

    var appearance: Appearance { didSet { defaults.set(appearance.rawValue, forKey: Keys.appearance) } }
    /// Off by default: sound is opt-in polish.
    var soundsEnabled: Bool { didSet { defaults.set(soundsEnabled, forKey: Keys.sounds) } }
    var hapticsEnabled: Bool { didSet { defaults.set(hapticsEnabled, forKey: Keys.haptics) } }
    /// Milestone 1 has no licensed providers, so demo mode is on by default and
    /// clearly labelled. Turning it off shows honest "unavailable" states.
    var demoModeEnabled: Bool { didSet { defaults.set(demoModeEnabled, forKey: Keys.demoMode) } }
    var demoAccountConnected: Bool { didSet { defaults.set(demoAccountConnected, forKey: Keys.demoAccount) } }
    var acceptedDisclosureVersion: Int { didSet { defaults.set(acceptedDisclosureVersion, forKey: Keys.disclosure) } }
    var hasCompletedOnboarding: Bool { didSet { defaults.set(hasCompletedOnboarding, forKey: Keys.onboarding) } }
    var rulebook: TradingRulebook {
        didSet { defaults.set(try? JSONEncoder().encode(rulebook), forKey: Keys.rulebook) }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        appearance = Appearance(rawValue: defaults.string(forKey: Keys.appearance) ?? "") ?? .system
        soundsEnabled = defaults.object(forKey: Keys.sounds) as? Bool ?? false
        hapticsEnabled = defaults.object(forKey: Keys.haptics) as? Bool ?? true
        demoModeEnabled = defaults.object(forKey: Keys.demoMode) as? Bool ?? true
        demoAccountConnected = defaults.object(forKey: Keys.demoAccount) as? Bool ?? false
        acceptedDisclosureVersion = defaults.integer(forKey: Keys.disclosure)
        hasCompletedOnboarding = defaults.bool(forKey: Keys.onboarding)
        rulebook = defaults.data(forKey: Keys.rulebook).flatMap { try? JSONDecoder().decode(TradingRulebook.self, from: $0) }
            ?? TradingRulebook()
    }

    var needsOnboarding: Bool {
        !hasCompletedOnboarding || acceptedDisclosureVersion < Self.currentDisclosureVersion
    }

    private enum Keys {
        static let appearance = "settings.appearance"
        static let sounds = "settings.soundsEnabled"
        static let haptics = "settings.hapticsEnabled"
        static let demoMode = "settings.demoModeEnabled"
        static let demoAccount = "settings.demoAccountConnected"
        static let disclosure = "settings.acceptedDisclosureVersion"
        static let onboarding = "settings.hasCompletedOnboarding"
        static let rulebook = "settings.rulebook"
    }
}

/// App-wide container: settings, feedback and the data repositories selected
/// for the current mode. Injected with `.environment(appModel)`.
@MainActor
@Observable
final class AppModel {
    let settings: AppSettings
    let feedback: InteractionFeedbackManager

    init(settings: AppSettings) {
        self.settings = settings
        self.feedback = InteractionFeedbackManager(settings: settings)
    }

    var marketData: any MarketDataRepository {
        settings.demoModeEnabled ? DemoMarketDataRepository() : UnconfiguredMarketDataRepository()
    }

    var intelligence: any IntelligenceRepository {
        settings.demoModeEnabled ? DemoIntelligenceRepository() : UnconfiguredIntelligenceRepository()
    }

    var accounts: any TradingAccountRepository {
        settings.demoModeEnabled && settings.demoAccountConnected ? DemoTradingAccountRepository() : NoTradingAccountRepository()
    }

    /// Changes whenever the data sources change, so screens can reload via `.task(id:)`.
    var dataContext: String {
        "\(settings.demoModeEnabled)-\(settings.demoAccountConnected)"
    }

    /// In-memory model for SwiftUI previews and UI tests.
    static func preview(onboarded: Bool = true, accountConnected: Bool = true) -> AppModel {
        let defaults = UserDefaults(suiteName: "treidify.preview.\(UUID().uuidString)")!
        let settings = AppSettings(defaults: defaults)
        settings.hasCompletedOnboarding = onboarded
        settings.acceptedDisclosureVersion = onboarded ? AppSettings.currentDisclosureVersion : 0
        settings.demoAccountConnected = accountConnected
        return AppModel(settings: settings)
    }
}
