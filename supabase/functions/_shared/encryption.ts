const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domain-separated proofs bind a low-entropy email code to one join attempt.
 * A database-only leak must not permit offline enumeration of six-digit codes.
 */
export function createJoinCodeProtection(encodedKey: string, fingerprintKey: string, keyVersion: number) {
  if (!Number.isInteger(keyVersion) || keyVersion < 1 || keyVersion > 32767) throw new Error("Invalid join key version");
  function validate(attemptId: string, invitationHash: string, code: string) {
    if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !/^[0-9a-f]{64}$/.test(invitationHash) || !/^\d{6}$/.test(code)) {
      throw new Error("Invalid join proof");
    }
  }
  function withdrawalToken(attemptId: string, invitationHash: string) {
    validate(attemptId, invitationHash, "000000");
    return hmacSha256Hex(fingerprintKey, `contact-join-withdrawal:v1:${attemptId.toLowerCase()}:${invitationHash}`);
  }
  return {
    keyVersion,
    async withdrawalToken(attemptId: string, invitationHash: string): Promise<string> {
      // Deterministic recovery after a lost response; never derived from a code
      // or an address, and never returned by a sender-facing projection.
      return withdrawalToken(attemptId, invitationHash);
    },
    async hash(attemptId: string, invitationHash: string, code: string): Promise<string> {
      validate(attemptId, invitationHash, code);
      return hmacSha256Hex(fingerprintKey, `contact-join-code:v1:${attemptId.toLowerCase()}:${invitationHash}:${code}`);
    },
    async encrypt(attemptId: string, invitationHash: string, code: string): Promise<string> {
      validate(attemptId, invitationHash, code);
      return encryptText(encodedKey, JSON.stringify({ purpose: "contact-join-code:v1", attemptId: attemptId.toLowerCase(), invitationHash, code,
        withdrawalToken: await withdrawalToken(attemptId, invitationHash) }));
    },
    async decrypt(ciphertext: string, version: number, attemptId: string, invitationHash: string): Promise<string> {
      if (version !== keyVersion) throw new Error("Unknown join key version");
      const payload = JSON.parse(await decryptText(encodedKey, ciphertext));
      if (payload?.purpose !== "contact-join-code:v1" || payload.attemptId !== attemptId.toLowerCase()
        || payload.invitationHash !== invitationHash || typeof payload.code !== "string") throw new Error("Invalid join payload");
      validate(attemptId, invitationHash, payload.code);
      return payload.code;
    },
    async decryptWithdrawalToken(ciphertext: string, version: number, attemptId: string, invitationHash: string): Promise<string> {
      if (version !== keyVersion) throw new Error("Unknown join key version");
      const payload = JSON.parse(await decryptText(encodedKey, ciphertext));
      if (payload?.purpose !== "contact-join-code:v1" || payload.attemptId !== attemptId.toLowerCase()
        || payload.invitationHash !== invitationHash || typeof payload.withdrawalToken !== "string"
        || !/^[0-9a-f]{64}$/.test(payload.withdrawalToken)) throw new Error("Invalid management payload");
      return payload.withdrawalToken;
    },
  };
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function importKey(encodedKey: string): Promise<CryptoKey> {
  const bytes = decodeBase64Url(encodedKey);
  if (bytes.byteLength !== 32) throw new Error("Delivery payload key must contain 32 bytes");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function hmacSha256Hex(encodedKey: string, value: string): Promise<string> {
  const bytes = decodeBase64Url(encodedKey);
  if (bytes.byteLength !== 32) throw new Error("Fingerprint key must contain 32 bytes");
  const key = await crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function encryptText(encodedKey: string, value: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    await importKey(encodedKey),
    new TextEncoder().encode(value),
  ));
  const combined = new Uint8Array(nonce.byteLength + encrypted.byteLength);
  combined.set(nonce);
  combined.set(encrypted, nonce.byteLength);
  return encodeBase64Url(combined);
}

async function decryptText(encodedKey: string, ciphertext: string): Promise<string> {
  const combined = decodeBase64Url(ciphertext);
  if (combined.byteLength < 29) throw new Error("Invalid encrypted payload");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(0, 12) },
    await importKey(encodedKey),
    combined.slice(12),
  );
  return new TextDecoder("utf-8", { fatal: true }).decode(decrypted);
}

/** Invitation capabilities must not be interchangeable with alert/viewer payloads. */
export function createInvitationTokenCipher(encodedKey: string, keyVersion: number) {
  if (!Number.isInteger(keyVersion) || keyVersion < 1 || keyVersion > 32767) {
    throw new Error("Invalid invitation key version");
  }
  return {
    keyVersion,
    async encrypt(token: string): Promise<string> {
      if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid invitation token");
      return encryptText(encodedKey, JSON.stringify({ purpose: "contact-invitation:v1", token }));
    },
    async decrypt(ciphertext: string, requestedVersion: number): Promise<string> {
      if (requestedVersion !== keyVersion) throw new Error("Unknown invitation key version");
      const payload = JSON.parse(await decryptText(encodedKey, ciphertext)) as { purpose?: unknown; token?: unknown };
      if (payload.purpose !== "contact-invitation:v1" || typeof payload.token !== "string" || !TOKEN_PATTERN.test(payload.token)) {
        throw new Error("Invalid invitation payload");
      }
      return payload.token;
    },
  };
}

export function createContactDataProtection(
  encodedEncryptionKey: string,
  encodedFingerprintKey: string,
  keyVersion: number,
) {
  if (!Number.isInteger(keyVersion) || keyVersion < 1) throw new Error("Invalid contact data key version");
  return {
    keyVersion,
    encryptDestination(destination: string): Promise<string> {
      const normalized = destination.trim().toLowerCase();
      if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) throw new Error("Invalid email destination");
      return encryptText(encodedEncryptionKey, JSON.stringify({ channel: "email", destination: normalized }));
    },
    encryptConfirmationToken(token: string): Promise<string> {
      return encryptText(encodedEncryptionKey, JSON.stringify({ confirmationToken: token }));
    },
    fingerprintDestination(destination: string): Promise<string> {
      return hmacSha256Hex(encodedFingerprintKey, destination);
    },
    async decryptDestination(ciphertext: string, requestedVersion: number): Promise<string> {
      if (requestedVersion !== keyVersion) throw new Error("Unknown contact data key version");
      const payload = JSON.parse(await decryptText(encodedEncryptionKey, ciphertext)) as {
        channel?: unknown; destination?: unknown;
      };
      if (payload.channel !== "email" || typeof payload.destination !== "string" ||
        payload.destination.length > 254 || !EMAIL_PATTERN.test(payload.destination)) {
        throw new Error("Invalid destination payload");
      }
      return payload.destination;
    },
    async decryptConfirmationToken(ciphertext: string, requestedVersion: number): Promise<string> {
      if (requestedVersion !== keyVersion) throw new Error("Unknown contact data key version");
      const payload = JSON.parse(await decryptText(encodedEncryptionKey, ciphertext)) as { confirmationToken?: unknown };
      if (typeof payload.confirmationToken !== "string" || !TOKEN_PATTERN.test(payload.confirmationToken)) {
        throw new Error("Invalid confirmation payload");
      }
      return payload.confirmationToken;
    },
  };
}

export function createDeliveryPayloadCipher(encodedKey: string, keyVersion: number) {
  if (!Number.isInteger(keyVersion) || keyVersion < 1) throw new Error("Invalid delivery payload key version");
  return {
    keyVersion,
    async encrypt(viewerToken: string): Promise<string> {
      if (!TOKEN_PATTERN.test(viewerToken)) throw new Error("Invalid viewer token");
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode(JSON.stringify({ viewerToken }));
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, await importKey(encodedKey), plaintext));
      const combined = new Uint8Array(nonce.byteLength + encrypted.byteLength);
      combined.set(nonce);
      combined.set(encrypted, nonce.byteLength);
      return encodeBase64Url(combined);
    },
    async decrypt(ciphertext: string, requestedVersion: number): Promise<{ viewerToken: string }> {
      if (requestedVersion !== keyVersion) throw new Error("Unknown delivery payload key version");
      const combined = decodeBase64Url(ciphertext);
      if (combined.byteLength < 29) throw new Error("Invalid delivery payload");
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: combined.slice(0, 12) },
        await importKey(encodedKey),
        combined.slice(12),
      );
      const payload = JSON.parse(new TextDecoder().decode(decrypted)) as { viewerToken?: unknown };
      if (typeof payload.viewerToken !== "string" || !TOKEN_PATTERN.test(payload.viewerToken)) {
        throw new Error("Invalid delivery payload");
      }
      return { viewerToken: payload.viewerToken };
    },
  };
}

export function createContactDestinationCipher(encodedKey: string, keyVersion: number) {
  if (!Number.isInteger(keyVersion) || keyVersion < 1) throw new Error("Invalid destination key version");
  return {
    keyVersion,
    async encryptEmail(destination: string): Promise<string> {
      const normalized = destination.trim().toLowerCase();
      if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) throw new Error("Invalid email destination");
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode(JSON.stringify({ channel: "email", destination: normalized }));
      const encrypted = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce },
        await importKey(encodedKey),
        plaintext,
      ));
      const combined = new Uint8Array(nonce.byteLength + encrypted.byteLength);
      combined.set(nonce);
      combined.set(encrypted, nonce.byteLength);
      return encodeBase64Url(combined);
    },
    async decryptEmail(ciphertext: string, requestedVersion: number): Promise<string> {
      if (requestedVersion !== keyVersion) throw new Error("Unknown destination key version");
      const combined = decodeBase64Url(ciphertext);
      if (combined.byteLength < 29) throw new Error("Invalid destination payload");
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: combined.slice(0, 12) },
        await importKey(encodedKey),
        combined.slice(12),
      );
      const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decrypted)) as {
        channel?: unknown;
        destination?: unknown;
      };
      if (payload.channel !== "email" || typeof payload.destination !== "string" ||
        payload.destination.length > 254 || !EMAIL_PATTERN.test(payload.destination)) {
        throw new Error("Invalid destination payload");
      }
      return payload.destination;
    },
  };
}
