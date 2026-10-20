import Foundation

public enum TradingSession: String, CaseIterable, Sendable, Identifiable {
    case sydney
    case tokyo
    case london
    case newYork

    public var id: String { rawValue }

    public var name: String {
        switch self {
        case .sydney: "Sydney"
        case .tokyo: "Tokyo"
        case .london: "London"
        case .newYork: "New York"
        }
    }

    /// Conventional local-time trading hours. Daylight saving is handled by the
    /// time zone, so UTC open times shift automatically through the year.
    var timeZoneIdentifier: String {
        switch self {
        case .sydney: "Australia/Sydney"
        case .tokyo: "Asia/Tokyo"
        case .london: "Europe/London"
        case .newYork: "America/New_York"
        }
    }

    var localHours: Range<Int> {
        switch self {
        case .sydney: 7..<16
        case .tokyo: 9..<18
        case .london: 8..<17
        case .newYork: 8..<17
        }
    }
}

public enum MarketStatus: Equatable, Sendable {
    case open(activeSessions: [TradingSession])
    /// Daily maintenance break (17:00–18:00 New York time, Monday–Thursday).
    case dailyBreak(reopensAt: Date)
    case weekendClosed(reopensAt: Date)

    public var isOpen: Bool {
        if case .open = self { return true }
        return false
    }
}

/// Spot gold / FX trading-hours model.
///
/// The weekly market runs from Sunday 18:00 to Friday 17:00 New York time with
/// a daily break 17:00–18:00. This matches common broker schedules for XAUUSD
/// but individual brokers differ, and exchange holidays are not modelled yet
/// (see docs/DATA_PROVIDERS.md). A licensed provider's session feed should
/// replace this model where available.
public struct SessionClock: Sendable {
    private let newYork: TimeZone

    public init() {
        newYork = TimeZone(identifier: "America/New_York")!
    }

    public func isSessionActive(_ session: TradingSession, at date: Date) -> Bool {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: session.timeZoneIdentifier)!
        let weekday = cal.component(.weekday, from: date) // 1 = Sunday
        guard (2...6).contains(weekday) else { return false }
        return session.localHours.contains(cal.component(.hour, from: date))
    }

    public func activeSessions(at date: Date) -> [TradingSession] {
        TradingSession.allCases.filter { isSessionActive($0, at: date) }
    }

    public func status(at date: Date) -> MarketStatus {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = newYork
        let weekday = cal.component(.weekday, from: date)
        let hour = cal.component(.hour, from: date)

        func at(daysAhead: Int, hour: Int) -> Date {
            let startOfDay = cal.startOfDay(for: date)
            let day = cal.date(byAdding: .day, value: daysAhead, to: startOfDay)!
            return cal.date(bySettingHour: hour, minute: 0, second: 0, of: day)!
        }

        switch weekday {
        case 7: // Saturday
            return .weekendClosed(reopensAt: at(daysAhead: 1, hour: 18))
        case 1 where hour < 18: // Sunday before open
            return .weekendClosed(reopensAt: at(daysAhead: 0, hour: 18))
        case 6 where hour >= 17: // Friday after close
            return .weekendClosed(reopensAt: at(daysAhead: 2, hour: 18))
        case 2...5 where hour == 17:
            return .dailyBreak(reopensAt: at(daysAhead: 0, hour: 18))
        default:
            return .open(activeSessions: activeSessions(at: date))
        }
    }

    /// The most recent moment the market was open at or before `date`.
    public func lastOpenMoment(atOrBefore date: Date) -> Date {
        var probe = date
        for _ in 0..<(3 * 24 * 12) {
            if status(at: probe).isOpen { return probe }
            probe = probe.addingTimeInterval(-300)
        }
        return probe
    }
}
