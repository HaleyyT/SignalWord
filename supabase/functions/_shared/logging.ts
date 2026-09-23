export interface SafeLogEvent {
  requestId: string;
  route: "user-api" | "public-event";
  method: string;
  status: number;
  durationMs: number;
  code?: string;
  reused?: boolean;
}

export interface SafeLogger {
  write(event: SafeLogEvent): void;
}

export const structuredLogger: SafeLogger = {
  write(event) {
    // The explicit type is the allowlist: tokens, auth, destinations, location,
    // request bodies, and user identifiers cannot be passed to this logger.
    console.info(JSON.stringify(event));
  },
};

export const silentLogger: SafeLogger = { write() {} };
