import Foundation

enum APIError: LocalizedError {
    case noAPIKey
    case invalidResponse(Int)
    case decodingFailed(Error)
    case networkError(Error)
    case rateLimited

    var errorDescription: String? {
        switch self {
        case .noAPIKey:
            return "No API key configured. Open preferences to add your Anthropic API key."
        case .invalidResponse(let code):
            return "API returned status \(code). Check your API key in preferences."
        case .decodingFailed(let err):
            return "Failed to parse API response: \(err.localizedDescription)"
        case .networkError(let err):
            return "Network error: \(err.localizedDescription)"
        case .rateLimited:
            return "Rate limited by API. Will retry shortly."
        }
    }
}

class AnthropicAPIClient {
    private let baseURL = "https://api.anthropic.com/v1"
    private let apiVersion = "2023-06-01"

    var apiKey: String? {
        get { KeychainHelper.load(key: "anthropic_api_key") }
        set {
            if let key = newValue, !key.isEmpty {
                try? KeychainHelper.save(key: "anthropic_api_key", value: key)
            } else {
                KeychainHelper.delete(key: "anthropic_api_key")
            }
        }
    }

    // Fetch usage for the current billing period (month)
    func fetchUsage() async throws -> UsageSnapshot {
        guard let apiKey = apiKey, !apiKey.isEmpty else {
            throw APIError.noAPIKey
        }

        // Calculate current billing period (calendar month)
        let calendar = Calendar.current
        let now = Date()
        let components = calendar.dateComponents([.year, .month], from: now)
        let periodStart = calendar.date(from: components)!
        let periodEnd = calendar.date(byAdding: .month, value: 1, to: periodStart)!

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        let startStr = formatter.string(from: periodStart)
        let endStr = formatter.string(from: periodEnd)

        // Query usage endpoint
        var components2 = URLComponents(string: "\(baseURL)/usage")!
        components2.queryItems = [
            URLQueryItem(name: "start_time", value: startStr),
            URLQueryItem(name: "end_time", value: endStr)
        ]

        var request = URLRequest(url: components2.url!)
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue(apiVersion, forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        switch httpResponse.statusCode {
        case 200:
            break
        case 429:
            throw APIError.rateLimited
        default:
            throw APIError.invalidResponse(httpResponse.statusCode)
        }

        do {
            let usageResponse = try JSONDecoder().decode(AnthropicUsageResponse.self, from: data)
            return buildSnapshot(from: usageResponse, periodStart: periodStart, periodEnd: periodEnd)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    private func buildSnapshot(
        from response: AnthropicUsageResponse,
        periodStart: Date,
        periodEnd: Date
    ) -> UsageSnapshot {
        var totalUsed = 0
        var modelBreakdown: [String: Int] = [:]

        for record in response.data {
            let tokens = (record.inputTokens ?? 0)
                + (record.outputTokens ?? 0)
                + (record.cacheReadInputTokens ?? 0)
                + (record.cacheCreationInputTokens ?? 0)
            totalUsed += tokens
            if let model = record.model {
                modelBreakdown[model, default: 0] += tokens
            }
        }

        let limit = UserDefaults.standard.integer(forKey: "monthly_token_limit")
        let effectiveLimit = limit > 0 ? limit : Preferences.defaultMonthlyLimit

        return UsageSnapshot(
            used: totalUsed,
            limit: effectiveLimit,
            periodStart: periodStart,
            periodEnd: periodEnd,
            modelBreakdown: modelBreakdown
        )
    }
}
