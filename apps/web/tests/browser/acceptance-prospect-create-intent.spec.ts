import { expect, test, type Page } from "@playwright/test";
import { installFixtures, json, prospectId } from "./fixtures";
import type { ProspectContact } from "../../src/features/portfolio/prospects/contacts/contracts";
import { prospectDetail } from "./acceptance-prospect-fixtures";

const contactPath = `**/business-development/prospects/${prospectId}/contacts`;
const originalName = "Synthetic exact creation intent";
const originalTitle = "Original submitted title";

async function creationScenario(
  page: Page,
  baseURL: string | undefined,
  status: 403 | 503,
) {
  if (!baseURL) throw new Error("The isolated fixture baseURL is required.");
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installFixtures(page);
  const contacts: ProspectContact[] = [];
  const bodies: Record<string, unknown>[] = [];
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(contactPath, async (route) => {
    if (route.request().method() === "GET")
      return json(route, {
        prospectId,
        readOnly: false,
        contacts,
        nextCursor: null,
      });
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON();
    bodies.push(body);
    if (bodies.length === 1)
      return json(
        route,
        { message: "Synthetic creation receipt unavailable" },
        status,
      );
    // The unknown branch returns the originally submitted contact: it does not
    // pretend a lost first receipt proves a changed request was accepted.
    const saved = status === 503 ? bodies[0]! : body;
    const contact: ProspectContact = {
      id: "80000000-0000-4000-8000-000000000093",
      prospectId,
      requestId: saved.requestId as string,
      name: saved.name as string,
      title: saved.title as string | null,
      email: saved.email as string | null,
      phone: saved.phone as string | null,
      notes: saved.notes as string | null,
      version: 1,
      createdAt: "2026-10-13T12:00:00Z",
      updatedAt: "2026-10-13T12:00:00Z",
    };
    contacts.push(contact);
    return json(route, contact);
  });
  await page.goto(prospectDetail);
  const card = page.locator('section[aria-label="Prospect contacts"]');
  await card.getByRole("button", { name: "+ Add", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Add prospect contact",
    exact: true,
  });
  await editor.getByLabel("Name *", { exact: true }).fill(originalName);
  await editor.getByLabel("Title", { exact: true }).fill(originalTitle);
  await editor
    .getByLabel("Notes", { exact: true })
    .fill("Synthetic submitted source note");
  await editor
    .getByRole("button", { name: "Save contact", exact: true })
    .click();
  await expect.poll(() => bodies.length).toBe(1);
  await expect(editor.getByRole("alert")).toContainText(
    status === 503
      ? "Synthetic creation receipt unavailable"
      : "You do not have permission",
  );
  expect(bodies[0]).toMatchObject({
    name: originalName,
    title: originalTitle,
    notes: "Synthetic submitted source note",
    email: null,
    phone: null,
    requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
  return {
    card,
    editor,
    bodies,
    assertOnlyTwoExplicitCreates() {
      expect(writes).toEqual(
        Array(2).fill(
          `POST /api/backend/core/business-development/prospects/${prospectId}/contacts`,
        ),
      );
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
    },
  };
}

test("unknown prospect creation cannot bind edited input to the original request identity", async ({
  page,
  baseURL,
}) => {
  const control = await creationScenario(page, baseURL, 503);
  const name = control.editor.getByLabel("Name *", { exact: true });
  await expect(name).toHaveValue(originalName);
  // Ordinary keyboard input changes an editable field; a frozen submitted
  // field ignores focus/input. Both freezing and an exact captured retry are
  // valid, but the next explicit POST must retain the original entire intent.
  await name.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText("Changed after an unknown creation");
  expect(control.bodies).toHaveLength(1);
  await control.editor
    .getByRole("button", { name: "Retry original save", exact: true })
    .click();
  await expect(control.editor).toHaveCount(0);
  expect(control.bodies).toHaveLength(2);
  expect(control.bodies[1]!.requestId).toBe(control.bodies[0]!.requestId);
  expect(control.bodies[1]).toEqual(control.bodies[0]);
  await expect(
    control.card.getByRole("button", { name: new RegExp(originalName) }),
  ).toBeVisible();
  control.assertOnlyTwoExplicitCreates();
});

test("unknown contact creation survives close and reload with its original request", async ({
  page,
  baseURL,
}) => {
  const control = await creationScenario(page, baseURL, 503);
  await control.editor
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(control.editor).toHaveCount(0);
  await page.reload();
  await control.card
    .getByRole("button", { name: "+ Add", exact: true })
    .click();
  await expect(
    control.editor.getByLabel("Name *", { exact: true }),
  ).toHaveValue(originalName);
  await expect(
    control.editor.getByLabel("Name *", { exact: true }),
  ).toBeDisabled();
  expect(control.bodies).toHaveLength(1);
  await control.editor
    .getByRole("button", { name: "Retry original save", exact: true })
    .click();
  await expect(control.editor).toHaveCount(0);
  expect(control.bodies).toHaveLength(2);
  expect(control.bodies[1]).toEqual(control.bodies[0]);
  control.assertOnlyTwoExplicitCreates();
});

test("definite prospect creation refusal permits correction and an explicit editable retry", async ({
  page,
  baseURL,
}) => {
  const control = await creationScenario(page, baseURL, 403);
  const name = control.editor.getByLabel("Name *", { exact: true });
  const title = control.editor.getByLabel("Title", { exact: true });
  await expect(name).toBeEnabled();
  await expect(title).toBeEnabled();
  await name.fill("Corrected after definite refusal");
  await title.fill("Corrected explicit title");
  expect(control.bodies).toHaveLength(1);
  await control.editor
    .getByRole("button", { name: "Save contact", exact: true })
    .click();
  await expect(control.editor).toHaveCount(0);
  expect(control.bodies).toHaveLength(2);
  expect(control.bodies[1]).toMatchObject({
    name: "Corrected after definite refusal",
    title: "Corrected explicit title",
    notes: "Synthetic submitted source note",
    email: null,
    phone: null,
  });
  await expect(
    control.card.getByRole("button", {
      name: /Corrected after definite refusal/,
    }),
  ).toBeVisible();
  control.assertOnlyTwoExplicitCreates();
});
