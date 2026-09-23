const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function decodeBase64Url(value: string): Uint8Array {
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
