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

    // Fetch all three windows (monthly / weekly / hourly) in parallel.
    func fetchAllWindows() async throws -> UsageWindows {
        guard let key = apiKey, !key.isEmpty else {
            throw APIError.noAPIKey
        }

        let now = Date()
        let calendar = Calendar.current

        // Monthly: current billing calendar month
        let monthComps = calendar.dateComponents([.year, .month], from: now)
        let monthStart = calendar.date(from: monthComps)!
        let monthEnd   = calendar.date(byAdding: .month, value: 1, to: monthStart)!

        // Weekly: rolling 7 days
        let weekStart  = calendar.date(byAdding: .day, value: -7, to: now)!
        let weekEnd    = calendar.date(byAdding: .day, value: 1, to: now)!

        // Hourly: rolling configurable window (default 8 h)
        let hoursBack  = Preferences.hourlyWindowHours
        let hourStart  = calendar.date(byAdding: .hour, value: -hoursBack, to: now)!
        let hourEnd    = now

        // Fire all three requests concurrently
        async let monthlyRaw = fetchWindow(start: monthStart, end: monthEnd, apiKey: key)
        async let weeklyRaw  = fetchWindow(start: weekStart,  end: weekEnd,  apiKey: key)
        async let hourlyRaw  = fetchWindow(start: hourStart,  end: hourEnd,  apiKey: key)

        let (mRaw, wRaw, hRaw) = try await (monthlyRaw, weeklyRaw, hourlyRaw)

        return UsageWindows(
            monthly: buildSnapshot(mRaw, kind: .monthly, start: monthStart, end: monthEnd,
                                   limit: Preferences.monthlyTokenLimit),
            weekly:  buildSnapshot(wRaw, kind: .weekly,  start: weekStart,  end: weekEnd,
                                   limit: Preferences.weeklyTokenLimit),
            hourly:  buildSnapshot(hRaw, kind: .hourly,  start: hourStart,  end: hourEnd,
                                   limit: Preferences.hourlyTokenLimit),
            fetchedAt: now
        )
    }

    // MARK: - Private helpers

    private func fetchWindow(start: Date, end: Date, apiKey: String) async throws -> AnthropicUsageResponse {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]

        var comps = URLComponents(string: "\(baseURL)/usage")!
        comps.queryItems = [
            URLQueryItem(name: "start_time", value: formatter.string(from: start)),
            URLQueryItem(name: "end_time",   value: formatter.string(from: end))
        ]

        var request = URLRequest(url: comps.url!)
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue(apiVersion, forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }
        switch http.statusCode {
        case 200: break
        case 429: throw APIError.rateLimited
        default:  throw APIError.invalidResponse(http.statusCode)
        }

        do {
            return try JSONDecoder().decode(AnthropicUsageResponse.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    private func buildSnapshot(
        _ response: AnthropicUsageResponse,
        kind: WindowKind,
        start: Date,
        end: Date,
        limit: Int
    ) -> UsageSnapshot {
        var totalUsed = 0
        var breakdown: [String: Int] = [:]

        for record in response.data {
            let tokens = (record.inputTokens ?? 0)
                + (record.outputTokens ?? 0)
                + (record.cacheReadInputTokens ?? 0)
                + (record.cacheCreationInputTokens ?? 0)
            totalUsed += tokens
            if let model = record.model {
                breakdown[model, default: 0] += tokens
            }
        }

        return UsageSnapshot(
            kind: kind,
            used: totalUsed,
            limit: limit,
            periodStart: start,
            periodEnd: end,
            modelBreakdown: breakdown
        )
    }
}
