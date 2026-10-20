import { createContactApprovalGateway } from "../supabase/functions/_shared/contact-approval.ts";
import { createContactJoinService, runContactJoinEmail } from "../supabase/functions/_shared/contact-join.ts";
import { createContactInvitationGateway, createInvitationPreviewGateway } from "../supabase/functions/_shared/contact-invitations.ts";
import { createInvitationPreviewHandler } from "../supabase/functions/contact-invitation-preview/index.ts";
import { createInvitationTokenCipher } from "../supabase/functions/_shared/encryption.ts";
import { createServer as createViteServer } from "vite";
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
  acquireLocalFixtureLock,
  localContainer,
  localGatewayContainer,
  localRestContainer,
  localWorkdir,
} from "./local-fixture.mjs";
/** Real local Auth/PostgREST/Postgres + application handlers and delivery workers.
 * Only the independent authority storage and email provider are local fixtures.
 * Never reads hosted credentials or sends traffic to a delivery provider.
 */
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createResendWebhookHandler } from "../supabase/functions/resend-webhook/index.ts";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer as httpsServer } from "node:https";
import { createServer } from "node:http";
import { ControlService } from "../infrastructure/control/service.mjs";
import { createUserApiHandler } from "../supabase/functions/user-api/index.ts";
import { createPublicEventHandler } from "../supabase/functions/public-event/index.ts";
import { createContactConfirmHandler } from "../supabase/functions/contact-confirm/index.ts";
import { createBackendGateway } from "../supabase/functions/_shared/supabase.ts";
import { createLifecycleGateway } from "../supabase/functions/_shared/lifecycle.ts";
import { createContactNetworkGateway } from "../supabase/functions/_shared/contact-network.ts";
import { createCheckInGateway } from "../supabase/functions/_shared/check-in.ts";
import { createSafetyJournal } from "../supabase/functions/_shared/safety-journal.ts";
import {
  createContactDataProtection,
  createDeliveryPayloadCipher,
} from "../supabase/functions/_shared/encryption.ts";
import {
  createContactVerificationOutbox,
  createDeliveryOutbox,
} from "../supabase/functions/_shared/outbox.ts";
import {
  createDeliveryPolicy,
  DeliveryAttemptError,
  runContactVerificationWorker,
  runDeliveryWorker,
} from "../supabase/functions/_shared/delivery.ts";
import { generateViewerToken } from "../supabase/functions/_shared/tokens.ts";

// Relaunch with a dedicated trusted fixture certificate, never disable TLS checks.
if (!process.env.SIGNALWORD_FIXTURE_CERT) {
  const dir = mkdtempSync(join(tmpdir(), "signalword-tls-"));
  const databaseHost = process.platform === "linux"
    ? execFileSync("docker", [
      "inspect",
      localContainer,
      "--format",
      "{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}",
    ], { encoding: "utf8" }).trim()
    : "host.docker.internal";
  if (!/^(host\.docker\.internal|[0-9.]+)$/.test(databaseHost)) {
    throw Error("LOCAL_GATEWAY_INVALID");
  }
  try {
    execFileSync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(dir, "key.pem"),
      "-out",
      join(dir, "cert.pem"),
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      `subjectAltName=DNS:localhost,DNS:host.docker.internal,IP:127.0.0.1${
        process.platform === "linux" ? `,IP:${databaseHost}` : ""
      }`,
    ], { stdio: "ignore" });
    const child = spawn(process.execPath, [process.argv[1]], {
      stdio: "inherit",
      env: {
        ...process.env,
        SIGNALWORD_FIXTURE_CERT: dir,
        SIGNALWORD_FIXTURE_DB_HOST: databaseHost,
        NODE_EXTRA_CA_CERTS: join(dir, "cert.pem"),
      },
    });
    const code = await new Promise((resolve) => child.on("exit", resolve));
    process.exitCode = code ?? 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} else await journey();

async function journey() {
  acquireLocalFixtureLock();
  const databaseHost = process.env.SIGNALWORD_FIXTURE_DB_HOST;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, options) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw Error("NON_LOCAL_NETWORK_BLOCKED");
    }
    return originalFetch(input, options);
  };
  const container = localContainer;
  const run = (args, input = "") =>
    new Promise((resolve, reject) => {
      const p = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
      let out = "", err = "";
      p.stdout.on("data", (b) => out += b);
      p.stderr.on("data", (b) => err += b);
      p.on("error", reject);
      p.on("close", (c) => c ? reject(Error(err)) : resolve(out));
      p.stdin.end(input);
    });
  const sql = (q) =>
    run([
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
    ], q);
  assert.equal(
    (await sql(
      "select (select count(*) from auth.users)||'|'||(select count(*) from vault.secrets);",
    )).trim(),
    "0|0",
    "Use empty local fixtures",
  );
  const local = JSON.parse(
    execFileSync("npx", [
      "supabase",
      "--workdir",
      localWorkdir,
      "status",
      "--output",
      "json",
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  assert.ok(
    /^http:\/\/127\.0\.0\.1:\d+$/.test(local.API_URL),
    "Local backend only",
  );
  // A minimal CLI config can report another project's default port. Check the
  // actual gateway mapping before creating an identity or changing any data.
  const gatewayPorts = JSON.parse(execFileSync("docker", [
    "inspect", localGatewayContainer, "--format", "{{json .NetworkSettings.Ports}}",
  ], { encoding: "utf8" }))["8000/tcp"] ?? [];
  assert.ok(gatewayPorts.some(({ HostPort }) => HostPort === new URL(local.API_URL).port),
    "LOCAL_API_PROJECT_MISMATCH: CLI API port must match the fixture gateway");
  const config = {
    url: local.API_URL,
    anonKey: local.ANON_KEY,
    serviceRoleKey: local.SERVICE_ROLE_KEY,
  };
  const data = new Map(), objects = new Map();
  const storage = {
    get: async (k) => structuredClone(data.get(k)),
    put: async (k, v) => {
      if (typeof k === "string") data.set(k, structuredClone(v));
      else {for (const [a, b] of Object.entries(k)) {
          data.set(a, structuredClone(b));
        }}
    },
    list: async ({ prefix, startAfter = "", limit }) =>
      new Map(
        [...data].filter(([k]) => k.startsWith(prefix) && k > startAfter).sort((
          [a],
          [b],
        ) => a.localeCompare(b)).slice(0, limit),
      ),
  };
  const bucket = {
    get: async (k) =>
      objects.has(k) ? { text: async () => objects.get(k) } : null,
    put: async (k, v) => {
      objects.set(k, v);
      return { etag: "fixture" };
    },
  };
  const secrets = {
    reader: crypto.randomUUID(),
    writer: crypto.randomUUID(),
    admin: crypto.randomUUID(),
  };
  const authority = new ControlService(storage, bucket, secrets);
  const bridge = (handler) => async (req, res) => {
    try {
      let body = "";
      for await (const chunk of req) body += chunk;
      const result = await handler(
        new Request(`https://localhost${req.url}`, {
          method: req.method,
          headers: req.headers,
          ...(body ? { body } : {}),
        }),
      );
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(await result.text());
    } catch {
      res.writeHead(503);
      res.end();
    }
  };
  const dir = process.env.SIGNALWORD_FIXTURE_CERT;
  const control = httpsServer({
    key: readFileSync(join(dir, "key.pem")),
    cert: readFileSync(join(dir, "cert.pem")),
  }, bridge((r) => authority.handle(r)));
  await new Promise((r) => control.listen(0, "0.0.0.0", r));
  const origin = `https://localhost:${control.address().port}`;
  const certName = `/tmp/signalword-fixture-${crypto.randomUUID()}.crt`;
  let viewerServer, browser;
  let userId;
  let receipt;
  const vaultIds = [];
  let api;
  let originalTrust;
  const fingerprints = [];
  const enrollmentHashes = [];
  const enrollmentAttempts = [];
  const sent = [];
  const providerIds = new Map();
  try {
    await run(["cp", join(dir, "cert.pem"), `${container}:${certName}`]);
    originalTrust = await run([
      "exec",
      container,
      "cat",
      "/etc/ssl/certs/ca-certificates.crt",
    ]);
    await run([
      "exec",
      "-i",
      container,
      "sh",
      "-c",
      "cat > /etc/ssl/certs/ca-certificates.crt",
    ], originalTrust + "\n" + readFileSync(join(dir, "cert.pem"), "utf8"));
    await run(["restart", localRestContainer]);
    for (
      const [name, value] of [[
        "signalword_control_url",
        `https://${databaseHost}:${control.address().port}`,
      ], ["signalword_control_reader", secrets.reader]]
    ) {
      vaultIds.push(
        (await sql(`select vault.create_secret('${value}','${name}');`)).trim(),
      );
    }
    const admin = async (path, body) => {
      const r = await fetch(origin + path, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${secrets.admin}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      assert.equal(r.status, 200);
      return r.json();
    };
    await admin("/snapshot");
    await admin("/quarantine", { backupAt: new Date().toISOString() });
    const snapshot = await admin("/snapshot");
    await admin("/release", {
      restoreId: snapshot.state.restoreId,
      version: snapshot.state.version,
      digest: snapshot.digest,
    });
    await sql(
      `select status from extensions.http(('GET','https://${databaseHost}:${control.address().port}/gate',array[extensions.http_header('Authorization','Bearer ${secrets.reader}')],null,null)::extensions.http_request);`,
    );
    await new Promise((r) => setTimeout(r, 1100));
    const signup = await fetch(`${local.API_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: local.ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { signalword_client: true } }),
    });
    assert.equal(signup.status, 200, "Local anonymous auth signup");
    const session = await signup.json();
    userId = session.user.id;
    assert.match(userId, /^[0-9a-f-]{36}$/);
    const journal = createSafetyJournal({
      ...config,
      controlUrl: origin,
      writerKey: secrets.writer,
    });
    const lifecycle = createLifecycleGateway({ ...config, journal });
    const backend = createBackendGateway(config);
    const randomKey = () =>
      Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
        "base64url",
      );
    const cipher = createDeliveryPayloadCipher(randomKey(), 1);
    const encryptionKey = randomKey(), fingerprintKey = randomKey();
    const contacts = createContactDataProtection(encryptionKey, fingerprintKey, 1);
    const approval = createContactApprovalGateway({ ...config, authenticate: jwt => backend.authenticate(jwt),
      decryptDestination: contacts.decryptDestination, flushJournal: id => journal.flush(id) });
    const invitations = createContactInvitationGateway({ ...config, publicOrigin: "https://www.signalword.app",
      generateToken: generateViewerToken, cipher: createInvitationTokenCipher(randomKey(), 1) });
    const joinService = createContactJoinService({ ...config, encryptionKey, fingerprintKey, keyVersion: 1,
      provider: "resend", environment: "test", verifyCaptcha: async token => token === "local-fixture-challenge" });
    const enrollment = createInvitationPreviewHandler({ enabled: true, preview: createInvitationPreviewGateway(config),
      logger: { write() {} }, now: Date.now, origin: "https://www.signalword.app", join: joinService, management: approval });
    const common = { logger: { write() {} }, now: Date.now };
    const user = createUserApiHandler({
      ...common,
      backend,
      lifecycle,
      invitations, approval,
      network: createContactNetworkGateway({ ...config, journal }),
      checkIn: createCheckInGateway(config),
      delivery: createDeliveryPolicy("test", "resend"),
      generateToken: generateViewerToken,
      encryptPayload: async (token) => ({
        ciphertext: await cipher.encrypt(token),
        keyVersion: 1,
      }),
      protectContact: async (email, token) => {
        const fingerprint = await contacts.fingerprintDestination(email);
        fingerprints.push(fingerprint);
        return {
          destinationCiphertext: await contacts.encryptDestination(email),
          destinationFingerprint: fingerprint,
          destinationKeyVersion: 1,
          confirmationPayloadCiphertext: await contacts
            .encryptConfirmationToken(token),
          payloadKeyVersion: 1,
        };
      },
    });
    const publicEvent = createPublicEventHandler({ ...common, backend });
    const confirmation = createContactConfirmHandler({ ...common, lifecycle });
    const webhookKey = crypto.getRandomValues(new Uint8Array(32));
    const webhook = createResendWebhookHandler({
      webhookSecret: "whsec_" + Buffer.from(webhookKey).toString("base64"),
      apply: async (event) => {
        const r = await fetch(
          `${local.API_URL}/rest/v1/rpc/reconcile_resend_webhook`,
          {
            method: "POST",
            headers: {
              apikey: local.SERVICE_ROLE_KEY,
              Authorization: `Bearer ${local.SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              p_provider_event_id: event.providerEventId,
              p_provider_message_id: event.providerMessageId,
              p_event_type: event.eventType,
              p_correlation: event.deliveryCorrelation ?? null,
            }),
          },
        );
        if (!r.ok) throw Error("FIXTURE_CALLBACK_STORAGE");
        return await r.json();
      },
    });
    api = createServer(
      bridge((r) =>
        new URL(r.url).pathname === "/resend-webhook"
          ? webhook(r)
          : new URL(r.url).pathname.includes("/public/events/")
          ? publicEvent(r)
          : new URL(r.url).pathname.includes("/contacts/confirm/")
          ? confirmation(r)
          : user(r)
      ),
    );
    await new Promise((r) => api.listen(0, "127.0.0.1", r));
    const apiOrigin = `http://127.0.0.1:${api.address().port}`;
    const request = async (path, method = "GET", body, extra = {}) => {
      const response = await fetch(apiOrigin + path, {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const value = await response.json();
      assert.ok(
        response.ok,
        `${method} local fixture request: ${response.status} ${value.error?.code} ${value.error?.message ?? ""}`,
      );
      return value;
    };
    let providerFault;
    const accept = (d) => {
      if (!providerIds.has(d.idempotencyKey)) {
        providerIds.set(d.idempotencyKey, crypto.randomUUID());
        sent.push(d);
      }
      return { providerMessageId: providerIds.get(d.idempotencyKey) };
    };
    // Implements Resend-shaped outcomes locally; it never calls Resend or sends a message.
    const adapter = {
      provider: "resend",
      send: async (d) => {
        if (providerFault === "429") {
          throw new DeliveryAttemptError("PROVIDER_RATE_LIMITED", true);
        }
        const result = accept(d);
        if (providerFault === "lost") {
          throw new DeliveryAttemptError("OUTCOME_UNKNOWN", false);
        }
        return result;
      },
      sendVerification: async (d) => accept(d),
    };
    const callback = async (
      d,
      type,
      eventId = crypto.randomUUID(),
      valid = true,
    ) => {
      const body = JSON.stringify({
        type,
        data: {
          email_id: providerIds.get(d.idempotencyKey),
          tags: {
            signalword_delivery: createHash("sha256").update(d.idempotencyKey)
              .digest("hex"),
          },
        },
      });
      const stamp = String(Math.floor(Date.now() / 1000));
      const signature = createHmac("sha256", webhookKey).update(
        `${eventId}.${stamp}.${body}`,
      ).digest("base64");
      const r = await fetch(apiOrigin + "/resend-webhook", {
        method: "POST",
        headers: {
          "svix-id": eventId,
          "svix-timestamp": stamp,
          "svix-signature": `v1,${valid ? signature : "invalid"}`,
        },
        body,
      });
      assert.equal(r.status, valid ? 202 : 401);
    };
    const confirmWorker = () =>
      runContactVerificationWorker({
        workerId: crypto.randomUUID(),
        outbox: createContactVerificationOutbox(config),
        confirmationCipher: { decryptToken: contacts.decryptConfirmationToken },
        destinationCipher: { decryptEmail: contacts.decryptDestination },
        adapter,
      });
    const alertWorker = () =>
      runDeliveryWorker({
        workerId: crypto.randomUUID(),
        outbox: createDeliveryOutbox(config),
        cipher,
        destinationCipher: { decryptEmail: contacts.decryptDestination },
        adapter,
      });
    await request("/v1/profile", "PUT", {
      displayName: "Local journey fixture",
    });
    // Real recipient-owned enrollment and sender approval through the same HTTP
    // handlers used by the native app. Only CAPTCHA/provider transport is fake.
    const key = crypto.randomUUID();
    const invitation = await request("/v3/contact-invitations", "POST", {}, { "Idempotency-Key": key });
    for (const subject of ["contact_invitation:" + userId, "contact_join:sender:" + userId, "contact_join:invitation:" + invitation.invitationId]) {
      enrollmentHashes.push(createHash("sha256").update(subject).digest("hex"));
    }
    enrollmentHashes.push(createHash("sha256").update("contact_join:destination:" + await contacts.fingerprintDestination("fixture-a@example.test")).digest("hex"));
    const retry = await request("/v3/contact-invitations", "POST", {}, { "Idempotency-Key": key });
    assert.equal(invitation.shareURL, retry.shareURL);
    assert.equal(sent.length, 0, "Creating/sharing never emails anyone");
    const invitationToken = new URL(invitation.shareURL).pathname.split("/").at(-1);
    let attemptId;
    let management;
    viewerServer = await createViteServer({ root: fileURLToPath(new URL("../apps/viewer/", import.meta.url)), server: { host: "127.0.0.1", port: 0 } });
    await viewerServer.listen();
    browser = await chromium.launch({ headless: true, ...(process.env.SIGNALWORD_CHROME_PATH ? { executablePath: process.env.SIGNALWORD_CHROME_PATH } : {}) });
    const recipientPage = await browser.newPage();
    await recipientPage.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "text/javascript",
      body: "window.turnstile={render:(node,options)=>{setTimeout(()=>options.callback('local-fixture-challenge'),0);return 'widget'},remove:()=>{},reset:()=>{}};" }));
    await recipientPage.route("**/api/enrollment/*", async route => {
      const r = route.request(), token = new URL(r.url()).pathname.split("/").at(-1);
      if (token === "config") return route.fulfill({ json: { enabled: true, siteKey: "local-fixture" } });
      const data = r.postDataJSON();
      const intent = r.headers()["x-signalword-action"];
      const path = token.length === 64 ? `/v3/contact-management/${token}` : `/v3/contact-invitations/${token}${intent ? "/" + intent : ""}`;
      const body = intent === "verify" ? { attemptId: data.attemptId, code: data.code } : data;
      if (intent === "begin") { body.intent = "join"; attemptId = body.attemptId; enrollmentAttempts.push(attemptId); }
      const response = await enrollment(new Request("https://api.example.test" + path, { method: r.method(),
        headers: { Origin: "https://www.signalword.app", "Content-Type": "application/json" },
        ...(r.method() === "POST" ? { body: JSON.stringify(body) } : {}) }));
      const result = await response.json();
      if (intent === "begin" && response.ok) {
        management = result.withdrawalToken;
        assert.equal(await runContactJoinEmail({ leaseId: crypto.randomUUID(), service: joinService,
          adapter: { provider: "resend", sendJoinCode: async message => { sent.push(message); return { providerMessageId: crypto.randomUUID() }; } } }), "sent");
      }
      await route.fulfill({ status: response.status, json: result });
    });
    await recipientPage.goto(viewerServer.resolvedUrls.local[0] + "join/" + invitationToken);
    await recipientPage.getByRole("heading", { name: "Be there for Local journey fixture." }).waitFor();
    await recipientPage.getByLabel("Your email", { exact: true }).fill("fixture-a@example.test");
    await recipientPage.getByRole("checkbox").check();
    await recipientPage.getByRole("button", { name: "Email my verification code" }).click();
    await recipientPage.getByLabel("Verification code", { exact: true }).waitFor();
    assert.equal(sent.length, 1, "A recipient-requested code was dispatched once");
    await recipientPage.getByLabel("Verification code", { exact: true }).fill(sent[0].code);
    await recipientPage.getByRole("button", { name: "Verify my email" }).click();
    await recipientPage.getByRole("heading", { name: "Your email is verified" }).waitFor();
    const candidates = await request(`/v3/contact-invitations/${invitation.invitationId}/candidates`);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].emailHint, "f***@example.test");
    const approved = await request(`/v3/contact-invitations/${invitation.invitationId}/approve`, "POST", { attemptId, name: "Fixture A" });
    assert.equal((await request(`/v3/contact-invitations/${invitation.invitationId}/approve`, "POST", { attemptId, name: "Fixture A" })).contactId, approved.contactId);
    assert.equal(sent.length, 1, "Approval sends no alert or extra verification email");
    await recipientPage.getByRole("button", { name: "Refresh status" }).click();
    await recipientPage.getByRole("heading", { name: "Your connection is confirmed" }).waitFor();
    await browser.close(); browser = undefined;
    await viewerServer.close(); viewerServer = undefined;
    const command = crypto.randomUUID();
    const input = {
      kind: "test",
      triggerMethod: "manual",
      clientTriggeredAt: new Date().toISOString(),
    };
    const event = await request("/v2/alerts", "POST", input, {
      "Idempotency-Key": command,
    });
    const duplicate = await request("/v2/alerts", "POST", input, {
      "Idempotency-Key": command,
    });
    assert.equal(event.eventId, duplicate.eventId);
    assert.equal(duplicate.reused, true);
    await Promise.all([alertWorker(), alertWorker()]);
    assert.equal(sent.length, 2);
    const token = sent[1].viewerToken;
    viewerServer = await createViteServer({
      root: fileURLToPath(new URL("../apps/viewer/", import.meta.url)),
      server: {
        host: "127.0.0.1",
        port: 0,
        proxy: { "/v1": { target: apiOrigin } },
      },
    });
    await viewerServer.listen();
    browser = await chromium.launch({
      headless: true,
      ...(process.env.SIGNALWORD_CHROME_PATH
        ? { executablePath: process.env.SIGNALWORD_CHROME_PATH }
        : {}),
    });
    const page = await browser.newPage({
      viewport: { width: 320, height: 700 },
    });
    await page.route(
      "**/*",
      (route) =>
        ["127.0.0.1", "localhost"].includes(
            new URL(route.request().url()).hostname,
          )
          ? route.continue()
          : route.abort(),
    );
    await page.goto(
      `http://127.0.0.1:${viewerServer.httpServer.address().port}/events/${token}`,
    );
    await page.getByRole("button", { name: "Acknowledge this alert" })
      .waitFor();
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth
      ),
      true,
    );

    const view = await request(`/v1/public/events/${token}`);
    assert.equal(view.kind, "test");
    assert.equal(view.acknowledgedAt, undefined);
    // Twice the declared pilot burst: 10 simultaneous viewers and 5 retrying
    // senders. All requests hit the real local gate, API and database.
    const timings = [];
    await Promise.all(Array.from({ length: 20 }, async () => {
      const start = performance.now();
      assert.equal((await request(`/v1/public/events/${token}`)).kind, "test");
      timings.push(performance.now() - start);
    }));
    const retryTimes = [];
    await Promise.all(Array.from({ length: 10 }, async () => {
      const start = performance.now();
      const result = await request("/v2/alerts", "POST", input, {
        "Idempotency-Key": command,
      });
      assert.equal(result.eventId, event.eventId);
      retryTimes.push(performance.now() - start);
    }));
    const p95 = (a) =>
      Math.round(a.sort((x, y) => x - y)[Math.ceil(a.length * .95) - 1]);
    console.log(
      JSON.stringify({
        localBurst: {
          viewerRequests: 20,
          viewerP95Ms: p95(timings),
          duplicateRequests: 10,
          duplicateP95Ms: p95(retryTimes),
        },
      }),
    );
    assert.ok(
      p95(timings) < 5000 && p95(retryTimes) < 5000,
      "Local pilot burst budget: 5 seconds",
    );

    await page.getByRole("button", { name: "Acknowledge this alert" }).click();
    await page.getByText("Acknowledged through this recipient link.", {
      exact: false,
    }).waitFor();
    assert.ok((await request(`/v1/public/events/${token}`)).acknowledgedAt);

    await request(`/v1/public/events/${token}`, "POST", undefined, {
      "X-SignalWord-Action": "acknowledge",
    });
    const recovered = await request("/v1/alerts/recovery");
    assert.ok(JSON.stringify(recovered).includes(event.eventId));
    await request(`/v1/alerts/${event.eventId}/resolve`, "POST");
    await page.reload();
    await page.getByRole("heading", {
      name: "Local journey fixture resolved the alert",
    }).waitFor();
    await browser.close();
    browser = undefined;
    await viewerServer.close();
    viewerServer = undefined;

    await alertWorker();
    assert.equal(sent.length, 3);
    const otherContacts = [];
    for (const name of ["B", "C"]) {
      const c = await request("/v2/contacts", "POST", {
        name: `Fixture ${name}`,
        email: `fixture-${name.toLowerCase()}@example.test`,
      });
      await confirmWorker();
      const invite = sent.at(-1);
      await request(`/v1/contacts/confirm/${invite.confirmationToken}`, "POST");
      otherContacts.push({ id: c.contactId, invite });
    }
    await request("/v2/contact-network", "PUT", {
      policy: "primary_then_others",
    });
    const escalated = await request("/v2/alerts", "POST", {
      ...input,
      clientTriggeredAt: new Date().toISOString(),
    }, { "Idempotency-Key": crypto.randomUUID() });
    providerFault = "429";
    await alertWorker();
    assert.equal(
      sent.length,
      5,
      "rejected provider attempt creates no message",
    );
    await sql(
      `update public.alert_deliveries set next_attempt_at=now() where alert_event_id='${escalated.eventId}' and attempt_count=1;`,
    );
    providerFault = "lost";
    await alertWorker();
    const ambiguous = sent.at(-1);
    const acceptedCount = sent.length;
    await alertWorker();
    assert.equal(
      sent.length,
      acceptedCount,
      "unknown acceptance must not be resent",
    );
    await callback(ambiguous, "email.delivered", crypto.randomUUID(), false);
    const deliveredEvent = crypto.randomUUID();
    await callback(ambiguous, "email.delivered", deliveredEvent);
    await callback(ambiguous, "email.delivered", deliveredEvent);
    await callback(ambiguous, "email.sent");
    assert.equal(
      (await sql(
        `select status from public.alert_deliveries where alert_event_id='${escalated.eventId}' and attempt_count>0;`,
      )).trim(),
      "delivered",
      "out-of-order callback cannot downgrade delivery",
    );
    await request(
      `/v1/public/events/${ambiguous.viewerToken}`,
      "POST",
      undefined,
      { "X-SignalWord-Action": "acknowledge" },
    );
    await request(
      `/v1/contacts/confirm/${otherContacts[1].invite.confirmationToken}`,
      "POST",
      undefined,
      { "X-SignalWord-Action": "withdraw" },
    );
    assert.equal(
      (await sql(
        `select last_error_code from public.alert_deliveries where alert_event_id='${escalated.eventId}' and trusted_contact_id='${
          otherContacts[1].id
        }';`,
      )).trim(),
      "CONTACT_WITHDRAWN",
    );
    await sql(
      `update public.alert_deliveries set next_attempt_at=now() where alert_event_id='${escalated.eventId}' and status='queued';`,
    );
    providerFault = undefined;
    await alertWorker();
    assert.equal(
      sent.length,
      acceptedCount + 1,
      "acknowledgement does not cancel escalation; withdrawal cancels only C",
    );
    await request(`/v1/alerts/${escalated.eventId}/resolve`, "POST");
    await alertWorker();
    await alertWorker();
    const timer = await request("/v2/check-in", "POST", {
      action: "start",
      minutes: 15,
    }, { "Idempotency-Key": crypto.randomUUID() });
    assert.equal(timer.state, "active");
    await request("/v2/check-in", "POST", {
      action: "cancel",
      timerId: timer.timerId,
    }, { "Idempotency-Key": crypto.randomUUID() });
    await sql(
      `update public.check_in_timers set created_at=now()-interval '40 minutes' where user_id='${userId}' and state='cancelled';`,
    );
    const expiring = await request("/v2/check-in", "POST", {
      action: "start",
      minutes: 15,
    }, { "Idempotency-Key": crypto.randomUUID() });
    await sql(
      `update public.check_in_timers set created_at=now()-interval '20 minutes',deadline=now()-interval '2 minutes',grace_ends_at=now()-interval '1 minute' where id='${expiring.timerId}';select public.sweep_check_ins();select public.sweep_check_ins();`,
    );
    const expired = await request("/v2/check-in");
    assert.equal(expired.state, "escalated");
    assert.ok(expired.incidentId);
    await alertWorker();
    assert.equal(sent.at(-1).kind, "real");
    assert.equal(sent.at(-1).cause, "missed_check_in");
    await request(`/v1/alerts/${expired.incidentId}/resolve`, "POST");
    await alertWorker();
    const statusBeforeDelete = await approval.status(management);
    assert.equal(statusBeforeDelete.status, "approved");
    assert.deepEqual(await approval.withdraw(management), { withdrawn: true });
    assert.equal((await approval.status(management)).status, "withdrawn");
    assert.deepEqual(await approval.withdraw(management), { withdrawn: true }, "withdrawal retry is safe and journal durable");
    receipt = generateViewerToken();
    await request("/v1/data", "DELETE", undefined, {
      "X-Deletion-Receipt": receipt,
    });
    assert.equal(
      (await sql(`select count(*) from auth.users where id='${userId}';`))
        .trim(),
      "0",
    );
    await assert.rejects(() => approval.status(management), /unavailable/);
    assert.ok(objects.size >= 1);
    console.log(
      "PASS: real local Auth/API/database/React browser; recipient-owned joining, sender approval/retry, existing-contact upgrade; three contacts; duplicate workers; provider rejection/retry/lost response; signed/duplicate/out-of-order callbacks; acknowledgement/escalation; withdrawal; timer cancellation/expiry; resolution; durable deletion. No messages sent.",
    );
  } finally {
    try {
      if (receipt) {
        await sql(
          `delete from public.deletion_receipts where receipt_hash=extensions.digest('${receipt}','sha256');`,
        );
      }
      if (providerIds.size) {
        await sql(
          `delete from public.delivery_webhook_receipts where provider_message_id in (${
            [...providerIds.values()].map((id) => `'${id}'`).join(",")
          });`,
        );
      }
      for (const attempt of enrollmentAttempts) {
        await sql(`delete from public.contact_join_delivery_evidence where attempt_id='${attempt}';`);
      }
      if (userId) {
        const hashes = [
          createHash("sha256").update("contact_setup:" + userId).digest("hex"),
          ...fingerprints, ...enrollmentHashes,
        ];
        for (const d of sent) {
          if (d.viewerToken) {
            for (const action of ["read", "ack"]) {
              hashes.push(
                createHash("sha256").update(
                  Buffer.concat([
                    createHash("sha256").update(d.viewerToken).digest(),
                    Buffer.from(action),
                  ]),
                ).digest("hex"),
              );
            }
          }
        }
        await sql(
          `delete from public.rate_limit_buckets where encode(subject_hash,'hex') in (${
            hashes.map((h) => `'${h}'`).join(",")
          });`,
        );
      }
      if (userId) {
        await sql(
          `delete from auth.users where id='${userId}';delete from public.pending_deletions where user_id='${userId}';delete from public.safety_journal_outbox where user_id='${userId}';`,
        );
      }
      for (const id of vaultIds) {
        await sql(`delete from vault.secrets where id='${id}';`);
      }
    } finally {
      if (browser) await browser.close();
      if (viewerServer) await viewerServer.close();
      if (originalTrust) {
        await run([
          "exec",
          "-i",
          container,
          "sh",
          "-c",
          "cat > /etc/ssl/certs/ca-certificates.crt",
        ], originalTrust);
      }
      await run(["restart", localRestContainer]);
      await run(["exec", container, "rm", "-f", certName]);
      if (api) await new Promise((r) => api.close(r));
      await new Promise((r) => control.close(r));
    }
  }
}
