import test from "node:test";
import assert from "node:assert/strict";
import { installationProblems } from "../scripts/verify-ios-installation.mjs";
const team = "ABC123DE45", group = "group.com.signalword.shared";
const info = {
  CFBundleIdentifier: "com.signalword.app",
  CFBundleVersion: "2",
  CFBundleShortVersionString: "1.0",
  SignalWordAppGroupIdentifier: group,
  SignalWordSupabaseURL: "https://voepalyamwgenceawdvl.supabase.co",
  SignalWordUserAPIURL:
    "https://voepalyamwgenceawdvl.supabase.co/functions/v1/user-api",
  SignalWordVerificationURL:
    "https://www.signalword.app/onboarding/verify.html",
  SignalWordTurnstileSiteKey: "0x4AAAAAAFFb3ETKlwBxFCNF",
  SignalWordSupabasePublishableKey: "sb_publishable_fixture",
  SignalWordCrashReportingEnabled: "NO",
};
const entitlements = {
  "com.apple.security.application-groups": [group],
  "com.apple.developer.team-identifier": team,
  "application-identifier": team + ".com.signalword.app",
};
const profile = {
  TeamIdentifier: [team],
  Entitlements: { "com.apple.security.application-groups": [group] },
  ExpirationDate: "2030-01-01",
  ProvisionedDevices: ["fixture-device"],
};
test("candidate metadata matches only the owned team and development configuration", () => {
  assert.deepEqual(installationProblems(info, entitlements, profile, team), []);
  assert.ok(
    installationProblems(info, entitlements, profile, undefined).includes(
      "OWNED_PAID_TEAM_ID_REQUIRED",
    ),
  );
  assert.ok(
    installationProblems(
      { ...info, SignalWordUserAPIURL: "https://production.invalid" },
      entitlements,
      profile,
      team,
    ).includes("CONFIGURATION_MISMATCH:SignalWordUserAPIURL"),
  );
});
test("unsafe credentials, wrong groups, stale builds and expired profiles block installation", () => {
  const errors = installationProblems(
    {
      ...info,
      CFBundleVersion: "1",
      SignalWordSupabasePublishableKey: "sb_secret_fixture",
      SignalWordCrashReportingEnabled: "YES",
    },
    { ...entitlements, "com.apple.security.application-groups": [] },
    { ...profile, ExpirationDate: "2000-01-01" },
    team,
  );
  for (
    const code of [
      "BUILD_MISMATCH",
      "PUBLISHABLE_CLIENT_KEY_REQUIRED",
      "UNVERIFIED_CRASH_REPORTING_ENABLED",
      "APP_GROUP_MISMATCH",
      "PROFILE_EXPIRED",
    ]
  ) assert.ok(errors.includes(code));
});
