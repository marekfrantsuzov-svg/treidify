import Foundation

public enum ImpactDirection: String, Codable, Sendable, CaseIterable {
    case bullish
    case bearish
    case mixed
    case uncertain

    public var label: String {
        switch self {
        case .bullish: "Bullish"
        case .bearish: "Bearish"
        case .mixed: "Mixed"
        case .uncertain: "Uncertain"
        }
    }
}

/// A potential impact on one market. `direction` must be `.uncertain` unless the
/// supporting evidence justifies a direction.
public struct ImpactAssessment: Hashable, Codable, Sendable {
    public let direction: ImpactDirection
    public let explanation: String

    public init(direction: ImpactDirection, explanation: String) {
        self.direction = direction
        self.explanation = explanation
    }
}

public enum NewsCategory: String, Codable, Sendable, CaseIterable {
    case geopolitics, monetaryPolicy, inflation, employment, treasuryYields, trade
    case centralBanks, financialStability, energy, economy

    public var label: String {
        switch self {
        case .geopolitics: "Geopolitics"
        case .monetaryPolicy: "US monetary policy"
        case .inflation: "Inflation"
        case .employment: "Employment"
        case .treasuryYields: "Treasury yields"
        case .trade: "Trade"
        case .centralBanks: "Central banks"
        case .financialStability: "Financial stability"
        case .energy: "Oil & energy"
        case .economy: "Economy"
        }
    }
}

/// One intelligence story, structured to answer the nine questions in the
/// product specification (what happened, source, timing, gold and USD impact,
/// mechanisms, evidence both ways, what to watch, what would invalidate it).
public struct NewsStory: Identifiable, Hashable, Sendable {
    public let id: String
    public let headline: String
    public let whatHappened: String
    /// The organisation that originally reported the story.
    public let originalSource: String
    public let sourceURL: URL?
    public let publishedAt: Date
    /// When the underlying event happened or is scheduled, if different.
    public let eventTime: Date?
    public let categories: [NewsCategory]
    public let goldImpact: ImpactAssessment
    public let usdImpact: ImpactAssessment
    public let mechanisms: [String]
    public let supportingEvidence: [String]
    public let opposingEvidence: [String]
    public let watchItems: [String]
    public let invalidation: String
    /// Observed price reaction, kept separate from theoretical expectation.
    public let observedReaction: String?
    public let provider: DataSource

    public init(id: String, headline: String, whatHappened: String, originalSource: String, sourceURL: URL?,
                publishedAt: Date, eventTime: Date?, categories: [NewsCategory], goldImpact: ImpactAssessment,
                usdImpact: ImpactAssessment, mechanisms: [String], supportingEvidence: [String],
                opposingEvidence: [String], watchItems: [String], invalidation: String,
                observedReaction: String?, provider: DataSource) {
        self.id = id
        self.headline = headline
        self.whatHappened = whatHappened
        self.originalSource = originalSource
        self.sourceURL = sourceURL
        self.publishedAt = publishedAt
        self.eventTime = eventTime
        self.categories = categories
        self.goldImpact = goldImpact
        self.usdImpact = usdImpact
        self.mechanisms = mechanisms
        self.supportingEvidence = supportingEvidence
        self.opposingEvidence = opposingEvidence
        self.watchItems = watchItems
        self.invalidation = invalidation
        self.observedReaction = observedReaction
        self.provider = provider
    }
}

public enum EventImportance: Int, Codable, Sendable, Comparable, CaseIterable {
    case low = 1, medium, high

    public static func < (lhs: Self, rhs: Self) -> Bool { lhs.rawValue < rhs.rawValue }

    public var label: String {
        switch self {
        case .low: "Low"
        case .medium: "Medium"
        case .high: "High"
        }
    }
}

public enum EconomicEventCategory: String, Codable, Sendable, CaseIterable {
    case cpi, ppi, pce, nfp, unemployment, fomc, fedSpeech, gdp, retailSales, pmi, other
}

public enum ReleaseStatus: String, Codable, Sendable {
    case scheduled, released, revised, delayed, cancelled

    public var label: String { rawValue.capitalized }
}

public struct EconomicEvent: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let category: EconomicEventCategory
    public let currency: String
    public let importance: EventImportance
    public let scheduledAt: Date
    /// Unit suffix for values, e.g. "%" or "K".
    public let unit: String
    public let forecast: Double?
    public let previous: Double?
    public let revisedPrevious: Double?
    public let actual: Double?
    public let status: ReleaseStatus
    public let source: DataSource

    public init(id: String, title: String, category: EconomicEventCategory, currency: String,
                importance: EventImportance, scheduledAt: Date, unit: String, forecast: Double?,
                previous: Double?, revisedPrevious: Double?, actual: Double?, status: ReleaseStatus,
                source: DataSource) {
        self.id = id
        self.title = title
        self.category = category
        self.currency = currency
        self.importance = importance
        self.scheduledAt = scheduledAt
        self.unit = unit
        self.forecast = forecast
        self.previous = previous
        self.revisedPrevious = revisedPrevious
        self.actual = actual
        self.status = status
        self.source = source
    }

    /// actual − forecast, when both exist.
    public var surprise: Double? {
        guard let actual, let forecast else { return nil }
        return actual - forecast
    }

    /// Neutral explanation of forecast versus actual. It deliberately avoids
    /// asserting a price direction: the reaction depends on yields, the dollar,
    /// expectations already priced in and revisions.
    public var surpriseExplanation: String {
        guard let actual else {
            if let forecast {
                return "Forecast is \(Self.format(forecast))\(unit). The forecast is the consensus expectation; the market reacts mostly to the difference between it and the actual figure."
            }
            return "No consensus forecast is available from the provider."
        }
        guard let forecast else { return "Released at \(Self.format(actual))\(unit). No forecast was available to compare against." }
        let diff = actual - forecast
        let relation = diff > 0 ? "above" : diff < 0 ? "below" : "in line with"
        var text = "Actual \(Self.format(actual))\(unit) came in \(relation) the \(Self.format(forecast))\(unit) forecast."
        if let revisedPrevious, let previous, revisedPrevious != previous {
            text += " The previous reading was revised from \(Self.format(previous))\(unit) to \(Self.format(revisedPrevious))\(unit), which also affects interpretation."
        }
        text += " A surprise does not have a fixed effect on gold; watch Treasury yields and the dollar for the observed reaction."
        return text
    }

    static func format(_ v: Double) -> String { v.formatted(.number.precision(.fractionLength(0...2))) }
}
