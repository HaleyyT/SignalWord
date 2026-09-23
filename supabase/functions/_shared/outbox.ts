import type { ClaimedDelivery, DeliveryOutbox } from "./delivery.ts";

export function createDeliveryOutbox(configuration: { url: string; serviceRoleKey: string }): DeliveryOutbox {
  const baseUrl = configuration.url.replace(/\/$/, "");
  const headers = {
    apikey: configuration.serviceRoleKey,
    Authorization: `Bearer ${configuration.serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  return {
    async claim(workerId, limit) {
      const response = await fetch(`${baseUrl}/rest/v1/rpc/claim_alert_deliveries`, {
        method: "POST",
        headers,
        body: JSON.stringify({ p_worker_id: workerId, p_limit: limit }),
      });
      if (!response.ok) throw new Error("DELIVERY_OUTBOX_CLAIM_FAILED");
      const rows = await response.json() as Array<Record<string, unknown>>;
      return rows.map((row): ClaimedDelivery => {
        if (typeof row.delivery_id !== "string" || typeof row.event_id !== "string" ||
          (row.kind !== "test" && row.kind !== "real") ||
          (row.provider !== "fake" && row.provider !== "resend") ||
          typeof row.provider_idempotency_key !== "string" ||
          typeof row.payload_ciphertext !== "string" || typeof row.payload_key_version !== "number" ||
          typeof row.attempt_count !== "number") {
          throw new Error("INVALID_DELIVERY_OUTBOX_RESULT");
        }
        return {
          deliveryId: row.delivery_id,
          eventId: row.event_id,
          kind: row.kind,
          provider: row.provider,
          providerIdempotencyKey: row.provider_idempotency_key,
          payloadCiphertext: row.payload_ciphertext,
          payloadKeyVersion: row.payload_key_version,
          attemptCount: row.attempt_count,
        };
      });
    },

    async finish(deliveryId, workerId, result) {
      const response = await fetch(`${baseUrl}/rest/v1/rpc/finish_alert_delivery`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_delivery_id: deliveryId,
          p_worker_id: workerId,
          p_succeeded: result.succeeded,
          p_provider_message_id: result.providerMessageId ?? null,
          p_error_code: result.errorCode ?? null,
        }),
      });
      if (!response.ok) throw new Error("DELIVERY_OUTBOX_FINISH_FAILED");
      return await response.json() === true;
    },
  };
}
