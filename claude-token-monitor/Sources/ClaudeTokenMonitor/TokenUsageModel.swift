import Foundation

struct TokenUsage {
    let inputTokens: Int
    let outputTokens: Int
    let cacheReadTokens: Int
    let cacheWriteTokens: Int
    let timestamp: Date

    var totalTokens: Int {
        inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
    }
}

struct UsageSnapshot {
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

func formatTokenCount(_ count: Int) -> String {
    if count >= 1_000_000 {
        return String(format: "%.1fM", Double(count) / 1_000_000)
    } else if count >= 1_000 {
        return String(format: "%.1fk", Double(count) / 1_000)
    }
    return "\(count)"
}

// Anthropic API response models
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

struct AnthropicTokenCountResponse: Codable {
    let inputTokens: Int

    enum CodingKeys: String, CodingKey {
        case inputTokens = "input_tokens"
    }
}
