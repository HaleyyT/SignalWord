import Foundation

/// Foreground identity verification consumes a short-lived CAPTCHA token. Session refresh
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

/// Supabase email OTP protocol. No account creation and no credentials in URLs.
public enum InvitedSignIn {
    public static func normalizedEmail(_ email: String) throws -> String {
        let value = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard value.utf8.count <= 254, value.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil else {
            throw SignupVerification.ValidationError.invalidToken
        }
        return value
    }
    public static func requestBody(email: String, captchaToken: String) throws -> Data {
        guard SignupVerification.validToken(captchaToken) else { throw SignupVerification.ValidationError.invalidToken }
        return try JSONSerialization.data(withJSONObject: [
            "email": normalizedEmail(email), "create_user": false,
            "gotrue_meta_security": ["captcha_token": captchaToken]
        ])
    }
    public static func verificationBody(email: String, code: String) throws -> Data {
        // Accept provider-configured 6–10 digit codes; expiry/single-use is server-owned.
        guard (6...10).contains(code.count), code.allSatisfy({ $0.isASCII && $0.isNumber }) else {
            throw SignupVerification.ValidationError.invalidToken
        }
        return try JSONSerialization.data(withJSONObject: ["email": normalizedEmail(email), "token": code, "type": "email"])
    }
}
