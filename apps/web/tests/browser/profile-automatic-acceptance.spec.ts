import { test, expect } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  findingId,
  runId,
  installEnrichment,
} from "./client-enrichment-fixtures";
test("an exact official fact is labeled automatic and Not right records rejection without editing later person data", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  const finding = state.run!.findings.find((item) => item.id === findingId)!;
  Object.assign(finding, {
    status: "accepted",
    targetKey: "uei",
    proposedValue: "ABC123DEF456",
    source: "sam_gov",
    autoAccepted: true,
    evidence: [
      {
        label: "Synthetic exact SAM record",
        url: "https://sam.gov/entity/synthetic",
        metadata: { acceptanceMode: "exact_identifier" },
      },
    ],
  });
  await page.route(
    `**/api/backend/core/clients/${clientId}/profile-build/profile`,
    (route) =>
      json(route, {
        subject: { kind: "client", id: clientId },
        version: "a".repeat(64),
        fields: { description: "Later person-authored description" },
        facts:
          finding.status === "accepted"
            ? [
                {
                  id: "10000000-0000-4000-8000-000000000008",
                  runId,
                  findingId,
                  fieldKey: "uei",
                  value: "ABC123DEF456",
                  origin: "official",
                  sourceType: "sam_gov",
                  sourceUrl: null,
                  attachmentId: null,
                  evidence: finding.evidence,
                  observedAt: null,
                  confidence: 1,
                  status: "approved",
                  approvedBy: null,
                  approvedAt: "2026-01-01T00:00:00Z",
                  version: 1,
                  isCurrent: true,
                  autoAccepted: true,
                },
              ]
            : [],
        conflicts: [],
        completeness: { completed: 1, total: 6, missing: [], sections: [] },
        sections: {
          locations: [],
          leadership: [],
          capabilities: [],
          advocacy: [],
          notes: [],
          documents: [],
        },
      }),
  );
  await page.goto(`/portfolio/${clientId}`);
  await page
    .getByRole("button", { name: "Profile activity", exact: true })
    .click();
  const sources = page.getByRole("region", {
    name: "Sources and review",
    exact: true,
  });
  await sources.getByText("Saved facts · 1", { exact: true }).click();
  await expect(sources).toContainText(
    "Automatically accepted · exact identifier",
  );
  await sources.getByRole("button", { name: "Not right", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Mark this fact not right?",
    exact: true,
  });
  await expect(dialog).toContainText("later edits stay saved");
  await dialog
    .getByLabel("Reason (optional)", { exact: true })
    .fill("Wrong legal entity");
  await dialog
    .getByRole("button", { name: "Confirm not right", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0]?.path).toBe(`findings/${findingId}/reject`);
  expect(state.posts[0]?.body).toEqual({ reason: "Wrong legal entity" });
  const row = page.getByRole("article", { name: "Finding uei", exact: true });
  await expect(
    row.getByRole("button", { name: "Restore", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Restore", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm restore", exact: true })
    .click();
  await expect(
    row.getByRole("button", { name: "Ignore", exact: true }),
  ).toBeVisible();
  await expect(row).not.toContainText("Automatically accepted");
  expect(state.posts).toHaveLength(2);
  expect(unexpected).toEqual([]);
});
