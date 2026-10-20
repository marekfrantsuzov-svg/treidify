import XCTest
@testable import TreidifyCore

final class MarketBiasEngineTests: XCTestCase {
    func testSharedBiasVectors() throws {
        let cases = try XCTUnwrap(TestVectors.load("bias.json")["cases"] as? [[String: Any]])
        XCTAssertEqual(cases.count, 4)
        let engine = MarketBiasEngine()
        for c in cases {
            let name = c["name"] as? String ?? "?"
            let expected = try XCTUnwrap(c["expected"] as? [String: Any])
            let result = engine.evaluate(try TestVectors.candles(c["candles"]), timeframe: .h1)
            XCTAssertEqual(result.bias.rawValue, expected["bias"] as? String, name)
            if let structure = expected["structure"] as? String {
                XCTAssertEqual(result.evidence?.structure.rawValue, structure, name)
                let ev = try XCTUnwrap(result.evidence, name)
                XCTAssertEqual(ev.latestSwingHigh.price, try TestVectors.num(expected["latestSwingHigh"]), accuracy: 1e-9, name)
                XCTAssertEqual(ev.previousSwingHigh.price, try TestVectors.num(expected["previousSwingHigh"]), accuracy: 1e-9, name)
                XCTAssertEqual(ev.latestSwingLow.price, try TestVectors.num(expected["latestSwingLow"]), accuracy: 1e-9, name)
                XCTAssertEqual(ev.previousSwingLow.price, try TestVectors.num(expected["previousSwingLow"]), accuracy: 1e-9, name)
            } else {
                XCTAssertNil(result.evidence, name)
            }
            let inv = TestVectors.optionalNum(expected["invalidationLevel"])
            if let inv { XCTAssertEqual(try XCTUnwrap(result.invalidationLevel, name), inv, accuracy: 1e-9, name) }
            else { XCTAssertNil(result.invalidationLevel, name) }
            XCTAssertFalse(result.rationale.isEmpty, name)
        }
    }

    func testBiasIsDeterministic() throws {
        let cases = try XCTUnwrap(TestVectors.load("bias.json")["cases"] as? [[String: Any]])
        let candles = try TestVectors.candles(cases[0]["candles"])
        let engine = MarketBiasEngine()
        XCTAssertEqual(engine.evaluate(candles, timeframe: .h4), engine.evaluate(candles, timeframe: .h4))
    }

    func testSwingsNeverIncludeUnconfirmedTrailingBars() throws {
        let cases = try XCTUnwrap(TestVectors.load("bias.json")["cases"] as? [[String: Any]])
        let candles = try TestVectors.candles(cases[0]["candles"])
        let swings = SwingDetector.detect(candles, strength: 2)
        XCTAssertTrue(swings.allSatisfy { $0.index <= candles.count - 3 })
    }

    func testRationaleReferencesCalculation() throws {
        let cases = try XCTUnwrap(TestVectors.load("bias.json")["cases"] as? [[String: Any]])
        let result = MarketBiasEngine().evaluate(try TestVectors.candles(cases[0]["candles"]), timeframe: .h1)
        XCTAssertTrue(result.rationale.joined().contains("EMA(50)"))
        XCTAssertTrue(result.invalidationDescription?.contains("125.9") ?? false)
    }
}
