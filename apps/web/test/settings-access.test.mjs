import assert from "node:assert/strict";
import test from "node:test";
import { canOpenSettings } from "../src/features/settings/access.ts";
import { settingsDestination } from "../src/features/settings/externalNavigation.ts";
import { eligibleForBulkReview } from "../src/features/settings/mappings/bulkReview.ts";

function identity(role, billingAdmin = false) {
  return { role, billingAdmin };
}

test("Settings presentation never exposes HQ or workspace management to customer standard roles", () => {
  for (const role of ["standard_user", "client_portal_user"]) {
    for (const section of [
      "team",
      "profiles",
      "branding",
      "ai-usage",
      "intelligence-mappings",
      "hq-tenants",
      "hq-analyst",
    ])
      assert.equal(
        canOpenSettings(section, identity(role)),
        false,
        `${role}/${section}`,
      );
    assert.equal(canOpenSettings("personal", identity(role)), true);
    assert.equal(canOpenSettings("contact-info", identity(role)), true);
  }
  assert.equal(canOpenSettings("hq-tenants", identity("user_admin")), false);
  assert.equal(canOpenSettings("hq-tenants", identity("capiro_admin")), true);
});

test("Billing mirrors both the user admin role and independent billing-admin grant", () => {
  assert.equal(
    canOpenSettings("billing", identity("user_admin", false)),
    false,
  );
  assert.equal(
    canOpenSettings("billing", identity("standard_user", true)),
    false,
  );
  assert.equal(canOpenSettings("billing", identity("user_admin", true)), true);
  assert.equal(
    canOpenSettings("billing", identity("capiro_admin", false)),
    true,
  );
});

test("Hosted account navigation rejects unsafe schemes, misleading hosts and credentials", () => {
  assert.equal(
    settingsDestination("https://billing.stripe.com/p/session/test", "billing"),
    "https://billing.stripe.com/p/session/test",
  );
  assert.equal(
    settingsDestination("https://accounts.google.com/o/oauth2/auth", "google"),
    "https://accounts.google.com/o/oauth2/auth",
  );
  assert.equal(
    settingsDestination(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      "microsoft",
    ),
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  );
  for (const value of [
    "javascript:alert(1)",
    "http://billing.stripe.com/test",
    "https://billing.stripe.com.attacker.test",
    "https://attacker@billing.stripe.com/test",
    "https://billing.stripe.com@attacker.test/test",
  ])
    assert.throws(() => settingsDestination(value, "billing"));
  assert.throws(() =>
    settingsDestination("https://accounts.google.com/", "microsoft"),
  );
});

test("Bulk intelligence review excludes award-bearing, PAC, unknown, resolved and weak mappings", () => {
  const candidate = {
    confirmed: false,
    reviewStatus: "candidate",
    confidence: 0.6,
    source: "lda",
  };
  assert.equal(eligibleForBulkReview(candidate), true);
  for (const source of [
    "contracting",
    "assistance_recipient",
    "fec_committee",
    "new_unknown_source",
  ])
    assert.equal(
      eligibleForBulkReview({ ...candidate, source, confidence: 1 }),
      false,
    );
  for (const reviewStatus of ["confirmed", "rejected", "superseded"])
    assert.equal(eligibleForBulkReview({ ...candidate, reviewStatus }), false);
  assert.equal(
    eligibleForBulkReview({ ...candidate, confidence: 0.59 }),
    false,
  );
  assert.equal(eligibleForBulkReview({ ...candidate, confirmed: true }), false);
});
