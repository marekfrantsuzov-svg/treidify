import Foundation
import XCTest
@testable import TreidifyCore

/// Loads the shared JSON vectors in shared/test-vectors (also used by the Python backend).
enum TestVectors {
    static var directory: URL {
        // .../ios/Packages/TreidifyCore/Tests/TreidifyCoreTests/TestVectors.swift → repo root
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("shared/test-vectors")
    }

    static func load(_ name: String) throws -> [String: Any] {
        let data = try Data(contentsOf: directory.appendingPathComponent(name))
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    static func candles(_ raw: Any?) throws -> [Candle] {
        let rows = try XCTUnwrap(raw as? [[String: Any]])
        return try rows.map { row in
            Candle(time: Date(timeIntervalSince1970: try num(row["t"])),
                   open: try num(row["o"]), high: try num(row["h"]), low: try num(row["l"]), close: try num(row["c"]))
        }
    }

    static func num(_ v: Any?) throws -> Double {
        if let d = v as? Double { return d }
        if let i = v as? Int { return Double(i) }
        if let n = v as? NSNumber { return n.doubleValue }
        throw XCTSkip("expected number, got \(String(describing: v))")
    }

    static func optionalNum(_ v: Any?) -> Double? {
        if v == nil || v is NSNull { return nil }
        return try? num(v)
    }
}
