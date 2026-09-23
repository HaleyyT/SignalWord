import { ApiError } from "./http.ts";
import type { AlertKind } from "./validation.ts";

export type RuntimeEnvironment = "development" | "test" | "production";
export type DeliveryProviderName = "fake" | "resend";

export interface DeliveryCreationPolicy {
  provider: DeliveryProviderName;
  assertAvailable(kind: AlertKind): void;
}

export function createDeliveryPolicy(
  environment: RuntimeEnvironment,
  configuredProvider: "fake" | "none",
): DeliveryCreationPolicy {
  if (environment !== "development" && environment !== "test" && environment !== "production") {
    throw new Error("APP_ENV must be development, test, or production");
  }
  if (configuredProvider === "fake" && environment === "production") {
    throw new Error("Fake delivery cannot be enabled in production");
  }
  return {
    provider: "fake",
    assertAvailable(kind) {
      if (configuredProvider === "none") {
        throw new ApiError(
          503,
          "SERVICE_UNAVAILABLE",
          kind === "real" ? "Real alerts are unavailable until delivery is configured." : "Delivery is unavailable.",
          true,
        );
      }
    },
  };
}

export interface ClaimedDelivery {
  deliveryId: string;
  eventId: string;
  kind: AlertKind;
  provider: DeliveryProviderName;
  providerIdempotencyKey: string;
  payloadCiphertext: string;
  payloadKeyVersion: number;
  attemptCount: number;
}

export interface DeliveryOutbox {
  claim(workerId: string, limit: number): Promise<ClaimedDelivery[]>;
  finish(deliveryId: string, workerId: string, result: {
    succeeded: boolean;
    providerMessageId?: string;
    errorCode?: string;
  }): Promise<boolean>;
}

export interface DeliveryPayloadCipher {
  decrypt(ciphertext: string, keyVersion: number): Promise<{ viewerToken: string }>;
}

export interface DeliveryProviderAdapter {
  send(delivery: { eventId: string; kind: AlertKind; viewerToken: string; idempotencyKey: string }): Promise<{ providerMessageId: string }>;
}

export class FakeDeliveryAdapter implements DeliveryProviderAdapter {
  constructor(environment: RuntimeEnvironment) {
    if (environment === "production") throw new Error("Fake delivery cannot run in production");
  }

  async send(delivery: { idempotencyKey: string }): Promise<{ providerMessageId: string }> {
    return { providerMessageId: `fake/${delivery.idempotencyKey}` };
  }
}

export async function runDeliveryWorker(dependencies: {
  workerId: string;
  outbox: DeliveryOutbox;
  cipher: DeliveryPayloadCipher;
  adapter: DeliveryProviderAdapter;
  limit?: number;
}): Promise<{ claimed: number; sent: number; failed: number }> {
  const deliveries = await dependencies.outbox.claim(dependencies.workerId, dependencies.limit ?? 10);
  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    try {
      const payload = await dependencies.cipher.decrypt(delivery.payloadCiphertext, delivery.payloadKeyVersion);
      if (!/^[A-Za-z0-9_-]{43}$/.test(payload.viewerToken)) throw new Error("INVALID_DELIVERY_PAYLOAD");
      const result = await dependencies.adapter.send({
        eventId: delivery.eventId,
        kind: delivery.kind,
        viewerToken: payload.viewerToken,
        idempotencyKey: delivery.providerIdempotencyKey,
      });
      const finalized = await dependencies.outbox.finish(delivery.deliveryId, dependencies.workerId, {
        succeeded: true,
        providerMessageId: result.providerMessageId,
      });
      if (!finalized) throw new Error("DELIVERY_LEASE_LOST_AFTER_SEND");
      sent += 1;
    } catch {
      await dependencies.outbox.finish(delivery.deliveryId, dependencies.workerId, {
        succeeded: false,
        errorCode: "DELIVERY_ATTEMPT_FAILED",
      });
      failed += 1;
    }
  }

  return { claimed: deliveries.length, sent, failed };
}
