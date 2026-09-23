import Foundation

enum AlertAPIError: RetryClassifiableError {
    case networkUnavailable
    case invalidResponse
    case rejected(statusCode: Int)

    var isRetryable: Bool {
        switch self {
        case .networkUnavailable:
            return true
        case .rejected(let statusCode):
            return statusCode == 429 || [502, 503, 504].contains(statusCode)
        case .invalidResponse:
            return false
        }
    }
}

struct RemoteAlertAPI: AlertCreating {
    let baseURL: URL
    let bearerToken: String
    let session: URLSession
    let maxAttempts: Int

    init(baseURL: URL, bearerToken: String, maxAttempts: Int = 2) {
        self.baseURL = baseURL
        self.bearerToken = bearerToken
        self.maxAttempts = max(1, min(maxAttempts, 3))

        let configuration = URLSessionConfiguration.ephemeral
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.timeoutIntervalForRequest = 8
        configuration.timeoutIntervalForResource = 8
        configuration.urlCache = nil
        self.session = URLSession(configuration: configuration)
    }

    func createAlert(_ command: AlertCommand) async throws -> CreatedAlert {
        var urlRequest = URLRequest(url: baseURL.appending(path: "/v1/alerts"))
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue(command.idempotencyKey.uuidString, forHTTPHeaderField: "Idempotency-Key")
        urlRequest.setValue(UUID().uuidString, forHTTPHeaderField: "X-Request-ID")

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        urlRequest.httpBody = try encoder.encode(command.request)

        for attempt in 1...maxAttempts {
            let data: Data
            let response: URLResponse
            do {
                (data, response) = try await session.data(for: urlRequest)
            } catch is CancellationError {
                throw CancellationError()
            } catch is URLError {
                if attempt < maxAttempts { continue }
                throw AlertAPIError.networkUnavailable
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                throw AlertAPIError.invalidResponse
            }
            guard [200, 201].contains(httpResponse.statusCode) else {
                let error = AlertAPIError.rejected(statusCode: httpResponse.statusCode)
                guard error.isRetryable, attempt < maxAttempts else { throw error }
                try await Task.sleep(nanoseconds: retryDelayNanoseconds(httpResponse))
                continue
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            do {
                let payload = try decoder.decode(CreateAlertResponse.self, from: data)
                return CreatedAlert(eventID: payload.eventID, serverTriggeredAt: payload.serverTriggeredAt)
            } catch {
                throw AlertAPIError.invalidResponse
            }
        }
        throw AlertAPIError.networkUnavailable
    }

    private func retryDelayNanoseconds(_ response: HTTPURLResponse) -> UInt64 {
        guard let value = response.value(forHTTPHeaderField: "Retry-After"),
              let seconds = Double(value) else { return 250_000_000 }
        let boundedSeconds = min(max(seconds, 0), 2)
        return UInt64(boundedSeconds * 1_000_000_000)
    }
}

private struct CreateAlertResponse: Decodable {
    let eventID: UUID
    let serverTriggeredAt: Date

    private enum CodingKeys: String, CodingKey {
        case eventID = "eventId"
        case serverTriggeredAt
    }
}
