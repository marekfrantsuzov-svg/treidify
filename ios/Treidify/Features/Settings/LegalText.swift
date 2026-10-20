import Foundation

/// In-app legal copy. The privacy policy and terms are DRAFTS pending legal
/// review (docs/COMPLIANCE.md) and must be finalised before any release.
enum LegalText {
    static let disclaimer = "Treidify provides market information, educational analysis, and trading performance tools. It does not provide personalized investment advice, execute trades, or guarantee investment outcomes. Trading involves risk, including possible loss of capital."

    static let shortDisclaimer = "Information and education only. Not investment advice. Trading involves risk, including possible loss of capital."

    static let notOffered = [
        "Treidify never places trades or manages money.",
        "It does not offer signals, broker referrals or profit promises.",
        "Market views are conditional analysis, not instructions."
    ]

    static let riskDisclosure = """
    \(disclaimer)

    Leveraged products such as CFDs and spot gold carry a high level of risk and may not be suitable for everyone. Past performance, including your own historical results shown in Treidify, does not indicate future results.

    Market bias, levels and scenarios in Treidify are produced by documented, deterministic calculations on the data shown. They are conditional descriptions of market structure, not forecasts or recommendations.

    Data can be delayed, stale or unavailable. Each screen shows the data source and its status; demo data is always labelled DEMO.

    Treidify is not affiliated with Apple, MetaQuotes, any broker, Bloomberg, Forex Factory or any data provider.
    """

    static let privacyPolicy = """
    DRAFT — pending legal review. Not a final policy.

    What this build stores: your app preferences (appearance, sounds, haptics, demo mode, your trading rulebook) on this device only.

    What this build does not do: it has no user accounts, sends no personal data to Treidify servers, and contains no third-party analytics or advertising SDKs.

    Planned for later milestones (this policy will be updated before they ship): account sign-in (Sign in with Apple, Google), read-only MetaTrader 5 trade history, server-side analytics and AI explanations, data export and account deletion.
    """

    static let termsOfService = """
    DRAFT — pending legal review. Not final terms.

    Treidify is provided for information and education. You are solely responsible for your trading decisions. Treidify does not execute trades, hold funds, or provide personalized investment advice.

    Paid subscriptions, when introduced, will be sold through the App Store and will never renew without your explicit purchase.
    """

    static let dataSources = """
    This build includes no licensed live data provider.

    Demo mode uses generated fixtures (prices, educational sample stories, sample calendar entries and a sample account). None of it is real market data or real news.

    Licensed market-data, economic-calendar and news providers will be listed here, with their attribution, once contracts are in place.
    """
}
