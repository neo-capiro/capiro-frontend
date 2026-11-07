import { test, expect, type Page } from "@playwright/test";
import { client, clientId, json, prospect, prospectId } from "./fixtures";
import { installEnrichment } from "./client-enrichment-fixtures";
const canonicalEntityId = "10000000-0000-4000-8000-000000000020";
const sourceCandidate = {
  source: "sam",
  externalId: "ABC123DEF456",
  name: "Synthetic Source Company",
};
const claim = {
  kind: "former_name",
  name: "Synthetic Prior Company",
  sourceUrl: "https://example.test/about",
  quote: "Synthetic Source Company was formerly Synthetic Prior Company.",
};
const profile = (kind: "client" | "prospect", id: string) => ({
  subject: { kind, id },
  version: "a".repeat(64),
  fields: {},
  facts: [],
  conflicts: [],
  completeness: { completed: 0, total: 6, missing: [], sections: [] },
  sections: {
    locations: [],
    leadership: [],
    capabilities: [],
    advocacy: [],
    notes: [],
    documents: [],
  },
});
async function sourceFixtures(page: Page) {
  const fixture = await installEnrichment(page);
  fixture.state.run = null;
  const confirmations: Record<string, unknown>[] = [];
  const creates: Record<string, unknown>[] = [];
  const profiles: Record<string, unknown>[] = [];
  await page.route("**/clients/profile-build/identity-preview", (route) =>
    json(route, {
      status: "ambiguous",
      entity: null,
      duplicate: null,
      sourceGaps: [],
      candidates: [
        {
          entity: { id: null, canonicalName: sourceCandidate.name },
          sourceCandidate,
          claims: [claim],
          reasons: ["Exact sourced company name"],
        },
      ],
    }),
  );
  await page.route("**/clients/profile-build/identity-confirm", (route) => {
    const body = route.request().postDataJSON();
    confirmations.push(body);
    if (confirmations.length === 1)
      return json(
        route,
        { message: "Synthetic confirmation response unavailable" },
        503,
      );
    return json(route, {
      requestId: body.requestId,
      canonicalEntityId,
      sourceCandidate: body.sourceCandidate,
    });
  });
  await page.route("**/api/backend/core/clients", (route) => {
    if (route.request().method() !== "POST") return json(route, [client]);
    const body = route.request().postDataJSON();
    creates.push(body);
    return json(route, { ...client, ...body });
  });
  await page.route(`**/clients/${clientId}/profile-build/profile`, (route) => {
    if (route.request().method() === "PUT") {
      profiles.push(route.request().postDataJSON());
      return json(route, profile("client", clientId));
    }
    return route.fallback();
  });
  return { ...fixture, confirmations, creates, profiles };
}
async function openProfile(page: Page) {
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  return page.getByRole("dialog", { name: "Add profile", exact: true });
}
test("a website-only entry creates only the company name returned by the selected source", async ({
  page,
}) => {
  const { creates, state, unexpected } = await sourceFixtures(page);
  await page.route("**/clients/profile-build/identity-confirm", (route) => {
    const body = route.request().postDataJSON();
    return json(route, {
      requestId: body.requestId,
      canonicalEntityId,
      sourceCandidate: body.sourceCandidate,
    });
  });
  const dialog = await openProfile(page);
  await expect(dialog).toContainText("A website alone is enough");
  await dialog.getByLabel(/Website/).fill("https://example.test");
  await expect(
    dialog.getByLabel("Company name", { exact: true }),
  ).not.toHaveAttribute("required");
  await expect(dialog.getByLabel("Company name", { exact: true })).toHaveValue(
    "",
  );
  const request = page.waitForRequest((value) =>
    value.url().endsWith("clients/profile-build/identity-preview"),
  );
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({
    website: "https://example.test",
  });
  await dialog.getByRole("radio", { name: /Synthetic Source Company/ }).check();
  await expect(
    dialog.getByRole("radio", { name: /None of these/ }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Build profile", exact: true })
    .click();
  await expect.poll(() => creates.length).toBe(1);
  expect(creates[0]).toMatchObject({
    name: "Synthetic Source Company",
    website: "https://example.test",
    canonicalEntityId,
  });
  await expect
    .poll(() => state.posts.filter((entry) => entry.path === "runs").length)
    .toBe(1);
  expect(
    state.posts.find((entry) => entry.path === "runs")?.body,
  ).toMatchObject({
    sources: ["public_web", "sam_gov", "lda"],
    website: "https://example.test/",
    attachmentIds: [],
    ldaClientIds: [],
    discoverLda: true,
  });
  expect(unexpected).toEqual([]);
});
test("sourced identity confirmation retries the same command before any profile or research is created", async ({
  page,
}) => {
  const { confirmations, creates, state, unexpected } =
    await sourceFixtures(page);
  const dialog = await openProfile(page);
  await dialog
    .getByLabel("Company name", { exact: true })
    .fill("Synthetic Source Company");
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  const choice = dialog.getByRole("radio", {
    name: /Synthetic Source Company/,
  });
  await choice.check();
  const formerName = dialog.getByRole("checkbox", {
    name: "Confirm former name: Synthetic Prior Company",
    exact: true,
  });
  await expect(formerName).not.toBeChecked();
  await expect(dialog).toContainText(claim.quote);
  await formerName.check();
  await dialog
    .getByRole("button", { name: "Build profile", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Retry company confirmation",
      exact: true,
    }),
  ).toBeEnabled();
  await expect(choice).toBeDisabled();
  await expect(formerName).toBeDisabled();
  expect(creates).toEqual([]);
  expect(state.posts).toEqual([]);
  await dialog
    .getByRole("button", { name: "Retry company confirmation", exact: true })
    .click();
  await expect.poll(() => creates.length).toBe(1);
  expect(confirmations).toHaveLength(2);
  expect(confirmations[1]).toEqual(confirmations[0]);
  expect(confirmations[0]).toMatchObject({ sourceCandidate, claims: [claim] });
  expect(creates[0]).toMatchObject({
    canonicalEntityId,
    name: "Synthetic Source Company",
  });
  await expect
    .poll(() => state.posts.filter((entry) => entry.path === "runs").length)
    .toBe(1);
  expect(unexpected).toEqual([]);
});
test("manual entry preserves the created client through a later person-save retry after source confirmation", async ({
  page,
}) => {
  const { confirmations, creates, profiles, unexpected } =
    await sourceFixtures(page);
  let failPerson = true;
  await page.route(`**/clients/${clientId}/profile-build/profile`, (route) => {
    if (route.request().method() === "PUT" && failPerson) {
      failPerson = false;
      profiles.push(route.request().postDataJSON());
      return json(
        route,
        { message: "Synthetic person save response unavailable" },
        503,
      );
    }
    return route.fallback();
  });
  const dialog = await openProfile(page);
  await dialog.getByRole("button", { name: /Manual entry/ }).click();
  await dialog
    .getByLabel("Legal name *", { exact: true })
    .fill("Synthetic Source Company");
  await dialog
    .getByRole("button", { name: "6. Advocacy profile", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await dialog.getByRole("radio", { name: /Synthetic Source Company/ }).check();
  await dialog
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Retry company confirmation",
      exact: true,
    }),
  ).toBeEnabled();
  expect(creates).toEqual([]);
  await dialog
    .getByRole("button", { name: "Retry company confirmation", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Retry profile details", exact: true }),
  ).toBeEnabled();
  expect(creates).toHaveLength(1);
  await dialog
    .getByRole("button", { name: "Retry profile details", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(creates).toHaveLength(1);
  expect(confirmations).toHaveLength(2);
  expect(confirmations[1]).toEqual(confirmations[0]);
  expect(profiles).toHaveLength(2);
  expect(profiles[1]).toEqual(profiles[0]);
  expect(creates[0]).toMatchObject({ canonicalEntityId });
  expect(unexpected).toEqual([]);
});
test("prospects use the confirmed canonical identity in the existing create owner", async ({
  page,
}) => {
  const { confirmations, unexpected } = await sourceFixtures(page);
  const creates: Record<string, unknown>[] = [];
  await page.route("**/business-development/prospect-stages", (route) =>
    json(route, {
      version: "portfolio-3.1",
      createStage: "identified",
      legacyMapping: "pending",
      allowLegacyTransitions: false,
      stages: [
        "identified",
        "initiated",
        "engaged",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ].map((value) => ({ value, label: value })),
    }),
  );
  await page.route("**/business-development/prospects", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON();
    creates.push(body);
    return json(route, { ...prospect, ...body });
  });
  await page.route(
    `**/business-development/prospects/${prospectId}/profile-build/profile`,
    (route) => json(route, profile("prospect", prospectId)),
  );
  await page.goto("/portfolio/prospects?new=1");
  const dialog = page.getByRole("dialog", {
    name: "Add prospect",
    exact: true,
  });
  await dialog
    .getByLabel("Company name *", { exact: true })
    .fill("Synthetic Source Company");
  await dialog
    .getByRole("button", { name: "Create prospect", exact: true })
    .click();
  await dialog.getByRole("radio", { name: /Synthetic Source Company/ }).check();
  await dialog
    .getByRole("button", { name: "Create prospect", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Retry company confirmation",
      exact: true,
    }),
  ).toBeEnabled();
  expect(creates).toEqual([]);
  await dialog
    .getByRole("button", { name: "Retry company confirmation", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(creates).toHaveLength(1);
  expect(creates[0]).toMatchObject({
    canonicalEntityId,
    displayName: "Synthetic Source Company",
  });
  expect(confirmations[1]).toEqual(confirmations[0]);
  expect(unexpected).toEqual([]);
});
test("an imported LDA client confirms the sourced identity before binding it and starting research", async ({
  page,
}) => {
  const { confirmations, creates, state, unexpected } =
    await sourceFixtures(page);
  const bindings: Record<string, unknown>[] = [];
  const job = {
    id: "10000000-0000-4000-8000-000000000030",
    requestId: "synthetic-job",
    status: "completed",
    stale: false,
    terminal: true,
    counts: {
      total: 1,
      processed: 1,
      successful: 1,
      rejected: 0,
      outstanding: 0,
      created: 1,
      alreadyPresent: 0,
    },
    items: [
      {
        ldaClientId: 12,
        outcome: "created",
        code: null,
        clientId,
        clientName: "Synthetic Source Company",
        processedAt: "2026-01-01",
      },
    ],
  };
  await page.route("**/firm/registrant", (route) =>
    json(route, { ldaRegistrantId: 12, ldaRegistrantName: "Synthetic firm" }),
  );
  await page.route("**/firm/import-candidates", (route) =>
    json(route, {
      registrantId: 12,
      registrantName: "Synthetic firm",
      candidates: [],
    }),
  );
  await page.route("**/firm/import-jobs", (route) =>
    json(route, { jobs: [job], nextCursor: null }),
  );
  await page.route(`**/firm/import-jobs/${job.id}`, (route) =>
    json(route, job),
  );
  await page.route(
    `**/clients/${clientId}/profile-build/identity/confirm`,
    (route) => {
      bindings.push(route.request().postDataJSON());
      expect(confirmations).toHaveLength(2);
      return json(route, profile("client", clientId));
    },
  );
  const dialog = await openProfile(page);
  await dialog.getByRole("button", { name: /Search LDA/ }).click();
  await page
    .getByRole("button", { name: "View saved import queue", exact: true })
    .click();
  await page.getByText("Research and review", { exact: true }).click();
  const confirmation = page.getByRole("region", {
    name: "Company confirmation for Synthetic Source Company",
    exact: true,
  });
  await confirmation
    .getByRole("button", { name: "Check company match", exact: true })
    .click();
  await confirmation
    .getByRole("radio", { name: /Synthetic Source Company/ })
    .check();
  await confirmation
    .getByRole("button", { name: "Confirm company and research", exact: true })
    .click();
  await expect(
    confirmation.getByRole("button", {
      name: "Retry company confirmation",
      exact: true,
    }),
  ).toBeEnabled();
  expect(bindings).toEqual([]);
  expect(state.posts).toEqual([]);
  await confirmation
    .getByRole("button", { name: "Retry company confirmation", exact: true })
    .click();
  await expect
    .poll(() => state.posts.filter((entry) => entry.path === "runs").length)
    .toBe(1);
  expect(bindings).toHaveLength(1);
  expect(bindings[0]).toMatchObject({
    canonicalEntityId,
    expectedVersion: "a".repeat(64),
  });
  expect(confirmations[1]).toEqual(confirmations[0]);
  expect(creates).toEqual([]);
  expect(unexpected).toEqual([]);
});
