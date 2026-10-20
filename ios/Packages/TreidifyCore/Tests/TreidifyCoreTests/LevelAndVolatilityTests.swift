import XCTest
@testable import TreidifyCore

final class LevelAndVolatilityTests: XCTestCase {
    private func rangeCandles() throws -> [Candle] {
        let cases = try XCTUnwrap(TestVectors.load("bias.json")["cases"] as? [[String: Any]])
        return try TestVectors.candles(cases.first { $0["name"] as? String == "range_equal_highs" }?["candles"])
    }

    func testRangeProducesSupportResistanceAndUnsweptLiquidity() throws {
        let analysis = LevelDetector().analyze(try rangeCandles())
        let resistance = try XCTUnwrap(analysis.zones(of: .resistance).first)
        XCTAssertEqual(resistance.upper, 110.1, accuracy: 1e-9)
        XCTAssertGreaterThanOrEqual(resistance.touches, 2)
        let support = try XCTUnwrap(analysis.zones(of: .support).first)
        XCTAssertEqual(support.lower, 99.9, accuracy: 1e-9)
        // Equal highs at 110.1 were never exceeded afterwards: buy-side liquidity.
        XCTAssertEqual(try XCTUnwrap(analysis.zones(of: .buySideLiquidity).first).upper, 110.1, accuracy: 1e-9)
        XCTAssertEqual(try XCTUnwrap(analysis.zones(of: .sellSideLiquidity).first).lower, 99.9, accuracy: 1e-9)
        XCTAssertNil(analysis.unavailableReason)
    }

    func testSweptHighsAreNotLiquidity() throws {
        var candles = try rangeCandles()
        let last = candles.last!
        candles.append(Candle(time: last.time.addingTimeInterval(3_600), open: last.close, high: 111, low: last.close - 0.1, close: 106))
        let analysis = LevelDetector().analyze(candles)
        XCTAssertTrue(analysis.zones(of: .buySideLiquidity).isEmpty)
    }

    func testLevelsRequireEnoughCandles() throws {
        let analysis = LevelDetector().analyze(Array(try rangeCandles().prefix(20)))
        XCTAssertTrue(analysis.zones.isEmpty)
        XCTAssertNotNil(analysis.unavailableReason)
    }

    func testFibonacciOfLatestLeg() throws {
        let cases = try XCTUnwrap(TestVectors.load("bias.json")["cases"] as? [[String: Any]])
        let candles = try TestVectors.candles(cases[0]["candles"])
        let fib = try XCTUnwrap(FibonacciRetracement.latestLeg(in: candles))
        // Latest swing high 134.1 (index 72) comes before latest swing low 125.9 (index 80): a down leg.
        XCTAssertEqual(fib.direction, .down)
        XCTAssertEqual(fib.levels.first?.price ?? 0, 125.9, accuracy: 1e-9)
        XCTAssertEqual(fib.levels.last?.price ?? 0, 134.1, accuracy: 1e-9)
        XCTAssertEqual(fib.levels.first { $0.ratio == 0.5 }?.price ?? 0, 130.0, accuracy: 1e-9)
    }

    func testVolatilityRegime() {
        let t0 = Date(timeIntervalSince1970: 0)
        // 150 quiet bars then 20 wide bars → elevated.
        var candles: [Candle] = []
        for i in 0..<170 {
            let r = i < 150 ? 1.0 : 6.0
            candles.append(Candle(time: t0.addingTimeInterval(Double(i) * 300), open: 100, high: 100 + r / 2, low: 100 - r / 2, close: 100))
        }
        XCTAssertEqual(VolatilityAnalysis.analyze(candles).regime, .elevated)
        XCTAssertEqual(VolatilityAnalysis.analyze(Array(candles.prefix(50))).regime, .insufficientData)
    }
}
