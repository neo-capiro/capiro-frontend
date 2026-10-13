import { test, expect, type Page } from "@playwright/test";
import { json, prospectId } from "./fixtures";
import type { ProspectContact } from "../../src/features/portfolio/prospects/contacts/contracts";
import {
  installProspectRead,
  prepareProspectRead,
  prospectDetail,
} from "./acceptance-prospect-fixtures";
import {
  briefBase,
  briefTitle,
  briefVersion,
  openSavedBrief,
  savedBrief,
} from "./acceptance-prospect-brief-fixtures";

function holdResponse() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release: () => release() };
}

function recordEffects(page: Page) {
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { writes, errors };
}

test("pending contact creation survives denied current read and retains the same request after an unknown reply", async ({
  page,
  baseURL,
}) => {
  const session = await prepareProspectRead(page, baseURL);
  const effects = recordEffects(page);
  const contacts: ProspectContact[] = [];
  const current = { prospectId, readOnly: false, contacts, nextCursor: null };
  const path = `**/business-development/prospects/${prospectId}/contacts`;
  const read = await installProspectRead(page, path, current);
  const first = holdResponse();
  const bodies: Record<string, unknown>[] = [];
  await page.route(path, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON();
    bodies.push(body);
    if (bodies.length === 1) {
      await first.pending;
      return json(route, { message: "Synthetic contact outcome unknown" }, 503);
    }
    expect(body).toEqual(bodies[0]);
    const contact: ProspectContact = {
      id: "80000000-0000-4000-8000-000000000092",
      prospectId,
      requestId: body.requestId,
      name: "Synthetic retained contact",
      title: "Retained contact title",
      email: null,
      phone: null,
      notes: null,
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
  await editor
    .getByLabel("Name *", { exact: true })
    .fill("Synthetic retained contact");
  await editor
    .getByLabel("Title", { exact: true })
    .fill("Retained contact title");
  await editor
    .getByRole("button", { name: "Save contact", exact: true })
    .click();
  await expect.poll(() => bodies.length).toBe(1);
  read.fail(403);
  await session.reread();
  await expect(card.locator('[role="alert"]')).toContainText(
    "You do not have permission",
  );
  await expect(editor).toHaveCount(0);
  first.release();
  await expect(card.getByRole("status")).toContainText(
    "contact change is retained",
  );
  const release = read.holdRecovery(current);
  const before = read.reads();
  await card.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(read.reads).toBeGreaterThan(before);
  await expect(editor).toHaveCount(0);
  expect(bodies).toHaveLength(1);
  release();
  await expect(editor.getByLabel("Name *", { exact: true })).toHaveValue(
    "Synthetic retained contact",
  );
  await expect(editor.getByLabel("Title", { exact: true })).toHaveValue(
    "Retained contact title",
  );
  await expect(editor.getByRole("alert")).toContainText(
    "Synthetic contact outcome unknown",
  );
  expect(bodies).toHaveLength(1);
  await editor
    .getByRole("button", { name: "Save contact", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await expect(
    card.getByRole("button", { name: /Synthetic retained contact/ }),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(effects.writes).toEqual(
    Array(2).fill(
      `POST /api/backend/core/business-development/prospects/${prospectId}/contacts`,
    ),
  );
  expect(effects.errors).toEqual([]);
});

test("pending brief save survives selected-version denial and retries only its retained unknown SaveInput", async ({
  page,
  baseURL,
}) => {
  const session = await prepareProspectRead(page, baseURL);
  const effects = recordEffects(page);
  const immutable = briefVersion(2);
  const versions = [immutable];
  let current = savedBrief(immutable);
  await page.route(briefBase, (route) => json(route, current));
  await page.route(`${briefBase}/versions`, (route) =>
    json(route, {
      brief: current.brief,
      versions,
    }),
  );
  const read = await installProspectRead(
    page,
    `${briefBase}/versions/2`,
    immutable,
  );
  const first = holdResponse();
  const bodies: Record<string, unknown>[] = [];
  await page.route(`${briefBase}/versions`, async (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    const body = route.request().postDataJSON();
    bodies.push(body);
    if (bodies.length === 1) {
      await first.pending;
      return json(route, { message: "Synthetic brief outcome unknown" }, 503);
    }
    expect(body).toEqual(bodies[0]);
    const revised = { ...briefVersion(3), sections: body.sections };
    versions.push(revised);
    current = savedBrief(revised);
    return json(route, {
      brief: current.brief,
      version: revised,
      created: true,
    });
  });
  const viewer = await openSavedBrief(page);
  await viewer
    .getByRole("button", { name: "Version history", exact: true })
    .click();
  await viewer.getByRole("button", { name: /^Version 2 ·/ }).click();
  await viewer
    .getByRole("button", { name: "Edit sections", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit saved prospect brief",
    exact: true,
  });
  await editor
    .getByLabel("Company and firm implication", { exact: true })
    .fill("Retained edited brief text");
  await editor
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await expect.poll(() => bodies.length).toBe(1);
  read.fail(403);
  await session.reread();
  await expect(
    page
      .getByRole("dialog", { name: briefTitle, exact: true })
      .getByRole("alert"),
  ).toContainText("You do not have permission");
  await expect(editor).toHaveCount(0);
  first.release();
  await expect(viewer.getByRole("status")).toContainText(
    "brief save is retained",
  );
  const release = read.holdRecovery(immutable);
  const before = read.reads();
  await viewer.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(read.reads).toBeGreaterThan(before);
  await expect(editor).toHaveCount(0);
  expect(bodies).toHaveLength(1);
  release();
  await expect(
    editor.getByLabel("Company and firm implication", { exact: true }),
  ).toHaveValue("Retained edited brief text");
  await expect(
    editor.getByLabel("Company and firm implication", { exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Retry same save", exact: true }),
  ).toBeVisible();
  expect(bodies).toHaveLength(1);
  await editor
    .getByRole("button", { name: "Retry same save", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await viewer
    .getByRole("button", { name: "Return to current version", exact: true })
    .click();
  await expect(
    viewer.getByRole("article", { name: "Saved brief version 3", exact: true }),
  ).toContainText("Retained edited brief text");
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(effects.writes).toEqual(
    Array(2).fill(
      `PUT /api/backend/core/business-development/prospects/${prospectId}/brief/versions`,
    ),
  );
  expect(effects.errors).toEqual([]);
});
