import Foundation

enum Preferences {
    // MARK: - Default limits (user-configurable in Preferences window)
    static let defaultMonthlyLimit     = 50_000_000   // 50M tokens / month
    static let defaultWeeklyLimit      = 10_000_000   // 10M tokens / 7 days
    static let defaultHourlyLimit      = 1_000_000    // 1M tokens / rolling window
    static let defaultHourlyWindowHours = 8           // width of the rolling window (hours)

    // MARK: - Limits

    static var monthlyTokenLimit: Int {
        get { UserDefaults.standard.integer(forKey: "monthly_token_limit").nonZeroOr(defaultMonthlyLimit) }
        set { UserDefaults.standard.set(newValue, forKey: "monthly_token_limit") }
    }

    static var weeklyTokenLimit: Int {
        get { UserDefaults.standard.integer(forKey: "weekly_token_limit").nonZeroOr(defaultWeeklyLimit) }
        set { UserDefaults.standard.set(newValue, forKey: "weekly_token_limit") }
    }

    static var hourlyTokenLimit: Int {
        get { UserDefaults.standard.integer(forKey: "hourly_token_limit").nonZeroOr(defaultHourlyLimit) }
        set { UserDefaults.standard.set(newValue, forKey: "hourly_token_limit") }
    }

    /// Width of the rolling "hourly" window in hours (1–24).
    static var hourlyWindowHours: Int {
        get { UserDefaults.standard.integer(forKey: "hourly_window_hours").nonZeroOr(defaultHourlyWindowHours) }
        set { UserDefaults.standard.set(newValue, forKey: "hourly_window_hours") }
    }

    // MARK: - Behaviour

    static var refreshInterval: TimeInterval {
        get { UserDefaults.standard.double(forKey: "refresh_interval").nonZeroOr(60) }
        set { UserDefaults.standard.set(newValue, forKey: "refresh_interval") }
    }

    static var launchAtLogin: Bool {
        get { UserDefaults.standard.bool(forKey: "launch_at_login") }
        set { UserDefaults.standard.set(newValue, forKey: "launch_at_login") }
    }
}

extension Double {
    func nonZeroOr(_ fallback: Double) -> Double { self > 0 ? self : fallback }
}

extension Int {
    func nonZeroOr(_ fallback: Int) -> Int { self > 0 ? self : fallback }
}
