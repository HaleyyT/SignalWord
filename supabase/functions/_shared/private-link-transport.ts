import { ApiError, asApiError, errorResponse, readJson, requestId } from "./http.ts";

/** Fixed network URL; capability-bearing legacy URLs exist only in memory. */
export function withPrivateLinkTransport(handler: (request: Request) => Promise<Response>, kinds: string[]) {
  return async (request: Request): Promise<Response> => {
    if (!new URL(request.url).pathname.endsWith("/private-links")) return handler(request);
    try {
      if (request.method !== "POST" || request.headers.get("Content-Type")?.split(";")[0] !== "application/json") throw new ApiError(400, "INVALID_REQUEST", "Invalid request.");
      const body = await readJson(request, 8192) as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !["kind","token","action","payload"].includes(k))
        || typeof body.kind !== "string" || !kinds.includes(body.kind) || typeof body.token !== "string" || typeof body.action !== "string") throw new ApiError(400, "INVALID_REQUEST", "Invalid request.");
      const { kind, token, action } = body;
      if (!(kind === "management" ? /^[a-f0-9]{64}$/ : /^[A-Za-z0-9_-]{43}$/).test(token)) throw new ApiError(410,"LINK_UNAVAILABLE","This link is unavailable.");
      let path: string, method: string;
      const headers = new Headers(request.headers); headers.delete("Content-Length"); headers.delete("X-SignalWord-Action");
      if (kind === "event" && ["read","acknowledge"].includes(action)) {
        path = "/v1/public/events/" + token; method = action === "read" ? "GET" : "POST";
        if (action === "acknowledge") headers.set("X-SignalWord-Action",action);
      } else if (kind === "confirmation" && ["confirm","withdraw"].includes(action)) {
        path = "/v1/contacts/confirm/" + token; method = "POST";
        if (action === "withdraw") headers.set("X-SignalWord-Action",action);
      } else if (kind === "invitation" && ["read","begin","verify"].includes(action)) {
        path = "/v3/contact-invitations/" + token + (action === "read" ? "" : "/" + action); method = action === "read" ? "GET" : "POST";
      } else if (kind === "management" && ["read","withdraw"].includes(action)) {
        path = "/v3/contact-management/" + token; method = action === "read" ? "GET" : "POST";
      } else throw new ApiError(400,"INVALID_REQUEST","Invalid action.");
      return handler(new Request(new URL(path, request.url), { method, headers,
        ...(method === "POST" ? { body: JSON.stringify(body.payload ?? {}) } : {}) }));
    } catch (caught) {
      return errorResponse(asApiError(caught), requestId(request), {"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"});
    }
  };
}
