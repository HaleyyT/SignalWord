export type ErrorCode =
  | "AUTH_REQUIRED"
  | "CONTACT_NOT_CONFIRMED"
  | "INVALID_REQUEST"
  | "METHOD_NOT_ALLOWED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    retryable = false,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

export function errorResponse(error: ApiError, requestId: string, headers: HeadersInit = {}): Response {
  const retryHeaders = error.retryAfterSeconds === undefined
    ? {}
    : { "Retry-After": String(error.retryAfterSeconds) };
  return jsonResponse({
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      requestId,
    },
  }, error.status, { ...headers, ...retryHeaders });
}

export function requestId(request: Request): string {
  const candidate = request.headers.get("X-Request-ID")?.trim();
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

export function bearerToken(request: Request): string {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
  return match[1];
}

export async function readJson(request: Request, maximumBytes = 16_384): Promise<unknown> {
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(400, "INVALID_REQUEST", "Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body is too large.");
  }
  if (!request.body) throw new ApiError(400, "INVALID_REQUEST", "Request body must be valid JSON.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maximumBytes) {
      await reader.cancel();
      throw new ApiError(400, "INVALID_REQUEST", "Request body is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be valid UTF-8 JSON.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be valid JSON.");
  }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(503, "SERVICE_UNAVAILABLE", "The service is temporarily unavailable.", true);
}
