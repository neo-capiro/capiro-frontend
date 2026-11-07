import { expect, type Page } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import { installEnrichment } from "./client-enrichment-fixtures";

export const membershipChanged = "Current membership changed; reload";
const actor = {
  user: {
    id: "20000000-0000-4000-8000-000000000020",
    email: "test@example.test",
  },
  tenant: {
    id: "30000000-0000-4000-8000-000000000020",
    name: "Synthetic test workspace",
  },
  role: "user_admin",
};
const candidate = {
  source: "sam",
  externalId: "ABC123DEF456",
  name: "Synthetic Recovery Company",
};

export async function installCreationRecovery(page: Page) {
  const fixture = await installEnrichment(page);
  fixture.state.run = null;
  const state = {
    created: false,
    creates: [] as unknown[],
    confirmations: [] as unknown[],
    identityReadsAfterCreate: 0,
    rosterReadsAfterCreate: 0,
    layoutOrders: [] as string[][],
    identityConflicts: 0,
    rosterConflicts: 0,
    identityStatus: 200,
    role: actor.role,
    userId: actor.user.id,
    createStatus: 200,
    identityGate: undefined as Promise<void> | undefined,
  };
  await page.route("**/api/backend/core/me", async (route) => {
    if (state.created) {
      state.identityReadsAfterCreate++;
      if (state.identityConflicts-- > 0)
        return json(route, { message: membershipChanged }, 409);
      if (state.identityGate) await state.identityGate;
      if (state.identityStatus !== 200)
        return json(
          route,
          { message: "Synthetic session refusal" },
          state.identityStatus,
        );
    }
    return json(route, {
      ...actor,
      user: { ...actor.user, id: state.userId },
      role: state.role,
    });
  });
  await page.route("**/api/backend/core/clients", (route) => {
    if (route.request().method() === "POST") {
      state.creates.push(route.request().postDataJSON());
      state.created = true;
      if (state.createStatus !== 200)
        return json(
          route,
          { message: "Synthetic lost creation response" },
          state.createStatus,
        );
      return json(route, { ...client, name: candidate.name });
    }
    if (state.created) {
      state.rosterReadsAfterCreate++;
      if (state.rosterConflicts-- > 0)
        return json(route, { message: membershipChanged }, 409);
    }
    return json(
      route,
      state.created ? [{ ...client, name: candidate.name }] : [],
    );
  });
  await page.route("**/api/backend/core/me/portfolio-layout", (route) => {
    const order = state.created ? [`client:${clientId}`] : [];
    state.layoutOrders.push(order);
    return json(route, {
      contractVersion: 1,
      tenantId: actor.tenant.id,
      userId: state.userId,
      version: 0,
      updatedAt: null,
      order,
    });
  });
  await page.route("**/clients/profile-build/identity-preview", (route) =>
    json(route, {
      status: "ambiguous",
      entity: null,
      duplicate: null,
      sourceGaps: [],
      candidates: [
        {
          entity: { id: null, canonicalName: candidate.name },
          sourceCandidate: candidate,
          claims: [],
          reasons: ["Exact synthetic source match"],
        },
      ],
    }),
  );
  await page.route("**/clients/profile-build/identity-confirm", (route) => {
    const body = route.request().postDataJSON();
    state.confirmations.push(body);
    return json(route, {
      requestId: body.requestId,
      canonicalEntityId: "10000000-0000-4000-8000-000000000020",
      sourceCandidate: body.sourceCandidate,
    });
  });
  return { ...fixture, creation: state };
}

export async function buildSyntheticProfile(page: Page) {
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  await dialog.getByLabel("Company name", { exact: true }).fill(candidate.name);
  await dialog.getByLabel(/Website/).fill("https://example.test");
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog
    .getByRole("radio", { name: /Synthetic Recovery Company/ })
    .check();
  await dialog
    .getByRole("button", { name: "Build profile", exact: true })
    .click();
  return dialog;
}

export async function expectOneResearchStart(
  fixture: Awaited<ReturnType<typeof installCreationRecovery>>,
) {
  await expect
    .poll(
      () => fixture.state.posts.filter((post) => post.path === "runs").length,
    )
    .toBe(1);
  expect(fixture.creation.creates).toHaveLength(1);
  expect(fixture.creation.confirmations).toHaveLength(1);
  expect(
    fixture.state.posts.find((post) => post.path === "runs")?.body,
  ).toMatchObject({
    requestId: expect.any(String),
    sources: ["public_web", "sam_gov", "lda"],
    website: "https://example.test/",
    attachmentIds: [],
  });
  expect(fixture.unexpected).toEqual([]);
}
