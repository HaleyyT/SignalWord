import { createDeliveryPolicy, type DeliveryCreationPolicy, type RuntimeEnvironment } from "../_shared/delivery.ts";
import { createDeliveryPayloadCipher } from "../_shared/encryption.ts";
import { ApiError, asApiError, bearerToken, errorResponse, jsonResponse, readJson, requestId } from "../_shared/http.ts";
import { structuredLogger, type SafeLogger } from "../_shared/logging.ts";
import { createBackendGateway, type BackendGateway } from "../_shared/supabase.ts";
import { generateViewerToken } from "../_shared/tokens.ts";
import { parseCreateAlert, parseIdempotencyKey } from "../_shared/validation.ts";

export interface UserApiDependencies {
  backend: BackendGateway;
  delivery: DeliveryCreationPolicy;
  encryptPayload: (viewerToken: string) => Promise<{ ciphertext: string; keyVersion: number }>;
  logger: SafeLogger;
  now: () => number;
  generateToken: () => string;
}

const RESPONSE_HEADERS = { "X-Content-Type-Options": "nosniff" };

export function createUserApiHandler(dependencies: UserApiDependencies) {
  return async (request: Request): Promise<Response> => {
    const startedAt = dependencies.now();
    const id = requestId(request);
    let status = 500;
    let code: string | undefined;
    let reused: boolean | undefined;

    try {
      const path = new URL(request.url).pathname.replace(/\/+$/, "");
      if (request.method !== "POST" || !path.endsWith("/v1/alerts")) {
        throw request.method === "POST"
          ? new ApiError(404, "NOT_FOUND", "Route not found.")
          : new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
      }

      const jwt = bearerToken(request);
      const user = await dependencies.backend.authenticate(jwt);
      const idempotencyKey = parseIdempotencyKey(request.headers.get("Idempotency-Key"));
      const input = parseCreateAlert(await readJson(request), dependencies.now());
      dependencies.delivery.assertAvailable(input.kind);
      const viewerToken = dependencies.generateToken();
      const encrypted = await dependencies.encryptPayload(viewerToken);
      const result = await dependencies.backend.createAlert(input, user.id, idempotencyKey, {
        viewerToken,
        provider: dependencies.delivery.provider,
        payloadCiphertext: encrypted.ciphertext,
        payloadKeyVersion: encrypted.keyVersion,
      }, jwt);

      reused = result.reused;
      status = result.reused ? 200 : 201;
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
  const provider = Deno.env.get("DELIVERY_PROVIDER") === "fake" ? "fake" : "none";
  const encodedKey = Deno.env.get("DELIVERY_PAYLOAD_KEY");
  const keyVersion = Number(Deno.env.get("DELIVERY_PAYLOAD_KEY_VERSION") ?? "1");
  if (!url || !anonKey || !encodedKey) {
    throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, and DELIVERY_PAYLOAD_KEY are required");
  }
  const cipher = createDeliveryPayloadCipher(encodedKey, keyVersion);
  Deno.serve(createUserApiHandler({
    backend: createBackendGateway({ url, anonKey }),
    delivery: createDeliveryPolicy(environment, provider),
    encryptPayload: async (viewerToken) => ({
      ciphertext: await cipher.encrypt(viewerToken),
      keyVersion: cipher.keyVersion,
    }),
    logger: structuredLogger,
    now: () => Date.now(),
    generateToken: generateViewerToken,
  }));
}
