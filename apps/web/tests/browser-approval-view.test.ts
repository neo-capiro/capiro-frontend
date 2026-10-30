import { describe, expect, it } from "vitest";
import type { IntentsItem } from "@capiro/meri-client/intents";
import { browserRow, browserDecideRequest } from "../src/features/meri/conversation/intents/browser-view";
import type { Viewer } from "../src/features/meri/conversation/intents/intent-view-types";

const NOW = 1_700_000_000_000;
const viewer: Viewer = { tenantId: "tenant", actorId: "actor" };
const binding = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: "00000000-0000-4000-8000-000000000001",
  runId: "00000000-0000-4000-8000-000000000003",
  attemptId: "00000000-0000-4000-8000-000000000004",
  workerId: "00000000-0000-4000-8000-000000000005",
  writerFence: 1,
};
const proposal = {
  kind: "browser_action" as const,
  proposalId: "00000000-0000-4000-8000-000000000002",
  subjectSha256: "a".repeat(64),
  operation: { id: "browser_action" as const, version: "0.2.0" as const },
  binding,
  display: {
    tool: "browser_click",
    pageOrigin: "https://app.capiro.example",
    server: "capiov2-browser",
    inputSha256: "b".repeat(64),
    policySha256: "c".repeat(64),
  },
  requiredApprover: { tenantId: "tenant", actorId: "actor" },
  scopes: [
    { tenantId: "tenant", kind: "private-user", resourceId: "actor", policyRevision: "p1" },
  ],
  requestedAtMs: NOW - 1_000,
  expiresAtMs: NOW + 600_000,
  createdAt: new Date(NOW).toISOString(),
};

function item(over: Record<string, unknown> = {}): IntentsItem {
  return {
    deliveryId: "browser:" + "e".repeat(64),
    createdAt: new Date(NOW).toISOString(),
    operation: { id: "browser_approval_preparation", version: "0.2.0" },
    state: "prepared",
    kind: "browser_action",
    proposal,
    decision: null,
    execution: null,
    phase: "awaiting_approval",
    ...over,
  } as unknown as IntentsItem;
}

describe("browser action rows", () => {
  it("renders reviewed context and offers a decision only to the intended approver in the live window", () => {
    const row = browserRow(item() as never, NOW, viewer);
    expect(row.decision).toBe("approvable");
    expect(row.status).toBe("Waiting for your approval");
    expect(row.fields.map((f) => f.label)).toContain("Site");
    expect(row.fields.find((f) => f.label === "Site")?.value).toBe("https://app.capiro.example");
    expect(row.fields.some((f) => f.label === "Input fingerprint")).toBe(true);
    // No raw input, credentials or page content is ever published.
    expect(row.fields.map((f) => f.value).join(" ")).not.toContain("##confirm");
  });

  it("shows a recorded approval as awaiting execution, never as success", () => {
    const row = browserRow(
      item({
        decision: {
          proposalId: proposal.proposalId,
          subjectSha256: proposal.subjectSha256,
          decision: "approved",
          decidedAt: new Date(NOW).toISOString(),
          approver: { tenantId: "tenant", actorId: "actor" },
          policyRevision: "p1",
        },
        phase: "approved",
      }) as never,
      NOW,
      viewer,
    );
    expect(row.status).toBe("Approved · awaiting execution");
    expect(row.tone).toBe("neutral");
    expect(row.decision).toBe("closed");
    expect(row.result.map((f) => `${f.label}:${f.value}`)).toContain("Your decision:Approved");
  });

  it("treats only a completed observation as execution evidence", () => {
    const ok = browserRow(
      item({
        execution: { state: "completed", outcome: "ok", reference: "downloads/r-1" },
      }) as never,
      NOW,
      viewer,
    );
    expect(ok.status).toBe("Completed");
    expect(ok.tone).toBe("success");
    expect(ok.result.map((f) => f.label)).toContain("Reference");
    const failed = browserRow(
      item({ execution: { state: "completed", outcome: "error", reference: null } }) as never,
      NOW,
      viewer,
    );
    expect(failed.status).toBe("Failed");
    expect(failed.tone).toBe("danger");
  });

  it("distinguishes expired, unavailable and foreign-viewer states without an approve control", () => {
    const expired = browserRow(item({ phase: "expired" }) as never, NOW + 601_000, viewer);
    expect(expired.status).toBe("Expired");
    expect(expired.decision).toBe("closed");
    const unknown = browserRow(item({ phase: "unknown_decision" }) as never, NOW, viewer);
    expect(unknown.status).toBe("Decision unavailable");
    expect(unknown.tone).toBe("warning");
    const foreign = browserRow(item() as never, NOW, { tenantId: "tenant", actorId: "other" });
    expect(foreign.decision).toBe("closed");
    expect(foreign.status).toBe("Waiting for review");
    const withheld = browserRow(
      {
        deliveryId: "browser:" + "e".repeat(64),
        createdAt: new Date(NOW).toISOString(),
        operation: { id: "browser_approval_preparation", version: "0.2.0" },
        state: "prepared",
        kind: "browser_action",
        withheld: true,
      } as unknown as never,
      NOW,
      viewer,
    );
    expect(withheld.status).toBe("Unavailable");
    expect(withheld.proposal).toBeNull();
  });
});

describe("browser decide request", () => {
  it("binds the subject digest and browser delivery, never a command digest", () => {
    const row = browserRow(item() as never, NOW, viewer);
    const request = browserDecideRequest(row, binding.conversationId, "approved");
    expect(request).toMatchObject({
      conversationId: binding.conversationId,
      deliveryId: row.deliveryId,
      proposalId: proposal.proposalId,
      subjectSha256: proposal.subjectSha256,
      decision: "approved",
    });
    expect(Object.hasOwn(request!, "commandSha256")).toBe(false);
  });
});
