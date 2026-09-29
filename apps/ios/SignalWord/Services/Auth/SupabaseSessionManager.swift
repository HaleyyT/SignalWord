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
    private let send: @Sendable (URLRequest) async throws -> (Data, URLResponse)
    private let load: @Sendable () throws -> DeviceCredentialStore.Session?
    private let save: @Sendable (DeviceCredentialStore.Session) throws -> Void
    private let clear: @Sendable () throws -> Void
    private var generation = 0
    private let now: @Sendable () -> Date
    private var tokenTask: Task<DeviceCredentialStore.Session, Error>?

    init(
        supabaseURL: URL,
        publishableKey: String,
        session: URLSession = SupabaseSessionManager.makeSession(),
        now: @escaping @Sendable () -> Date = { Date() },
        load: @escaping @Sendable () throws -> DeviceCredentialStore.Session? = { try DeviceCredentialStore.loadSession() },
        save: @escaping @Sendable (DeviceCredentialStore.Session) throws -> Void = { try DeviceCredentialStore.saveSession($0) },
        clear: @escaping @Sendable () throws -> Void = { try DeviceCredentialStore.clear() },
        transport: (@Sendable (URLRequest) async throws -> (Data, URLResponse))? = nil
    ) {
        self.supabaseURL = supabaseURL
        self.publishableKey = publishableKey
        self.send = transport ?? { try await session.data(for: $0) }
        self.load = load
        self.save = save
        self.clear = clear
        self.now = now
    }

    func accessToken(createIfMissing: Bool, forceRefresh: Bool = false, captchaToken: String? = nil) async throws -> String {
        if let tokenTask { return try await tokenTask.value.accessToken }
        if let stored = try load() {
            if !forceRefresh && stored.expiresAt.timeIntervalSince(now()) > 120 {
                return stored.accessToken
            }
            let requestGeneration = generation
            let task = Task { try await self.refresh(stored, generation: requestGeneration) }
            tokenTask = task
            defer { if generation == requestGeneration { tokenTask = nil } }
            return try await task.value.accessToken
        }
        guard createIfMissing else { throw SessionError.unavailable }
        // Closed pilot: missing credentials require explicit invited email sign-in.
        // Never create an anonymous account, including from an App Intent.
        throw SessionError.verificationRequired
    }

    func requestInvitedCode(email: String, captchaToken: String) async throws {
        guard tokenTask == nil, try load() == nil else { throw SessionError.configuration }
        let requestGeneration = generation
        var request = request(path: "/auth/v1/otp")
        request.httpMethod = "POST"
        request.httpBody = try InvitedSignIn.requestBody(email: email, captchaToken: captchaToken)
        let (_, response) = try await send(request)
        guard generation == requestGeneration, !Task.isCancelled else { throw CancellationError() }
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw SessionError.unavailable
        }
    }

    func verifyInvitedCode(email: String, code: String) async throws {
        guard tokenTask == nil, try load() == nil else { throw SessionError.configuration }
        var request = request(path: "/auth/v1/verify")
        request.httpMethod = "POST"
        request.httpBody = try InvitedSignIn.verificationBody(email: email, code: code)
        let requestGeneration = generation
        let task = Task { try await self.perform(request, fallbackRefreshToken: nil, generation: requestGeneration) }
        tokenTask = task
        defer { if generation == requestGeneration { tokenTask = nil } }
        _ = try await task.value
    }

    func deleteLocalSession() throws {
        // Invalidate outstanding responses even if their transport ignores cancellation.
        // Otherwise a late refresh/signup could recreate credentials after deletion.
        generation += 1
        tokenTask?.cancel()
        tokenTask = nil
        try clear()
    }

    private func refresh(_ existing: DeviceCredentialStore.Session, generation: Int) async throws -> DeviceCredentialStore.Session {
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
        return try await perform(request, fallbackRefreshToken: existing.refreshToken, generation: generation)
    }

    private func request(path: String) -> URLRequest {
        var request = URLRequest(url: supabaseURL.appending(path: path))
        request.setValue(publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }

    private func perform(
        _ request: URLRequest,
        fallbackRefreshToken: String?,
        generation requestGeneration: Int
    ) async throws -> DeviceCredentialStore.Session {
        let data: Data
        let response: URLResponse
        do { (data, response) = try await send(request) }
        catch { throw SessionError.unavailable }
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw SessionError.unavailable
        }
        let decoded: AuthResponse
        do { decoded = try JSONDecoder().decode(AuthResponse.self, from: data) }
        catch { throw SessionError.invalidResponse }
        let refreshToken = decoded.refreshToken ?? fallbackRefreshToken
        guard !decoded.accessToken.isEmpty, let refreshToken, !refreshToken.isEmpty,
              decoded.expiresIn > 0 else { throw SessionError.invalidResponse }
        let stored = DeviceCredentialStore.Session(
            accessToken: decoded.accessToken,
            refreshToken: refreshToken,
            expiresAt: now().addingTimeInterval(TimeInterval(decoded.expiresIn))
        )
        guard generation == requestGeneration, !Task.isCancelled else { throw CancellationError() }
        try save(stored)
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
