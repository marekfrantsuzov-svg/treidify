import XCTest
import TreidifyCore
@testable import Treidify

@MainActor
final class HomeViewModelTests: XCTestCase {
    /// Tuesday 2026-10-20 10:00 UTC: market open, London session.
    private let weekday = Date(timeIntervalSince1970: 1_792_490_400)

    func testDemoDashboardLoadsLabelledData() async {
        let now = weekday
        let vm = HomeViewModel(market: DemoMarketDataRepository(now: { now }),
                               intelligence: DemoIntelligenceRepository(now: { now }),
                               accounts: DemoTradingAccountRepository(now: { now }),
                               now: { now })
        await vm.load()

        XCTAssertTrue(vm.isDemo)
        XCTAssertNotNil(vm.gold.quote)
        XCTAssertEqual(vm.gold.source?.isDemo, true)
        XCTAssertEqual(vm.bias[Instrument.xauusd.symbol]?.count, Timeframe.biasTimeframes.count)
        XCTAssertEqual(vm.advisory?.kind, .highImpactEvent, "demo calendar has a high-impact USD event in 3 hours")
        XCTAssertNotNil(vm.chart.value)
        guard case .loaded(let account?) = vm.account else { return XCTFail("expected demo account") }
        XCTAssertGreaterThan(account.metrics.tradeCount, 0)
        XCTAssertEqual(vm.insight?.isDemo, true)
    }

    func testWithoutProvidersNothingIsInvented() async {
        let now = weekday
        let vm = HomeViewModel(market: UnconfiguredMarketDataRepository(),
                               intelligence: UnconfiguredIntelligenceRepository(),
                               accounts: NoTradingAccountRepository(),
                               now: { now })
        await vm.load()

        XCTAssertNil(vm.gold.quote)
        XCTAssertNil(vm.dxy.quote)
        if case .unavailable = vm.gold.freshness {} else { XCTFail("expected unavailable, got \(vm.gold.freshness)") }
        XCTAssertEqual(vm.advisory?.kind, .dataUnavailable)
        XCTAssertNil(vm.insight)
        if case .failed = vm.chart {} else { XCTFail("chart must fail without a provider") }
        if case .loaded(nil) = vm.account {} else { XCTFail("no account connected") }
    }

    func testWeekendShowsMarketClosedAdvisory() async {
        let saturday = Date(timeIntervalSince1970: 1_792_238_400) // Saturday 2026-10-17 12:00 UTC
        let vm = HomeViewModel(market: DemoMarketDataRepository(now: { saturday }),
                               intelligence: DemoIntelligenceRepository(now: { saturday }),
                               accounts: NoTradingAccountRepository(),
                               now: { saturday })
        await vm.load()
        XCTAssertEqual(vm.advisory?.kind, .marketClosed)
        XCTAssertFalse(vm.marketStatus.isOpen)
    }

    func testSettingsDefaultsAreRestrained() {
        let defaults = UserDefaults(suiteName: "treidify.tests.\(UUID().uuidString)")!
        let settings = AppSettings(defaults: defaults)
        XCTAssertFalse(settings.soundsEnabled, "sounds are opt-in")
        XCTAssertTrue(settings.hapticsEnabled)
        XCTAssertTrue(settings.needsOnboarding)
    }
}
