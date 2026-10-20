import XCTest
@testable import TreidifyCore

final class IndicatorTests: XCTestCase {
    func testEMAMatchesSharedVector() throws {
        let ema = try XCTUnwrap(TestVectors.load("indicators.json")["ema"] as? [String: Any])
        let values = try XCTUnwrap(ema["values"] as? [Any]).map { try TestVectors.num($0) }
        let period = try XCTUnwrap(ema["period"] as? Int)
        let expected = try XCTUnwrap(ema["expected"] as? [Any]).map(TestVectors.optionalNum)
        let result = Indicators.ema(values, period: period)
        XCTAssertEqual(result.count, expected.count)
        for (r, e) in zip(result, expected) {
            if let e { XCTAssertEqual(try XCTUnwrap(r), e, accuracy: 1e-9) } else { XCTAssertNil(r) }
        }
    }

    func testATRMatchesSharedVector() throws {
        let atr = try XCTUnwrap(TestVectors.load("indicators.json")["atr"] as? [String: Any])
        let candles = try TestVectors.candles(atr["candles"])
        let period = try XCTUnwrap(atr["period"] as? Int)
        let trs = try XCTUnwrap(atr["expectedTrueRanges"] as? [Any]).map { try TestVectors.num($0) }
        XCTAssertEqual(Indicators.trueRanges(candles), trs)
        let expected = try XCTUnwrap(atr["expected"] as? [Any]).map(TestVectors.optionalNum)
        XCTAssertEqual(Indicators.atr(candles, period: period), expected)
    }

    func testEMAShorterThanPeriodIsAllNil() {
        XCTAssertEqual(Indicators.ema([1, 2], period: 3), [nil, nil])
    }

    func testTrueRangeUsesPreviousCloseGap() {
        let t = Date(timeIntervalSince1970: 0)
        let candles = [Candle(time: t, open: 10, high: 11, low: 9, close: 10),
                       Candle(time: t.addingTimeInterval(60), open: 14, high: 15, low: 13.5, close: 14)]
        XCTAssertEqual(Indicators.trueRanges(candles), [2, 5])
    }

    func testCandleValidationRejectsInconsistentBars() {
        let t = Date()
        XCTAssertNil(Candle(validatingTime: t, open: 10, high: 9, low: 8, close: 9.5))
        XCTAssertNil(Candle(validatingTime: t, open: .nan, high: 11, low: 9, close: 10))
        XCTAssertNil(Candle(validatingTime: t, open: 10, high: 11, low: 0, close: 10))
        XCTAssertNotNil(Candle(validatingTime: t, open: 10, high: 11, low: 9, close: 10.5))
    }

    func testAggregationBuildsHigherTimeframeOHLC() {
        let base = Date(timeIntervalSince1970: 3_600 * 100)
        var fives: [Candle] = []
        for i in 0..<12 {
            let v = Double(i)
            fives.append(Candle(time: base.addingTimeInterval(v * 300), open: v, high: v + 2, low: v - 1, close: v + 1, volume: 10))
        }
        let hour = CandleAggregator.aggregate(fives, into: .h1)
        XCTAssertEqual(hour.count, 1)
        XCTAssertEqual(hour[0].open, 0)
        XCTAssertEqual(hour[0].close, 12)
        XCTAssertEqual(hour[0].high, 13)
        XCTAssertEqual(hour[0].low, -1)
        XCTAssertEqual(hour[0].volume, 120)
        XCTAssertEqual(CandleAggregator.aggregate(fives, into: .m15).count, 4)
    }
}
