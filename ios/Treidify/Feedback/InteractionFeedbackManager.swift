import AVFoundation
import Observation
import TreidifyCore
import UIKit

/// Plays Treidify's restrained interface sounds and haptics.
///
/// Decisions (what plays, throttling, VoiceOver behaviour) live in the pure,
/// unit-tested `FeedbackPolicy`; this class only performs them.
/// - Sounds use the `.ambient` audio session category with `.mixWithOthers`,
///   so they are silenced by the Ring/Silent switch and never interrupt the
///   user's audio.
/// - Haptics use UIKit feedback generators, which respect the system
///   "System Haptics" setting automatically.
/// - Nothing here is triggered by scrolling, chart inspection or data refresh;
///   call sites only invoke it for deliberate interactions and outcomes.
@MainActor
@Observable
final class InteractionFeedbackManager {
    static let soundVolume: Float = 0.35

    @ObservationIgnored private let settings: AppSettings
    @ObservationIgnored private var players: [InterfaceSound: AVAudioPlayer] = [:]
    @ObservationIgnored private var lastPlayed: [FeedbackEvent: Date] = [:]
    @ObservationIgnored private var audioSessionConfigured = false
    @ObservationIgnored private let selectionGenerator = UISelectionFeedbackGenerator()
    @ObservationIgnored private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    @ObservationIgnored private let softGenerator = UIImpactFeedbackGenerator(style: .soft)
    @ObservationIgnored private let notificationGenerator = UINotificationFeedbackGenerator()

    init(settings: AppSettings) {
        self.settings = settings
    }

    func play(_ event: FeedbackEvent) {
        let now = Date()
        let context = FeedbackContext(
            soundsEnabled: settings.soundsEnabled,
            hapticsEnabled: settings.hapticsEnabled,
            voiceOverRunning: UIAccessibility.isVoiceOverRunning,
            secondsSinceLastSameEvent: lastPlayed[event].map { now.timeIntervalSince($0) }
        )
        let decision = FeedbackPolicy.decide(event, context: context)
        guard decision != .none else { return }
        lastPlayed[event] = now
        if let haptic = decision.haptic { perform(haptic) }
        if let sound = decision.sound { play(sound) }
    }

    /// Warms up the Taptic Engine before a likely interaction (e.g. on appear).
    func prepare() {
        guard settings.hapticsEnabled else { return }
        selectionGenerator.prepare()
        lightGenerator.prepare()
    }

    private func perform(_ haptic: HapticKind) {
        switch haptic {
        case .selection: selectionGenerator.selectionChanged()
        case .lightImpact: lightGenerator.impactOccurred(intensity: 0.6)
        case .softImpact: softGenerator.impactOccurred(intensity: 0.7)
        case .success: notificationGenerator.notificationOccurred(.success)
        case .warning: notificationGenerator.notificationOccurred(.warning)
        case .error: notificationGenerator.notificationOccurred(.error)
        }
    }

    private func play(_ sound: InterfaceSound) {
        configureAudioSessionIfNeeded()
        guard let player = players[sound] ?? loadPlayer(for: sound) else { return }
        player.currentTime = 0
        player.play()
    }

    private func configureAudioSessionIfNeeded() {
        guard !audioSessionConfigured else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            audioSessionConfigured = true
        } catch {
            // Sound is optional polish; failing to configure it must never affect the app.
        }
    }

    private func loadPlayer(for sound: InterfaceSound) -> AVAudioPlayer? {
        guard let url = Bundle.main.url(forResource: sound.rawValue, withExtension: "wav"),
              let player = try? AVAudioPlayer(contentsOf: url)
        else { return nil }
        player.volume = Self.soundVolume
        player.prepareToPlay()
        players[sound] = player
        return player
    }
}
