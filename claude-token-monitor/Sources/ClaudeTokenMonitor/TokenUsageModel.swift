import Foundation

// MARK: - Window kinds

enum WindowKind {
    case monthly, weekly, hourly

    var displayName: String {
        switch self {
        case .monthly: return "Monthly"
        case .weekly:  return "Weekly"
        case .hourly:  return "Hourly"
        }
    }
}

// MARK: - Single window snapshot

struct UsageSnapshot {
    let kind: WindowKind
    let used: Int
    let limit: Int
    let periodStart: Date
    let periodEnd: Date
    let modelBreakdown: [String: Int]

    var remaining: Int { max(0, limit - used) }
    var percentageUsed: Double { limit > 0 ? Double(used) / Double(limit) : 0 }
    var percentageRemaining: Double { 1.0 - percentageUsed }

    var formattedUsed: String { formatTokenCount(used) }
    var formattedRemaining: String { formatTokenCount(remaining) }
    var formattedLimit: String { formatTokenCount(limit) }
}

// MARK: - All three windows together

struct UsageWindows {
    let monthly: UsageSnapshot
    let weekly: UsageSnapshot
    let hourly: UsageSnapshot
    let fetchedAt: Date

    var all: [(WindowKind, UsageSnapshot)] {
        [(.monthly, monthly), (.weekly, weekly), (.hourly, hourly)]
    }

    /// The window closest to its limit — drives the menu bar icon colour.
    var mostConstrained: (kind: WindowKind, snapshot: UsageSnapshot) {
        all.min(by: { $0.1.percentageRemaining < $1.1.percentageRemaining })
            ?? (.monthly, monthly)
    }
}

// MARK: - Helpers

func formatTokenCount(_ count: Int) -> String {
    if count >= 1_000_000 {
        return String(format: "%.1fM", Double(count) / 1_000_000)
    } else if count >= 1_000 {
        return String(format: "%.1fk", Double(count) / 1_000)
    }
    return "\(count)"
}

// MARK: - Anthropic API response models

struct AnthropicUsageResponse: Codable {
    let data: [UsageRecord]
}

struct UsageRecord: Codable {
    let model: String?
    let inputTokens: Int?
    let outputTokens: Int?
    let cacheReadInputTokens: Int?
    let cacheCreationInputTokens: Int?

    enum CodingKeys: String, CodingKey {
        case model
        case inputTokens = "input_tokens"
        case outputTokens = "output_tokens"
        case cacheReadInputTokens = "cache_read_input_tokens"
        case cacheCreationInputTokens = "cache_creation_input_tokens"
    }
}
