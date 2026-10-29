import { expect, it } from "vitest";
import {
  memoryRetentionPolicyRead,
  memoryRetentionPolicyOperations,
} from "../src/shared/capiro/operations/memory-retention-policy";
import { memoryPrivacyView } from "../src/features/meri/privacy/retention-policy-view";
import { policyRead } from "./memory-retention-policy-fixture";

it("admits only the supported installed policy and a no-input read", () => {
  expect(memoryRetentionPolicyRead.parse(policyRead)).toEqual(policyRead);
  expect(
    memoryRetentionPolicyOperations["memory.retentionPolicy.read"].method,
  ).toBe("GET");
  expect(
    memoryRetentionPolicyOperations[
      "memory.retentionPolicy.read"
    ].request.safeParse({ body: { tenantId: policyRead.owner.tenantId } })
      .success,
  ).toBe(false);
});
it.each(["version", "duration", "missing-store", "request", "hold", "extra"])(
  "refuses an unsupported %s projection",
  (kind) => {
    const value = structuredClone(policyRead);
    if (kind === "version") Object.assign(value.policy, { version: 2 });
    if (kind === "duration")
      Object.assign(value.policy, { personalAfterOffboardingHours: 24 });
    if (kind === "missing-store") value.policy.payloadStores.pop();
    if (kind === "request")
      Object.assign(value.requests, { deletion: "completed" });
    if (kind === "hold") Object.assign(value.policy, { heldContent: "delete" });
    if (kind === "extra") Object.assign(value, { record: "private text" });
    expect(memoryRetentionPolicyRead.safeParse(value).success).toBe(false);
  },
);
it("distinguishes eligibility, immediate suppression, ongoing firm ownership and unsupported stores", () => {
  const view = memoryPrivacyView(policyRead);
  expect(view.stores.description).toContain("not deletion receipts");
  expect(view.stores.description).toContain(policyRead.observedAt);
  expect(
    view.stores.rows.find((row) => row.id === "personal")?.retention,
  ).toContain("after 30 days");
  expect(
    view.stores.rows.find((row) => row.id === "client")?.retention,
  ).toContain("after 90 days");
  expect(
    view.stores.rows.find((row) => row.id === "draft")?.retention,
  ).toContain("does not extend");
  expect(
    view.stores.rows.find((row) => row.id === "firm")?.retention,
  ).toContain("Survives");
  expect(
    view.stores.rows.find((row) => row.id === "other")?.retention,
  ).toContain("not reported");
  expect(
    view.retained.notices.find(
      (row) => row.title === "Legal holds and related records",
    )?.detail,
  ).toContain("remain retained");
});
it("does not show assumed policy values or request completion after a failed or pending read", () => {
  const view = memoryPrivacyView();
  expect(JSON.stringify(view)).not.toMatch(
    /30 days|90 days|completed|request submitted/,
  );
  expect(
    view.stores.rows
      .filter((row) => row.id !== "other")
      .every((row) => row.retention.includes("unavailable")),
  ).toBe(true);
});
