import Foundation

/// Market data access. Licensed provider adapters (Milestone 3) conform to this;
/// Milestone 1 ships `DemoMarketDataRepository` and `UnconfiguredMarketDataRepository`.
public protocol MarketDataRepository: Sendable {
    func quote(for instrument: Instrument) async throws -> Sourced<Quote>
    func candles(for instrument: Instrument, timeframe: Timeframe, count: Int) async throws -> Sourced<[Candle]>
}

public protocol IntelligenceRepository: Sendable {
    func stories(limit: Int) async throws -> Sourced<[NewsStory]>
    func calendar(from: Date, to: Date) async throws -> Sourced<[EconomicEvent]>
}

/// Read-only trading-account access (MT5 bridge or history import, Milestone 4).
public protocol TradingAccountRepository: Sendable {
    func connectedAccounts() async throws -> [TradingAccount]
    func history(for accountID: String) async throws -> TradingHistory
}

/// Used when demo mode is off and no licensed provider is configured: every call
/// fails honestly so the UI shows "Unavailable" instead of invented numbers.
public struct UnconfiguredMarketDataRepository: MarketDataRepository {
    public init() {}
    public func quote(for instrument: Instrument) async throws -> Sourced<Quote> {
        throw DataProviderError.providerNotConfigured("market data")
    }
    public func candles(for instrument: Instrument, timeframe: Timeframe, count: Int) async throws -> Sourced<[Candle]> {
        throw DataProviderError.providerNotConfigured("market data")
    }
}

public struct UnconfiguredIntelligenceRepository: IntelligenceRepository {
    public init() {}
    public func stories(limit: Int) async throws -> Sourced<[NewsStory]> {
        throw DataProviderError.providerNotConfigured("news")
    }
    public func calendar(from: Date, to: Date) async throws -> Sourced<[EconomicEvent]> {
        throw DataProviderError.providerNotConfigured("economic calendar")
    }
}

public struct NoTradingAccountRepository: TradingAccountRepository {
    public init() {}
    public func connectedAccounts() async throws -> [TradingAccount] { [] }
    public func history(for accountID: String) async throws -> TradingHistory {
        throw DataProviderError.providerNotConfigured("MT5 account")
    }
}
