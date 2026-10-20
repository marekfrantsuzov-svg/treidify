import XCTest
@testable import TreidifyCore

final class PerformanceCalculatorTests: XCTestCase {
    private var utc: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }

    private func vectorTrades() throws -> ([ClosedTrade], [String: Any], Double) {
        let v = try TestVectors.load("performance.json")
        let rows = try XCTUnwrap(v["trades"] as? [[String: Any]])
        let trades = try rows.map { r in
            ClosedTrade(id: r["id"] as! String, symbol: r["symbol"] as! String,
                        side: TradeSide(rawValue: r["side"] as! String)!, volume: try TestVectors.num(r["volume"]),
                        openTime: Date(timeIntervalSince1970: try TestVectors.num(r["openTime"])),
                        closeTime: Date(timeIntervalSince1970: try TestVectors.num(r["closeTime"])),
                        openPrice: try TestVectors.num(r["openPrice"]), closePrice: try TestVectors.num(r["closePrice"]),
                        profit: try TestVectors.num(r["profit"]), commission: try TestVectors.num(r["commission"]),
                        swap: try TestVectors.num(r["swap"]), fees: try TestVectors.num(r["fees"]))
        }
        return (trades, try XCTUnwrap(v["expected"] as? [String: Any]), try TestVectors.num(v["startingEquity"]))
    }

    func testSharedPerformanceVector() throws {
        let (trades, e, start) = try vectorTrades()
        let m = PerformanceCalculator(calendar: utc).metrics(for: trades.shuffled(), startingEquity: start)
        XCTAssertEqual(m.tradeCount, e["tradeCount"] as? Int)
        XCTAssertEqual(m.wins, e["wins"] as? Int)
        XCTAssertEqual(m.losses, e["losses"] as? Int)
        XCTAssertEqual(m.breakevens, e["breakevens"] as? Int)
        XCTAssertEqual(m.maxConsecutiveWins, e["maxConsecutiveWins"] as? Int)
        XCTAssertEqual(m.maxConsecutiveLosses, e["maxConsecutiveLosses"] as? Int)
        let pairs: [(Double?, String)] = [
            (m.netProfit, "netProfit"), (m.grossProfit, "grossProfit"), (m.grossLoss, "grossLoss"),
            (m.totalCosts, "totalCosts"), (m.winRate, "winRate"), (m.profitFactor, "profitFactor"),
            (m.expectancy, "expectancy"), (m.averageWinner, "averageWinner"), (m.averageLoser, "averageLoser"),
            (m.rewardToRisk, "rewardToRisk"), (m.maxDrawdown, "maxDrawdown"), (m.maxDrawdownPercent, "maxDrawdownPercent")
        ]
        for (value, key) in pairs {
            XCTAssertEqual(try XCTUnwrap(value, key), try TestVectors.num(e[key]), accuracy: 1e-9, key)
        }
    }

    func testEmptyAndAllWinners() {
        XCTAssertEqual(PerformanceCalculator().metrics(for: []), .empty)
        let t = Date()
        let win = ClosedTrade(id: "a", symbol: "XAUUSD", side: .buy, volume: 1, openTime: t, closeTime: t, openPrice: 1, closePrice: 2, profit: 10)
        let m = PerformanceCalculator().metrics(for: [win])
        XCTAssertNil(m.profitFactor, "profit factor is undefined without losses, never infinity")
        XCTAssertEqual(m.winRate, 1)
    }

    func testPeriodsUseCloseTime() throws {
        let (trades, _, _) = try vectorTrades()
        let calc = PerformanceCalculator(calendar: utc)
        let lastClose = trades.map(\.closeTime).max()!
        XCTAssertEqual(calc.trades(trades, in: .day, now: lastClose).map(\.id), ["t6"])
        XCTAssertEqual(calc.realizedPnL(trades, period: .day, now: lastClose), 54, accuracy: 1e-9)
        XCTAssertEqual(calc.trades(trades, in: .month, now: lastClose).count, 6)
        XCTAssertEqual(calc.trades(trades, in: .all, now: lastClose).count, 6)
    }

    func testEquityCurveExcludesCashFlows() throws {
        let (trades, _, _) = try vectorTrades()
        let curve = PerformanceCalculator(calendar: utc).equityCurve(for: trades, startingBalance: 1_000)
        XCTAssertEqual(curve.count, 7)
        XCTAssertEqual(curve.last!.tradingEquity, 1_252, accuracy: 1e-9)
    }

    func testGroupingBySymbol() throws {
        let (trades, _, _) = try vectorTrades()
        let groups = PerformanceCalculator(calendar: utc).bySymbol(trades)
        XCTAssertEqual(groups.map(\.key), ["XAUUSD", "EURUSD"])
        XCTAssertEqual(groups[0].metrics.netProfit, 95 - 55 + 195 + 0, accuracy: 1e-9)
    }

    func testDemoHistoryIsDeterministicAndBalanced() {
        let now = Date(timeIntervalSince1970: 1_790_000_000)
        let a = DemoAccountFactory.history(now: now), b = DemoAccountFactory.history(now: now)
        XCTAssertEqual(a, b)
        let realized = a.trades.map(\.netProfit).reduce(0, +)
        XCTAssertEqual(a.account.balance, (10_000 + realized - 500), accuracy: 0.01)
        XCTAssertEqual(a.tradingCapitalBase, 10_000, accuracy: 1e-9)
        XCTAssertTrue(a.account.source.isDemo)
    }
}
