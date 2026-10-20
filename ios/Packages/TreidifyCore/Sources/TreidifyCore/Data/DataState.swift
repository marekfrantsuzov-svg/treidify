import Foundation

/// Where a piece of data came from. Every value shown in the UI carries one.
public struct DataSource: Hashable, Codable, Sendable {
    public let name: String
    /// True for generated fixtures. Demo data must always render with a visible label.
    public let isDemo: Bool
    /// Licence / attribution text required by the provider, if any.
    public let attribution: String?

    public init(name: String, isDemo: Bool, attribution: String? = nil) {
        self.name = name
        self.isDemo = isDemo
        self.attribution = attribution
    }

    public static let demoFixture = DataSource(
        name: "Treidify demo fixtures",
        isDemo: true,
        attribution: "Generated sample data for demonstration. Not live market data."
    )
}

/// The display state every live-data component must support.
public enum DataFreshness: Equatable, Sendable {
    case loading
    /// Data is current within the policy's live threshold.
    case live
    /// Data is usable but older than live (or the provider is delayed by contract).
    case delayed(by: TimeInterval)
    /// Data is too old to be treated as current.
    case stale(since: Date)
    /// The market is closed; the value is the last available one.
    case marketClosed(lastUpdate: Date)
    case unavailable(reason: String)
    case error(message: String)

    public var isUsable: Bool {
        switch self {
        case .live, .delayed, .marketClosed: true
        case .loading, .stale, .unavailable, .error: false
        }
    }

    public var label: String {
        switch self {
        case .loading: "Loading"
        case .live: "Live"
        case .delayed: "Delayed"
        case .stale: "Stale"
        case .marketClosed: "Market closed"
        case .unavailable: "Unavailable"
        case .error: "Error"
        }
    }
}

/// Converts the age of a value into a `DataFreshness`.
public struct FreshnessPolicy: Sendable, Equatable {
    public let liveThreshold: TimeInterval
    public let staleThreshold: TimeInterval

    public init(liveThreshold: TimeInterval, staleThreshold: TimeInterval) {
        precondition(staleThreshold >= liveThreshold, "stale threshold must be >= live threshold")
        self.liveThreshold = liveThreshold
        self.staleThreshold = staleThreshold
    }

    /// Streaming quotes: live within 30 s, stale after 15 min.
    public static let quotes = FreshnessPolicy(liveThreshold: 30, staleThreshold: 15 * 60)

    /// Candles: the latest bar may be up to one bar old and still be live.
    public static func candles(_ timeframe: Timeframe) -> FreshnessPolicy {
        FreshnessPolicy(liveThreshold: timeframe.seconds, staleThreshold: timeframe.seconds * 3)
    }

    /// News and calendar: live within 10 min, stale after 2 h.
    public static let news = FreshnessPolicy(liveThreshold: 10 * 60, staleThreshold: 2 * 3_600)

    public func classify(asOf: Date, now: Date, marketOpen: Bool = true) -> DataFreshness {
        if !marketOpen { return .marketClosed(lastUpdate: asOf) }
        let age = max(0, now.timeIntervalSince(asOf))
        if age <= liveThreshold { return .live }
        if age <= staleThreshold { return .delayed(by: age) }
        return .stale(since: asOf)
    }
}

/// A value together with its provenance.
public struct Sourced<Value: Sendable>: Sendable {
    public let value: Value
    public let source: DataSource
    /// Time the provider says the value is valid for (not when we received it).
    public let asOf: Date

    public init(value: Value, source: DataSource, asOf: Date) {
        self.value = value
        self.source = source
        self.asOf = asOf
    }
}

extension Sourced: Equatable where Value: Equatable {}

public enum DataProviderError: Error, Equatable, Sendable, LocalizedError {
    /// No licensed provider has been configured for this data type yet.
    case providerNotConfigured(String)
    case invalidResponse(String)
    case network(String)

    public var errorDescription: String? {
        switch self {
        case .providerNotConfigured(let what): "No licensed \(what) provider is configured."
        case .invalidResponse(let detail): "The provider returned invalid data: \(detail)"
        case .network(let detail): "Network error: \(detail)"
        }
    }
}
