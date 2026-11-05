import { test, expect, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import { finishManualIdentity } from "./profile-intake-helpers";
async function openManual(page: Page) {
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  await dialog.getByRole("button", { name: /Manual entry/ }).click();
  await dialog
    .getByLabel("Legal name *", { exact: true })
    .fill("Synthetic engineering company");
  await dialog
    .getByLabel("Company description", { exact: true })
    .fill("Synthetic engineering services for defense systems.");
  await dialog
    .getByRole("button", { name: "2. Registration", exact: true })
    .click();
  return dialog;
}
test("manual code suggestions require a click, sourced review and individual acceptance before saving person evidence", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const suggestionRequests: Record<string, unknown>[] = [];
  const creates: Record<string, unknown>[] = [];
  const profiles: Record<string, unknown>[] = [];
  await page.route(
    "**/api/backend/core/clients/profile-build/registration-suggestions",
    (route) => {
      const body = route.request().postDataJSON();
      suggestionRequests.push(body);
      const code = body.field === "issueCodes" ? "DEF" : "541330";
      return json(route, {
        requestId: body.requestId,
        field: body.field,
        status: "complete",
        message: "Review this sourced suggestion before adding it.",
        suggestions: [
          {
            code,
            label: code === "DEF" ? "Defense" : "Engineering Services",
            reason: "The company describes relevant engineering services.",
            confidence: 0.85,
            evidence: [
              {
                label: "Person-provided company context",
                excerpt: "Synthetic engineering services for defense systems.",
                source: "person_context",
                observedAt: "2026-01-01T00:00:00Z",
              },
            ],
          },
        ],
        sourceGaps: [],
      });
    },
  );
  await page.route("**/api/backend/core/clients", (route) => {
    if (route.request().method() !== "POST") return json(route, [client]);
    const body = route.request().postDataJSON();
    creates.push(body);
    return json(route, { ...client, ...body });
  });
  await page.route(
    `**/api/backend/core/clients/${clientId}/profile-build/profile`,
    (route) => {
      if (route.request().method() === "PUT")
        profiles.push(route.request().postDataJSON());
      return route.fallback();
    },
  );
  const dialog = await openManual(page);
  for (const label of ["UEI", "CAGE code", "NAICS codes", "PSC codes"])
    await expect(
      dialog
        .getByRole("group", { name: `${label} suggestions`, exact: true })
        .getByRole("button", { name: "Ask Meri to suggest", exact: true }),
    ).toBeEnabled();
  expect(suggestionRequests).toEqual([]);
  const naics = dialog.getByRole("group", {
    name: "NAICS codes suggestions",
    exact: true,
  });
  await naics
    .getByRole("button", { name: "Ask Meri to suggest", exact: true })
    .click();
  await expect(
    naics.getByRole("button", { name: "Accept 541330", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Remove 541330", exact: true }),
  ).toHaveCount(0);
  expect(creates).toEqual([]);
  await naics.getByText("Sources · 1", { exact: true }).click();
  await expect(naics).toContainText("Person-provided company context");
  await expect(naics).toContainText(
    "Synthetic engineering services for defense systems.",
  );
  await naics
    .getByRole("button", { name: "Accept 541330", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Remove 541330", exact: true }),
  ).toBeVisible();
  expect(creates).toEqual([]);
  await dialog.screenshot({
    path: "test-results/registration-suggestions-review.png",
  });
  await dialog
    .getByRole("button", { name: "6. Advocacy profile", exact: true })
    .click();
  const issues = dialog.getByRole("group", {
    name: "LDA issue codes suggestions",
    exact: true,
  });
  await issues
    .getByRole("button", { name: "Ask Meri to suggest", exact: true })
    .click();
  await issues.getByRole("button", { name: "Accept DEF", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await finishManualIdentity(dialog);
  await expect(dialog).not.toBeVisible();
  expect(creates).toHaveLength(1);
  expect(creates[0]).not.toHaveProperty("fieldEvidence");
  expect(profiles[0]).toMatchObject({
    fields: { naicsCodes: ["541330"], issueCodes: ["DEF"] },
    fieldEvidence: {
      naicsCodes: [
        { code: "541330", evidence: [{ source: "person_context" }] },
      ],
      issueCodes: [{ code: "DEF", evidence: [{ source: "person_context" }] }],
    },
  });
  expect(suggestionRequests.map((row) => row.field)).toEqual([
    "naicsCodes",
    "issueCodes",
  ]);
  expect(suggestionRequests[0]).not.toHaveProperty("subject");
  expect(unexpected).toEqual([]);
});
test("source-unavailable suggestions leave entered identifiers untouched", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route(
    "**/api/backend/core/clients/profile-build/registration-suggestions",
    (route) => {
      const body = route.request().postDataJSON();
      return json(route, {
        requestId: body.requestId,
        field: body.field,
        status: "unavailable",
        message: "No matching sourced identifier was available.",
        suggestions: [],
        sourceGaps: ["An exact official record could not be verified."],
      });
    },
  );
  const dialog = await openManual(page);
  await dialog.getByLabel("CAGE Code", { exact: true }).fill("1AB2C");
  const suggestions = dialog.getByRole("group", {
    name: "CAGE code suggestions",
    exact: true,
  });
  await suggestions
    .getByRole("button", { name: "Ask Meri to suggest", exact: true })
    .click();
  await expect(suggestions).toContainText(
    "No matching sourced identifier was available.",
  );
  await expect(suggestions).toContainText(
    "An exact official record could not be verified.",
  );
  await expect(
    suggestions.getByRole("button", { name: /Accept|Replace current/ }),
  ).toHaveCount(0);
  await expect(dialog.getByLabel("CAGE Code", { exact: true })).toHaveValue(
    "1AB2C",
  );
  expect(unexpected).toEqual([]);
});
