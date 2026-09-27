import Foundation

/// Only new-account signup consumes a short-lived CAPTCHA token. Session refresh
/// and alert submission must never depend on presenting a web challenge.
public enum SignupVerification {
    public static func validToken(_ token: String) -> Bool {
        !token.isEmpty && token.utf8.count <= 2048 && !token.contains(where: { $0.isWhitespace })
    }

    public static func requestBody(token: String) throws -> Data {
        guard validToken(token) else { throw ValidationError.invalidToken }
        return try JSONSerialization.data(withJSONObject: [
            "data": ["signalword_client": true],
            "gotrue_meta_security": ["captcha_token": token],
        ])
    }

    public enum ValidationError: Error { case invalidToken }
}
