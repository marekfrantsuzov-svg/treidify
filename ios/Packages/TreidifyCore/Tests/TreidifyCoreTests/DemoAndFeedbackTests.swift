import XCTest
@testable import TreidifyCore

final class DemoAndFeedbackTests: XCTestCase {
    func testDemoMarketDataIsLabelledConsistentAndDeterministic() async throws {
        let now = Date(timeIntervalSince1970: 1_792_500_000) // a weekday
        let repo = DemoMarketDataRepository(now: { now })
        let h1 = try await repo.candles(for: .xauusd, timeframe: .h1, count: 200)
        let m5 = try await repo.candles(for: .xauusd, timeframe: .m5, count: 200)
        let quote = try await repo.quote(for: .xauusd)
        XCTAssertTrue(h1.source.isDemo && m5.source.isDemo && quote.source.isDemo)
        XCTAssertEqual(h1.value.count, 200)
        XCTAssertEqual(h1.value.last!.close, m5.value.last!.close, accuracy: 1e-9, "higher timeframes aggregate the same series")
        XCTAssertEqual(quote.value.price, m5.value.last!.close, accuracy: 1e-9)
        let again = try await repo.candles(for: .xauusd, timeframe: .h1, count: 200)
        XCTAssertEqual(h1.value, again.value)
        XCTAssertTrue(h1.value.allSatisfy { $0.high >= max($0.open, $0.close) && $0.low <= min($0.open, $0.close) })
        // The bias engine can evaluate every matrix timeframe on demo data.
        for tf in Timeframe.biasTimeframes {
            let candles = try await repo.candles(for: .xauusd, timeframe: tf, count: 150).value
            XCTAssertGreaterThanOrEqual(candles.count, 60, tf.rawValue)
            XCTAssertNotEqual(MarketBiasEngine().evaluate(candles, timeframe: tf).bias, .insufficientData, tf.rawValue)
        }
    }

    func testUnconfiguredRepositoryFailsHonestly() async {
        do {
            _ = try await UnconfiguredMarketDataRepository().quote(for: .xauusd)
            XCTFail("must not return data")
        } catch {
            XCTAssertEqual(error as? DataProviderError, .providerNotConfigured("market data"))
        }
    }

    func testFeedbackPolicy() {
        let all = FeedbackContext(soundsEnabled: true, hapticsEnabled: true, voiceOverRunning: false, secondsSinceLastSameEvent: nil)
        XCTAssertEqual(FeedbackPolicy.decide(.buttonTap, context: all), FeedbackDecision(sound: .tap, haptic: .lightImpact))
        XCTAssertNil(FeedbackPolicy.decide(.navigation, context: all).sound, "navigation is haptic-only")
        XCTAssertNil(FeedbackPolicy.decide(.cardExpand, context: all).sound)

        var throttled = all
        throttled.secondsSinceLastSameEvent = 0.05
        XCTAssertEqual(FeedbackPolicy.decide(.filterSelect, context: throttled), .none)

        var muted = all
        muted.soundsEnabled = false
        XCTAssertNil(FeedbackPolicy.decide(.success, context: muted).sound)
        XCTAssertEqual(FeedbackPolicy.decide(.success, context: muted).haptic, .success)

        var voiceOver = all
        voiceOver.voiceOverRunning = true
        XCTAssertEqual(FeedbackPolicy.decide(.tabSwitch, context: voiceOver), .none)
        XCTAssertEqual(FeedbackPolicy.decide(.mt5Connected, context: voiceOver), FeedbackDecision(sound: nil, haptic: .success))
    }

    func testEverySoundHasABundledFile() throws {
        let soundsDir = TestVectors.directory.deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("ios/Treidify/Resources/Sounds")
        for sound in InterfaceSound.allCases {
            XCTAssertTrue(FileManager.default.fileExists(atPath: soundsDir.appendingPathComponent("\(sound.rawValue).wav").path), sound.rawValue)
        }
    }
}
