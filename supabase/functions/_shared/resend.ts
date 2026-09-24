import {
  DeliveryAttemptError,
  type ContactVerificationProviderAdapter,
  type DeliveryProviderAdapter,
  type ProviderDelivery,
  type RuntimeEnvironment,
} from "./delivery.ts";

const RETRYABLE_PROVIDER_STATUSES = new Set([408, 429, 502, 503, 504]);
const IDEMPOTENCY_KEY_PATTERN = /^(alert|contact)\/[A-Za-z0-9/_-]{1,220}$/;

export interface ResendConfiguration {
  apiKey: string;
  from: string;
  publicViewerBaseUrl: string;
  publicConfirmationBaseUrl: string;
  environment: RuntimeEnvironment;
}

export function createConfirmationUrl(baseUrl: string, token: string, environment: RuntimeEnvironment): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Invalid confirmation token");
  const base = new URL(baseUrl);
  if (base.username || base.password || base.search || base.hash) {
    throw new Error("Confirmation base URL must not contain credentials, query, or fragment");
  }
  if (environment === "production" && base.protocol !== "https:") {
    throw new Error("Production confirmation URL must use HTTPS");
  }
  if (!["https:", "http:"].includes(base.protocol)) throw new Error("Confirmation URL must use HTTP or HTTPS");
  base.pathname = `${base.pathname.replace(/\/$/, "")}/confirm/${token}`;
  return base.toString();
}

function validEmailAddress(value: string): boolean {
  const address = /<([^>]+)>$/.exec(value)?.[1] ?? value;
  return address.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function createViewerUrl(baseUrl: string, viewerToken: string, environment: RuntimeEnvironment): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(viewerToken)) throw new Error("Invalid viewer token");
  const base = new URL(baseUrl);
  if (base.username || base.password || base.search || base.hash) throw new Error("Viewer base URL must not contain credentials, query, or fragment");
  if (environment === "production" && base.protocol !== "https:") throw new Error("Production viewer URL must use HTTPS");
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error("Viewer URL must use HTTP or HTTPS");
  base.pathname = `${base.pathname.replace(/\/$/, "")}/events/${viewerToken}`;
  return base.toString();
}

export function renderAlertEmail(delivery: ProviderDelivery, viewerUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  if (delivery.messageType === "resolved") {
    return {
      subject: "SignalWord alert resolved",
      text: `The SignalWord alert has been marked resolved. Review the current status: ${viewerUrl}\n\nSignalWord does not contact emergency services or guarantee delivery or rescue.`,
      html: `<p>The SignalWord alert has been marked resolved.</p><p><a href="${escapeHtml(viewerUrl)}">Review the current status</a></p><p>SignalWord does not contact emergency services or guarantee delivery or rescue.</p>`,
    };
  }
  if (delivery.kind === "test") {
    return {
      subject: "TEST — NO EMERGENCY: SignalWord rehearsal",
      text: `TEST — NO EMERGENCY HAS BEEN REPORTED.\n\nThis is a SignalWord rehearsal message. Review the test status: ${viewerUrl}\n\nDo not contact emergency services because of this test message.`,
      html: `<h1>TEST — NO EMERGENCY</h1><p>This is a SignalWord rehearsal message.</p><p><a href="${escapeHtml(viewerUrl)}">Review the test status</a></p><p>Do not contact emergency services because of this test message.</p>`,
    };
  }
  return {
    subject: "SignalWord safety alert",
    text: `A trusted contact started a SignalWord safety alert. Review the latest available status and location: ${viewerUrl}\n\nContact the person directly. If you believe there is immediate danger, call the appropriate local emergency number. SignalWord does not contact emergency services or guarantee delivery or rescue.`,
    html: `<p>A trusted contact started a SignalWord safety alert.</p><p><a href="${escapeHtml(viewerUrl)}">Review the latest available status and location</a></p><p>Contact the person directly. If you believe there is immediate danger, call the appropriate local emergency number.</p><p>SignalWord does not contact emergency services or guarantee delivery or rescue.</p>`,
  };
}

export function renderContactVerificationEmail(confirmationUrl: string): {
  subject: string; text: string; html: string;
} {
  return {
    subject: "Confirm your SignalWord trusted-contact role",
    text: `Someone added this address as their SignalWord trusted contact. Confirm only if you recognise and accept this responsibility: ${confirmationUrl}\n\nThe link expires in 30 minutes and can be used once. SignalWord does not contact emergency services or guarantee delivery or rescue.`,
    html: `<p>Someone added this address as their SignalWord trusted contact.</p><p><a href="${escapeHtml(confirmationUrl)}">Confirm trusted-contact role</a></p><p>Confirm only if you recognise and accept this responsibility. The link expires in 30 minutes and can be used once.</p><p>SignalWord does not contact emergency services or guarantee delivery or rescue.</p>`,
  };
}

export function validateResendConfiguration(configuration: ResendConfiguration): void {
  if (!['development', 'test', 'production'].includes(configuration.environment)) throw new Error("Invalid APP_ENV");
  if (!/^re_[A-Za-z0-9_-]{16,}$/.test(configuration.apiKey)) throw new Error("RESEND_API_KEY is invalid");
  if (!validEmailAddress(configuration.from)) throw new Error("RESEND_FROM_EMAIL is invalid");
  const viewer = new URL(configuration.publicViewerBaseUrl);
  const confirmation = new URL(configuration.publicConfirmationBaseUrl);
  if (configuration.environment === "production") {
    const fromAddress = /<([^>]+)>$/.exec(configuration.from)?.[1] ?? configuration.from;
    const fromHost = fromAddress.split("@")[1]?.toLowerCase();
    if (!fromHost || fromHost === "example.com" || fromHost.endsWith(".test") || fromHost === "localhost") {
      throw new Error("Production sender must use a verified non-placeholder domain");
    }
    if ([viewer, confirmation].some((url) =>
      url.protocol !== "https:" || url.hostname === "localhost" || url.hostname.endsWith(".test")
    )) {
      throw new Error("Production public links must use a public HTTPS origin");
    }
  }
  createViewerUrl(configuration.publicViewerBaseUrl, "a".repeat(43), configuration.environment);
  createConfirmationUrl(configuration.publicConfirmationBaseUrl, "a".repeat(43), configuration.environment);
}

export class ResendDeliveryAdapter implements DeliveryProviderAdapter, ContactVerificationProviderAdapter {
  readonly provider = "resend" as const;
  readonly #configuration: ResendConfiguration;
  readonly #fetch: typeof fetch;

  constructor(configuration: ResendConfiguration, fetchImplementation: typeof fetch = fetch) {
    validateResendConfiguration(configuration);
    this.#configuration = configuration;
    this.#fetch = fetchImplementation;
  }

  async send(delivery: ProviderDelivery): Promise<{ providerMessageId: string }> {
    if (!IDEMPOTENCY_KEY_PATTERN.test(delivery.idempotencyKey)) {
      throw new DeliveryAttemptError("INVALID_PROVIDER_IDEMPOTENCY_KEY", false);
    }
    const viewerUrl = createViewerUrl(
      this.#configuration.publicViewerBaseUrl,
      delivery.viewerToken,
      this.#configuration.environment,
    );
    return this.#send(delivery.recipient, delivery.idempotencyKey, renderAlertEmail(delivery, viewerUrl));
  }

  async sendVerification(delivery: {
    recipient: string; confirmationToken: string; idempotencyKey: string;
  }): Promise<{ providerMessageId: string }> {
    const confirmationUrl = createConfirmationUrl(
      this.#configuration.publicConfirmationBaseUrl,
      delivery.confirmationToken,
      this.#configuration.environment,
    );
    return this.#send(
      delivery.recipient,
      delivery.idempotencyKey,
      renderContactVerificationEmail(confirmationUrl),
    );
  }

  async #send(
    recipient: string,
    idempotencyKey: string,
    message: { subject: string; text: string; html: string },
  ): Promise<{ providerMessageId: string }> {
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new DeliveryAttemptError("INVALID_PROVIDER_IDEMPOTENCY_KEY", false);
    }
    let response: Response;
    try {
      response = await this.#fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#configuration.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from: this.#configuration.from,
          to: [recipient],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });
    } catch {
      throw new DeliveryAttemptError("PROVIDER_NETWORK_ERROR", true);
    }
    if (!response.ok) {
      const providerError = await response.json().catch(() => null) as { name?: unknown; code?: unknown } | null;
      const providerCode = typeof providerError?.name === "string" ? providerError.name
        : typeof providerError?.code === "string" ? providerError.code : "";
      const retryable = RETRYABLE_PROVIDER_STATUSES.has(response.status) || response.status >= 500 ||
        (response.status === 409 && ["concurrent_idempotent_requests", "resource_locked"].includes(providerCode));
      throw new DeliveryAttemptError(
        retryable
          ? "PROVIDER_TEMPORARILY_UNAVAILABLE"
          : "PROVIDER_REQUEST_REJECTED",
        retryable,
      );
    }
    const payload = await response.json().catch(() => null) as { id?: unknown } | null;
    if (!payload || typeof payload.id !== "string" || payload.id.length < 1 || payload.id.length > 200) {
      throw new DeliveryAttemptError("INVALID_PROVIDER_RESPONSE", true);
    }
    return { providerMessageId: payload.id };
  }
}
