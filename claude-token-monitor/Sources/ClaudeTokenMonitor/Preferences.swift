import Foundation

enum Preferences {
    // Default monthly token limit for Claude Pro (~5B tokens/month is generous; adjust per plan)
    // Claude Pro plan provides substantial usage - users can override this
    static let defaultMonthlyLimit = 50_000_000 // 50M tokens as a baseline

    static var refreshInterval: TimeInterval {
        get { UserDefaults.standard.double(forKey: "refresh_interval").nonZeroOr(60) }
        set { UserDefaults.standard.set(newValue, forKey: "refresh_interval") }
    }

    static var monthlyTokenLimit: Int {
        get {
            let v = UserDefaults.standard.integer(forKey: "monthly_token_limit")
            return v > 0 ? v : defaultMonthlyLimit
        }
        set { UserDefaults.standard.set(newValue, forKey: "monthly_token_limit") }
    }

    static var showInMenuBar: Bool {
        get { UserDefaults.standard.bool(forKey: "show_in_menu_bar") }
        set { UserDefaults.standard.set(newValue, forKey: "show_in_menu_bar") }
    }

    static var launchAtLogin: Bool {
        get { UserDefaults.standard.bool(forKey: "launch_at_login") }
        set { UserDefaults.standard.set(newValue, forKey: "launch_at_login") }
    }
}

extension Double {
    func nonZeroOr(_ fallback: Double) -> Double {
        self > 0 ? self : fallback
    }
}
