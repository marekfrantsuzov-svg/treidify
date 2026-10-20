import Foundation

public enum TradeSide: String, Codable, Sendable {
    case buy, sell
}

/// A closed position as imported from MT5 deal history (read-only).
/// Monetary values are in account currency. Following MT5 conventions,
/// `commission`, `swap` and `fees` are signed (costs are negative).
public struct ClosedTrade: Identifiable, Hashable, Codable, Sendable {
    public let id: String
    public let symbol: String
    public let side: TradeSide
    public let volume: Double
    public let openTime: Date
    public let closeTime: Date
    public let openPrice: Double
    public let closePrice: Double
    /// Gross price P&L before costs.
    public let profit: Double
    public let commission: Double
    public let swap: Double
    public let fees: Double
    /// Initial stop-loss distance in account currency, if known (for R multiples).
    public let initialRisk: Double?

    public init(id: String, symbol: String, side: TradeSide, volume: Double, openTime: Date, closeTime: Date,
                openPrice: Double, closePrice: Double, profit: Double, commission: Double = 0, swap: Double = 0,
                fees: Double = 0, initialRisk: Double? = nil) {
        self.id = id
        self.symbol = symbol
        self.side = side
        self.volume = volume
        self.openTime = openTime
        self.closeTime = closeTime
        self.openPrice = openPrice
        self.closePrice = closePrice
        self.profit = profit
        self.commission = commission
        self.swap = swap
        self.fees = fees
        self.initialRisk = initialRisk
    }

    /// Realized P&L after costs.
    public var netProfit: Double { profit + commission + swap + fees }
    /// Trading costs as a positive number.
    public var costs: Double { -(commission + swap + fees) }
}

public struct CashTransaction: Identifiable, Hashable, Codable, Sendable {
    public enum Kind: String, Codable, Sendable { case deposit, withdrawal }
    public let id: String
    public let kind: Kind
    /// Always positive.
    public let amount: Double
    public let time: Date

    public init(id: String, kind: Kind, amount: Double, time: Date) {
        self.id = id
        self.kind = kind
        self.amount = amount
        self.time = time
    }

    public var signedAmount: Double { kind == .deposit ? amount : -amount }
}

public struct OpenPosition: Identifiable, Hashable, Codable, Sendable {
    public let id: String
    public let symbol: String
    public let side: TradeSide
    public let volume: Double
    public let openTime: Date
    public let openPrice: Double
    public let currentPrice: Double
    /// Unrealized P&L including accrued swap.
    public let floatingProfit: Double

    public init(id: String, symbol: String, side: TradeSide, volume: Double, openTime: Date, openPrice: Double,
                currentPrice: Double, floatingProfit: Double) {
        self.id = id
        self.symbol = symbol
        self.side = side
        self.volume = volume
        self.openTime = openTime
        self.openPrice = openPrice
        self.currentPrice = currentPrice
        self.floatingProfit = floatingProfit
    }
}

public struct TradingAccount: Identifiable, Hashable, Sendable {
    public let id: String
    public let displayName: String
    public let broker: String
    public let currency: String
    public let balance: Double
    public let equity: Double
    public let source: DataSource
    public let asOf: Date

    public init(id: String, displayName: String, broker: String, currency: String, balance: Double,
                equity: Double, source: DataSource, asOf: Date) {
        self.id = id
        self.displayName = displayName
        self.broker = broker
        self.currency = currency
        self.balance = balance
        self.equity = equity
        self.source = source
        self.asOf = asOf
    }
}

public struct TradingHistory: Sendable, Equatable {
    public let account: TradingAccount
    /// Balance before the first trade/cash transaction in the history.
    public let startingBalance: Double
    public let trades: [ClosedTrade]
    public let cashTransactions: [CashTransaction]
    public let openPositions: [OpenPosition]

    public init(account: TradingAccount, startingBalance: Double, trades: [ClosedTrade],
                cashTransactions: [CashTransaction], openPositions: [OpenPosition]) {
        self.account = account
        self.startingBalance = startingBalance
        self.trades = trades
        self.cashTransactions = cashTransactions
        self.openPositions = openPositions
    }
}

extension TradingHistory {
    /// Capital at the start of trading: starting balance plus cash flows dated
    /// before the first trade. Used as the base for trading-only drawdown %.
    public var tradingCapitalBase: Double {
        let firstTrade = trades.map(\.openTime).min() ?? .distantFuture
        return startingBalance + cashTransactions.filter { $0.time < firstTrade }.map(\.signedAmount).reduce(0, +)
    }
}
