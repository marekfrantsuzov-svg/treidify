import Foundation

/// Interaction moments that may produce sound and/or haptic feedback.
public enum FeedbackEvent: String, CaseIterable, Sendable {
    case navigation
    case buttonTap
    case tabSwitch
    case themeSwitch
    case cardExpand
    case filterSelect
    case success
    case error
    case trialActivated
    case mt5Connected
}

public enum HapticKind: String, Sendable, Equatable {
    case selection
    case lightImpact
    case softImpact
    case success
    case warning
    case error
}

/// Bundled original sounds (see ios/Treidify/Resources/Sounds/LICENSE.md).
public enum InterfaceSound: String, CaseIterable, Sendable {
    case tap = "treidify_tap"
    case tick = "treidify_tick"
    case toggle = "treidify_toggle"
    case success = "treidify_success"
    case error = "treidify_error"
    case activate = "treidify_activate"
    case connect = "treidify_connect"
}

public struct FeedbackDecision: Equatable, Sendable {
    public let sound: InterfaceSound?
    public let haptic: HapticKind?

    public static let none = FeedbackDecision(sound: nil, haptic: nil)
}

public struct FeedbackContext: Sendable, Equatable {
    public var soundsEnabled: Bool
    public var hapticsEnabled: Bool
    public var voiceOverRunning: Bool
    /// Seconds since the same event last produced feedback (nil = never).
    public var secondsSinceLastSameEvent: TimeInterval?

    public init(soundsEnabled: Bool, hapticsEnabled: Bool, voiceOverRunning: Bool, secondsSinceLastSameEvent: TimeInterval?) {
        self.soundsEnabled = soundsEnabled
        self.hapticsEnabled = hapticsEnabled
        self.voiceOverRunning = voiceOverRunning
        self.secondsSinceLastSameEvent = secondsSinceLastSameEvent
    }
}

/// Pure decision logic behind `InteractionFeedbackManager`, kept free of UIKit
/// so it can be unit-tested. Rules:
/// - Navigation and card expansion are haptic-only; sound is reserved for
///   deliberate actions and outcomes.
/// - Repeats of the same event within `minimumInterval` are suppressed.
/// - While VoiceOver runs, no interface sounds play and only outcome haptics
///   (success / error / trial / MT5) remain, so speech is never masked.
public enum FeedbackPolicy {
    public static let minimumInterval: TimeInterval = 0.12

    public static func profile(for event: FeedbackEvent) -> FeedbackDecision {
        switch event {
        case .navigation: FeedbackDecision(sound: nil, haptic: .selection)
        case .buttonTap: FeedbackDecision(sound: .tap, haptic: .lightImpact)
        case .tabSwitch: FeedbackDecision(sound: .tick, haptic: .selection)
        case .themeSwitch: FeedbackDecision(sound: .toggle, haptic: .softImpact)
        case .cardExpand: FeedbackDecision(sound: nil, haptic: .softImpact)
        case .filterSelect: FeedbackDecision(sound: .tick, haptic: .selection)
        case .success: FeedbackDecision(sound: .success, haptic: .success)
        case .error: FeedbackDecision(sound: .error, haptic: .error)
        case .trialActivated: FeedbackDecision(sound: .activate, haptic: .success)
        case .mt5Connected: FeedbackDecision(sound: .connect, haptic: .success)
        }
    }

    static func isOutcome(_ event: FeedbackEvent) -> Bool {
        [.success, .error, .trialActivated, .mt5Connected].contains(event)
    }

    public static func decide(_ event: FeedbackEvent, context: FeedbackContext) -> FeedbackDecision {
        if let since = context.secondsSinceLastSameEvent, since < minimumInterval { return .none }
        let base = profile(for: event)
        var sound = context.soundsEnabled ? base.sound : nil
        var haptic = context.hapticsEnabled ? base.haptic : nil
        if context.voiceOverRunning {
            sound = nil
            if !isOutcome(event) { haptic = nil }
        }
        return FeedbackDecision(sound: sound, haptic: haptic)
    }
}
