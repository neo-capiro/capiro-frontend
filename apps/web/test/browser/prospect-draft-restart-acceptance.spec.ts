import { prospectStateFixture } from "../../tests/prospect-atomic-fixture";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { draft, prospectId } from "../../tests/prospect-resources-fixtures";
test("lost prospect draft creation retains its original request through reload rather than creating a duplicate draft", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  const records = new Map<string, typeof draft>(),
    posts: unknown[] = [];
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": () => ({
      drafts: [...records.values()].map((record) => ({
        ...record,
        versions: [],
      })),
    }),
    "workspace.draft": (input: unknown) =>
      [...records.values()].find(
        (record) =>
          record.id === (input as { params: { id: string } }).params.id,
      ),
    "workspace.draft.versions": [],
    "workspace.prospect.state": (input: unknown) =>
      prospectStateFixture(
        [...records.values()].find(
          (record) =>
            record.id === (input as { params: { id: string } }).params.id,
        )!,
      ),
  });
  await page.route("**/api/capiro/workspace.prospect.create", async (route) => {
    const { body } = route.request().postDataJSON();
    posts.push(body);
    if (!records.has(body.requestId)) {
      const id = randomUUID();
      records.set(body.requestId, {
        ...structuredClone(draft),
        id,
        docTitle: body.docTitle,
        documents: [{ ...draft.documents[0]!, id: randomUUID(), draftId: id }],
      });
    }
    if (posts.length === 1)
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic response lost AFTER draft commit" },
      });
    return route.fulfill({ json: records.get(body.requestId) });
  });
  await page.goto(`/modules/workspace?prospectId=${prospectId}`);
  await page
    .getByLabel("New prospect document title")
    .fill("Independent uncertain prospect draft");
  await page
    .getByRole("button", { name: "Create manual draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original draft", exact: true }),
  ).toBeEnabled();
  expect(records.size).toBe(1);
  await page.reload();
  await expect(page.getByLabel("New prospect document title")).toHaveValue(
    "Independent uncertain prospect draft",
  );
  await expect(
    page.getByRole("button", { name: "Recover original draft", exact: true }),
  ).toBeEnabled();
  expect(posts).toHaveLength(1);
  await page
    .getByRole("button", { name: "Recover original draft", exact: true })
    .click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Independent uncertain prospect draft",
  );
  expect(posts).toHaveLength(2);
  expect(posts[0]).toEqual(posts[1]);
  expect(
    records.size,
    "a replacement key cannot recover an uncertain original draft",
  ).toBe(1);
});
