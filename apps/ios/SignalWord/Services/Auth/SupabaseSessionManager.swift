import Foundation

enum SessionError: RetryClassifiableError {
    var isRetryable: Bool { self != .configuration && self != .verificationRequired }
    case verificationRequired
    case configuration
    case unavailable
    case invalidResponse
}

actor SupabaseSessionManager {
    private let supabaseURL: URL
    private let publishableKey: String
    private let session: URLSession
    private let now: @Sendable () -> Date
    private var tokenTask: Task<DeviceCredentialStore.Session, Error>?

    init(
        supabaseURL: URL,
        publishableKey: String,
        session: URLSession = SupabaseSessionManager.makeSession(),
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.supabaseURL = supabaseURL
        self.publishableKey = publishableKey
        self.session = session
        self.now = now
    }

    func accessToken(createIfMissing: Bool, forceRefresh: Bool = false, captchaToken: String? = nil) async throws -> String {
        if let tokenTask { return try await tokenTask.value.accessToken }
        if let stored = try DeviceCredentialStore.loadSession() {
            if !forceRefresh && stored.expiresAt.timeIntervalSince(now()) > 120 {
                return stored.accessToken
            }
            let task = Task { try await self.refresh(stored) }
            tokenTask = task
            defer { tokenTask = nil }
            return try await task.value.accessToken
        }
        guard createIfMissing else { throw SessionError.unavailable }
        guard let captchaToken, SignupVerification.validToken(captchaToken) else { throw SessionError.verificationRequired }
        let task = Task { try await self.signInAnonymously(captchaToken: captchaToken) }
        tokenTask = task
        defer { tokenTask = nil }
        return try await task.value.accessToken
    }

    func deleteLocalSession() throws { try DeviceCredentialStore.clear() }

    private func signInAnonymously(captchaToken: String) async throws -> DeviceCredentialStore.Session {
        var request = request(path: "/auth/v1/signup")
        request.httpMethod = "POST"
        request.httpBody = try SignupVerification.requestBody(token: captchaToken)
        return try await perform(request, fallbackRefreshToken: nil)
    }

    private func refresh(_ existing: DeviceCredentialStore.Session) async throws -> DeviceCredentialStore.Session {
        var components = URLComponents(
            url: supabaseURL.appending(path: "/auth/v1/token"), resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token")]
        guard let url = components?.url else { throw SessionError.configuration }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": existing.refreshToken])
        return try await perform(request, fallbackRefreshToken: existing.refreshToken)
    }

    private func request(path: String) -> URLRequest {
        var request = URLRequest(url: supabaseURL.appending(path: path))
        request.setValue(publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }

    private func perform(
        _ request: URLRequest,
        fallbackRefreshToken: String?
    ) async throws -> DeviceCredentialStore.Session {
        let data: Data
        let response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch { throw SessionError.unavailable }
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw SessionError.unavailable
        }
        let decoded = try JSONDecoder().decode(AuthResponse.self, from: data)
        let refreshToken = decoded.refreshToken ?? fallbackRefreshToken
        guard !decoded.accessToken.isEmpty, let refreshToken, !refreshToken.isEmpty,
              decoded.expiresIn > 0 else { throw SessionError.invalidResponse }
        let stored = DeviceCredentialStore.Session(
            accessToken: decoded.accessToken,
            refreshToken: refreshToken,
            expiresAt: now().addingTimeInterval(TimeInterval(decoded.expiresIn))
        )
        try DeviceCredentialStore.saveSession(stored)
        return stored
    }

    private static func makeSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 8
        configuration.timeoutIntervalForResource = 8
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.urlCache = nil
        return URLSession(configuration: configuration)
    }
}

private struct AuthResponse: Decodable {
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
    }
}
