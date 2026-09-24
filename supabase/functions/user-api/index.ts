import { createDeliveryPolicy, type DeliveryCreationPolicy, type RuntimeEnvironment } from "../_shared/delivery.ts";
import { createContactDataProtection, createDeliveryPayloadCipher } from "../_shared/encryption.ts";
import { ApiError, asApiError, bearerToken, errorResponse, jsonResponse, readJson, requestId } from "../_shared/http.ts";
import { createLifecycleGateway, type LifecycleGateway } from "../_shared/lifecycle.ts";
import { structuredLogger, type SafeLogger } from "../_shared/logging.ts";
import { createBackendGateway, type BackendGateway } from "../_shared/supabase.ts";
import { generateViewerToken, sha256Hex } from "../_shared/tokens.ts";
import { parseCreateAlert, parseIdempotencyKey } from "../_shared/validation.ts";

export interface UserApiDependencies {
  backend: BackendGateway;
  lifecycle: LifecycleGateway;
  delivery: DeliveryCreationPolicy;
  encryptPayload: (viewerToken: string) => Promise<{ ciphertext: string; keyVersion: number }>;
  logger: SafeLogger;
  now: () => number;
  generateToken: () => string;
  protectContact: (email: string, confirmationToken: string) => Promise<{
    destinationCiphertext: string;
    destinationFingerprint: string;
    destinationKeyVersion: number;
    confirmationPayloadCiphertext: string;
    payloadKeyVersion: number;
  }>;
}

const RESPONSE_HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function contactInput(value: unknown): { name: string; email: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_REQUEST", "Contact must be an object.");
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["name", "email"].includes(key)) ||
    typeof body.name !== "string" || typeof body.email !== "string") {
    throw new ApiError(400, "INVALID_REQUEST", "Contact name and email are required.");
  }
  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  if (name.length < 1 || name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "INVALID_REQUEST", "Contact name or email is invalid.");
  }
  return { name, email };
}

export function createUserApiHandler(dependencies: UserApiDependencies) {
  return async (request: Request): Promise<Response> => {
    const startedAt = dependencies.now();
    const id = requestId(request);
    let status = 500;
    let code: string | undefined;
    let reused: boolean | undefined;

    try {
      const path = new URL(request.url).pathname.replace(/\/+$/, "");
      const jwt = bearerToken(request);
      const user = await dependencies.backend.authenticate(jwt);
      let result: unknown;

      if (request.method === "POST" && path.endsWith("/v1/alerts")) {
        const idempotencyKey = parseIdempotencyKey(request.headers.get("Idempotency-Key"));
        const input = parseCreateAlert(await readJson(request), dependencies.now());
        dependencies.delivery.assertAvailable(input.kind);
        const viewerToken = dependencies.generateToken();
        const encrypted = await dependencies.encryptPayload(viewerToken);
        result = await dependencies.backend.createAlert(input, user.id, idempotencyKey, {
          viewerToken,
          provider: dependencies.delivery.provider,
          payloadCiphertext: encrypted.ciphertext,
          payloadKeyVersion: encrypted.keyVersion,
        }, jwt);
        reused = (result as { reused: boolean }).reused;
        status = reused ? 200 : 201;
      } else if (request.method === "POST" && path.endsWith("/v1/contacts")) {
        dependencies.delivery.assertAvailable("test");
        const input = contactInput(await readJson(request));
        const confirmationToken = dependencies.generateToken();
        const protectedData = await dependencies.protectContact(input.email, confirmationToken);
        result = await dependencies.lifecycle.saveContact({
          userId: user.id,
          name: input.name,
          ...protectedData,
          confirmationTokenHashHex: await sha256Hex(confirmationToken),
          provider: dependencies.delivery.provider,
        }, jwt);
        status = 202;
      } else if (request.method === "GET" && path.endsWith("/v1/contact")) {
        result = await dependencies.lifecycle.getContact(user.id, jwt);
        if (result === null) throw new ApiError(404, "NOT_FOUND", "No trusted contact is configured.");
        status = 200;
      } else {
        const contactMatch = /\/v1\/contacts\/([0-9a-f-]+)$/i.exec(path);
        const locationMatch = /\/v1\/alerts\/([0-9a-f-]+)\/location$/i.exec(path);
        const resolveMatch = /\/v1\/alerts\/([0-9a-f-]+)\/resolve$/i.exec(path);
        const statusMatch = /\/v1\/alerts\/([0-9a-f-]+)$/i.exec(path);
        if (request.method === "DELETE" && contactMatch && UUID_PATTERN.test(contactMatch[1])) {
          result = { disabled: await dependencies.lifecycle.disableContact(user.id, contactMatch[1], jwt) };
          status = 200;
        } else if (request.method === "POST" && locationMatch && UUID_PATTERN.test(locationMatch[1])) {
          const body = await readJson(request) as { location?: unknown };
          const parsed = parseCreateAlert({
            kind: "real", triggerMethod: "manual",
            clientTriggeredAt: new Date(dependencies.now()).toISOString(), location: body?.location,
          }, dependencies.now());
          if (!parsed.location) throw new ApiError(400, "INVALID_REQUEST", "A current valid location is required.");
          result = await dependencies.lifecycle.appendLocation(user.id, locationMatch[1], parsed.location, jwt);
          status = 202;
        } else if (request.method === "POST" && resolveMatch && UUID_PATTERN.test(resolveMatch[1])) {
          result = await dependencies.lifecycle.resolveAlert(user.id, resolveMatch[1], jwt);
          status = 200;
        } else if (request.method === "GET" && statusMatch && UUID_PATTERN.test(statusMatch[1])) {
          result = await dependencies.lifecycle.getAlertStatus(user.id, statusMatch[1], jwt);
          if (result === null) throw new ApiError(404, "NOT_FOUND", "Alert not found.");
          status = 200;
        } else if (request.method === "DELETE" && path.endsWith("/v1/data")) {
          result = await dependencies.lifecycle.deleteData(user.id, jwt);
          status = 200;
        } else {
          throw new ApiError(404, "NOT_FOUND", "Route not found.");
        }
      }
      return jsonResponse(result, status, { ...RESPONSE_HEADERS, "X-Request-ID": id });
    } catch (caught) {
      const error = asApiError(caught);
      status = error.status;
      code = error.code;
      return errorResponse(error, id, { ...RESPONSE_HEADERS, "X-Request-ID": id });
    } finally {
      dependencies.logger.write({
        requestId: id,
        route: "user-api",
        method: request.method,
        status,
        durationMs: Math.max(0, dependencies.now() - startedAt),
        ...(code ? { code } : {}),
        ...(reused === undefined ? {} : { reused }),
      });
    }
  };
}

if (import.meta.main) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const environment = (Deno.env.get("APP_ENV") ?? "production") as RuntimeEnvironment;
  const configuredProvider = Deno.env.get("DELIVERY_PROVIDER");
  const provider = configuredProvider === "fake" || configuredProvider === "resend" ? configuredProvider : "none";
  const encodedKey = Deno.env.get("DELIVERY_PAYLOAD_KEY");
  const contactEncryptionKey = Deno.env.get("DESTINATION_ENCRYPTION_KEY");
  const contactFingerprintKey = Deno.env.get("DESTINATION_FINGERPRINT_KEY");
  const keyVersion = Number(Deno.env.get("DELIVERY_PAYLOAD_KEY_VERSION") ?? "1");
  const destinationKeyVersion = Number(Deno.env.get("DESTINATION_KEY_VERSION") ?? "1");
  if (!url || !anonKey || !encodedKey || !contactEncryptionKey || !contactFingerprintKey) {
    throw new Error("Backend URL, anonymous key, delivery key, and contact protection keys are required");
  }
  const cipher = createDeliveryPayloadCipher(encodedKey, keyVersion);
  const contactProtection = createContactDataProtection(
    contactEncryptionKey, contactFingerprintKey, destinationKeyVersion,
  );
  Deno.serve(createUserApiHandler({
    backend: createBackendGateway({ url, anonKey }),
    lifecycle: createLifecycleGateway({ url, anonKey }),
    delivery: createDeliveryPolicy(environment, provider),
    encryptPayload: async (viewerToken) => ({
      ciphertext: await cipher.encrypt(viewerToken),
      keyVersion: cipher.keyVersion,
    }),
    logger: structuredLogger,
    now: () => Date.now(),
    generateToken: generateViewerToken,
    protectContact: async (email, confirmationToken) => ({
      destinationCiphertext: await contactProtection.encryptDestination(email),
      destinationFingerprint: await contactProtection.fingerprintDestination(email),
      destinationKeyVersion: contactProtection.keyVersion,
      confirmationPayloadCiphertext: await contactProtection.encryptConfirmationToken(confirmationToken),
      payloadKeyVersion: contactProtection.keyVersion,
    }),
  }));
}
