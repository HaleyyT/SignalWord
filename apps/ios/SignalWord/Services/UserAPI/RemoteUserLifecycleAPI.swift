import Foundation

enum UserAPIError: Error, Sendable {
    case unavailable
    case rejected(statusCode: Int)
    case invalidResponse
}

struct TrustedContactProjection: Decodable, Equatable, Sendable {
    let contactID: UUID
    let name: String
    let status: String
    let confirmationExpiresAt: Date?

    enum CodingKeys: String, CodingKey {
        case contactID = "contactId"
        case name
        case status
        case confirmationExpiresAt
    }
}

struct AlertStatusProjection: Decodable, Equatable, Sendable {
    let eventID: UUID
    let state: String
    let delivery: String
    let resolvedAt: Date?

    enum CodingKeys: String, CodingKey {
        case eventID = "eventId"
        case state
        case delivery
        case resolvedAt
    }
}

struct ResolvedAlertProjection: Decodable, Equatable, Sendable {
    let eventID: UUID
    let state: String
    let resolvedAt: Date

    enum CodingKeys: String, CodingKey {
        case eventID = "eventId"
        case state
        case resolvedAt
    }
}

struct RemoteUserLifecycleAPI: Sendable {
    let baseURL: URL
    let sessionManager: SupabaseSessionManager
    let session: URLSession

    init(baseURL: URL, sessionManager: SupabaseSessionManager) {
        self.baseURL = baseURL
        self.sessionManager = sessionManager
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 8
        configuration.timeoutIntervalForResource = 8
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.urlCache = nil
        session = URLSession(configuration: configuration)
    }

    func prepareIdentity() async throws {
        _ = try await sessionManager.accessToken(createIfMissing: true)
    }

    func saveContact(name: String, email: String) async throws -> TrustedContactProjection {
        try await send(
            path: "/v1/contacts",
            method: "POST",
            body: ContactInput(name: name, email: email),
            response: TrustedContactProjection.self
        )
    }

    func getContact() async throws -> TrustedContactProjection? {
        do {
            return try await send(
                path: "/v1/contact", method: "GET", body: Optional<EmptyBody>.none,
                response: TrustedContactProjection.self
            )
        } catch UserAPIError.rejected(statusCode: 404) {
            return nil
        }
    }

    func getAlertStatus(eventID: UUID) async throws -> AlertStatusProjection {
        try await send(
            path: "/v1/alerts/\(eventID.uuidString.lowercased())", method: "GET",
            body: Optional<EmptyBody>.none, response: AlertStatusProjection.self
        )
    }

    func resolve(eventID: UUID) async throws -> ResolvedAlertProjection {
        try await send(
            path: "/v1/alerts/\(eventID.uuidString.lowercased())/resolve", method: "POST",
            body: Optional<EmptyBody>.none, response: ResolvedAlertProjection.self
        )
    }

    func appendLocation(eventID: UUID, location: AlertLocationSnapshot) async throws {
        let _: LocationAcceptedProjection = try await send(
            path: "/v1/alerts/\(eventID.uuidString.lowercased())/locations", method: "POST",
            body: LocationInput(location: location), response: LocationAcceptedProjection.self
        )
    }

    func deleteAccount() async throws {
        let _: DeletionReceipt = try await send(
            path: "/v1/data", method: "DELETE", body: Optional<EmptyBody>.none,
            response: DeletionReceipt.self
        )
        try await sessionManager.deleteLocalSession()
    }

    private func send<Body: Encodable & Sendable, Output: Decodable & Sendable>(
        path: String,
        method: String,
        body: Body?,
        response: Output.Type
    ) async throws -> Output {
        for attempt in 0...1 {
            let token = try await sessionManager.accessToken(
                createIfMissing: false,
                forceRefresh: attempt == 1
            )
            var request = URLRequest(url: baseURL.appending(path: path))
            request.httpMethod = method
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Request-ID")
            if let body {
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = try JSONEncoder().encode(body)
            }
            let data: Data
            let urlResponse: URLResponse
            do { (data, urlResponse) = try await session.data(for: request) }
            catch { throw UserAPIError.unavailable }
            guard let http = urlResponse as? HTTPURLResponse else { throw UserAPIError.invalidResponse }
            if http.statusCode == 401, attempt == 0 { continue }
            guard (200..<300).contains(http.statusCode) else {
                throw UserAPIError.rejected(statusCode: http.statusCode)
            }
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            do { return try decoder.decode(response, from: data) }
            catch { throw UserAPIError.invalidResponse }
        }
        throw UserAPIError.unavailable
    }
}

private struct ContactInput: Encodable, Sendable { let name: String; let email: String }
private struct EmptyBody: Encodable, Sendable {}
private struct LocationInput: Encodable, Sendable { let location: AlertLocationSnapshot }
private struct LocationAcceptedProjection: Decodable, Sendable {
    let accepted: Bool
    let receivedAt: Date
}
private struct DeletionReceipt: Decodable, Sendable { let deletionID: UUID
    enum CodingKeys: String, CodingKey { case deletionID = "deletionId" }
}
