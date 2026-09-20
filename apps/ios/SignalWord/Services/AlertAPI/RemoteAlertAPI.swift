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
            return statusCode == 429 || statusCode == 503
        case .invalidResponse:
            return false
        }
    }
}

struct RemoteAlertAPI: AlertCreating {
    let baseURL: URL
    let bearerToken: String
    let session: URLSession = .shared

    func createAlert(_ request: AlertCreateRequest) async throws -> CreatedAlert {
        var urlRequest = URLRequest(url: baseURL.appending(path: "/v1/alerts"))
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue(request.idempotencyKey.uuidString, forHTTPHeaderField: "Idempotency-Key")
        urlRequest.setValue(UUID().uuidString, forHTTPHeaderField: "X-Request-ID")

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        urlRequest.httpBody = try encoder.encode(request)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch is URLError {
            throw AlertAPIError.networkUnavailable
        }
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AlertAPIError.invalidResponse
        }
        guard [200, 201].contains(httpResponse.statusCode) else {
            throw AlertAPIError.rejected(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let payload = try decoder.decode(CreateAlertResponse.self, from: data)
        return CreatedAlert(eventID: payload.eventID, serverTriggeredAt: payload.serverTriggeredAt)
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
