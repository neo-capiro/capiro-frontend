import { expect, test, type Page, type Route } from "@playwright/test";
import {
  bootstrap,
  client,
  clientId,
  navigate,
  nextTask,
  otherClient,
  otherClientId,
  setup,
} from "./next-modules-fixtures";
const projectId = "60000000-0000-4000-8000-000000000001";
const project = {
  id: projectId,
  name: "Current project",
  description: "",
  color: "#123456",
  privacy: "private",
  defaultView: "list",
  sections: [],
  fields: [],
  members: [],
  startOn: null,
  dueOn: null,
  health: "on_track",
  clientId,
  ownerId: "test-user",
  version: 1,
  archived: false,
  createdAt: "2026-10-08",
  updatedAt: "2026-10-08",
  access: "admin",
};
const tasks = [
  { ...nextTask, name: "Direct client work", clientId },
  {
    ...nextTask,
    id: "51000000-0000-4000-8000-000000000002",
    name: "Project client work",
    memberships: [{ projectId, sectionId: null, position: 0 }],
  },
  {
    ...nextTask,
    id: "51000000-0000-4000-8000-000000000003",
    name: "Other client work",
    clientId: otherClientId,
    access: "viewer",
  },
  {
    ...nextTask,
    id: "51000000-0000-4000-8000-000000000004",
    name: "Firm work",
  },
];
const fixtures = {
  "planner.bootstrap": { ...bootstrap, projects: [project] },
  "planner.tasks": { items: tasks, nextCursor: null },
};
async function choose(page: Page, name: string, option: string) {
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
test("MS08 regression: All tasks defaults to named client groups and current-page counts", async ({
  page,
}, info) => {
  await setup(page, fixtures);
  await page.goto("/modules/planner?view=all-tasks");
  const alpha = page.getByRole("region", {
    name: `${client.name} tasks`,
    exact: true,
  });
  await expect(alpha).toContainText("2 shown · 2 open");
  await expect(alpha).toContainText("Direct client work");
  await expect(alpha).toContainText("Project client work");
  await expect(
    alpha.getByRole("link", { name: "Open client" }),
  ).toHaveAttribute("href", `/portfolio/${clientId}`);
  await expect(
    page.getByRole("region", { name: "No client · firm work tasks" }),
  ).toContainText("Firm work");
  await expect(
    page.getByRole("button", { name: "Complete Other client work" }),
  ).toBeDisabled();
  expect(
    (await alpha.getByRole("cell").first().boundingBox())!.width,
  ).toBeGreaterThan(400);
  await page.screenshot({
    path: info.outputPath("planner-client-groups-desktop.png"),
    fullPage: true,
  });
  await choose(page, "Group by", "Group by · None");
  await expect(page.getByRole("table")).toHaveCount(1);
  await expect(
    page.getByRole("columnheader", { name: "Estimated" }),
  ).toBeVisible();
  await choose(page, "Group by", "Group by · Client");
  await choose(page, "Status", "Done");
  await expect(
    page.getByRole("heading", { name: "No tasks match this view" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  ).toHaveCount(0);
});
test("MS08 scope picker preserves All tasks, disposes drafts and restores scope through history", async ({
  page,
}) => {
  await setup(page, fixtures);
  await page.goto("/modules/planner?view=all-tasks");
  await page.getByRole("button", { name: "+ New task", exact: true }).click();
  await page.getByLabel("Task name", { exact: true }).fill("Former draft");
  await navigate(page, `/modules/planner?view=all-tasks&clientId=${clientId}`);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "All tasks", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Firm work", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Project client work", exact: true }),
  ).toBeVisible();
  await choose(page, "Planner client scope", otherClient.name);
  await expect(page).toHaveURL(
    `/modules/planner?view=all-tasks&clientId=${otherClientId}`,
  );
  await expect(
    page.getByRole("button", { name: "Other client work", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Direct client work", exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Project client work", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("button", { name: "Other client work", exact: true }),
  ).toBeVisible();
  await choose(page, "Planner client scope", "Scope · All clients");
  await expect(
    page.getByRole("button", { name: "Firm work", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ New task", exact: true }).click();
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue("");
});
test("MS08 failed current clients list removes former labels and disables picker until retry", async ({
  page,
}) => {
  let fail = false;
  await setup(page, fixtures);
  await page.route("**/api/capiro/clients.list*", (route) =>
    fail
      ? route.fulfill({ status: 403, json: { message: "Current list denied" } })
      : route.fallback(),
  );
  await page.goto("/modules/planner?view=all-tasks");
  await expect(
    page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  ).toBeVisible();
  fail = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Planner client scope" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open client" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Direct client work", exact: true }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry client scopes" }).click();
  await expect(
    page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  ).toBeVisible();
});
test("MS08 failed current task page hides groups and recovers without inventing filters", async ({
  page,
}) => {
  let failed = false;
  const inputs: Record<string, unknown>[] = [];
  await setup(page, fixtures);
  await page.route("**/api/capiro/planner.tasks*", (route) => {
    inputs.push(
      JSON.parse(new URL(route.request().url()).searchParams.get("input")!)
        .query,
    );
    return failed
      ? route.fulfill({
          status: 503,
          json: { message: "Task page unavailable" },
        })
      : route.fallback();
  });
  await page.goto(`/modules/planner?view=all-tasks&clientId=${clientId}`);
  await expect(
    page.getByRole("button", { name: "Direct client work", exact: true }),
  ).toBeVisible();
  failed = true;
  await page.getByRole("searchbox", { name: "Search tasks" }).fill("failed");
  await expect(page.getByRole("alert")).toContainText("Task page unavailable");
  await expect(page.getByRole("table")).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Direct client work", exact: true }),
  ).toBeVisible();
  expect(inputs.every((input) => !("clientId" in input))).toBe(true);
});
for (const unavailable of [false, true])
  test(`MS08 independently verified client remains named when picker is ${unavailable ? "unavailable" : "empty"}`, async ({
    page,
  }) => {
    await setup(page, fixtures);
    await page.route("**/api/capiro/clients.list*", (route) =>
      route.fulfill(
        unavailable
          ? { status: 503, json: { message: "Picker unavailable" } }
          : { json: [] },
      ),
    );
    await page.goto(`/modules/planner?view=all-tasks&clientId=${clientId}`);
    await expect(
      page.getByRole("combobox", { name: "Planner client scope" }),
    ).toContainText(client.name);
    await expect(
      page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
    ).toContainText("Project client work");
    await expect(
      page.getByRole("link", { name: "Open client" }),
    ).toHaveAttribute("href", `/portfolio/${clientId}`);
  });
test("MS08 replacement rejects held former task read and unverified selected client", async ({
  page,
}) => {
  let held: Route | undefined,
    fresh = false;
  await setup(page, fixtures);
  await page.route("**/api/capiro/planner.tasks*", (route) => {
    if (!fresh) {
      held = route;
      return;
    }
    return route.fulfill({ json: { items: [tasks[3]], nextCursor: null } });
  });
  await page.goto("/modules/planner?view=all-tasks");
  await expect.poll(() => Boolean(held)).toBe(true);
  fresh = true;
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "other-org", sessionId: "other-session" },
      }),
    ),
  );
  await expect(
    page.getByRole("button", { name: "Firm work", exact: true }),
  ).toBeVisible();
  await held!
    .fulfill({ json: { items: tasks, nextCursor: null } })
    .catch(() => {});
  await expect(
    page.getByRole("button", { name: "Direct client work", exact: true }),
  ).toHaveCount(0);
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    route.fulfill({ json: otherClient }),
  );
  await choose(page, "Planner client scope", client.name);
  await expect(
    page.getByRole("heading", { name: "Selected client unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
test("MS08 scope and grouping controls remain keyboard operable at phone width", async ({
  page,
}, info) => {
  await setup(page, fixtures);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/modules/planner?view=all-tasks");
  const scope = page.getByRole("combobox", { name: "Planner client scope" });
  await expect(scope).toBeEnabled();
  await scope.focus();
  await expect(scope).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("combobox", {
      name: "Planner client scope",
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Scope · All clients", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: client.name, exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(scope).toContainText(client.name);
  await expect(
    page.getByRole("button", { name: "Direct client work", exact: true }),
  ).toBeVisible();
  const grouping = page.getByRole("combobox", {
    name: "Group by",
    exact: true,
  });
  await grouping.focus();
  await expect(grouping).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("combobox", {
      name: "Group by",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Group by · Client", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Group by · None", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(grouping).toContainText("None");
  await expect(page.getByRole("table")).toHaveCount(1);
  await choose(page, "Group by", "Group by · Client");
  await page.screenshot({
    path: info.outputPath("planner-client-groups-phone.png"),
    fullPage: true,
  });
});
test("MS07 regression: Workspace filters share a compact desktop row and wrap on phones", async ({
  page,
}, info) => {
  const row = {
    id: projectId,
    kind: "draft",
    name: "Current policy newsletter",
    blueprint: "Newsletter",
    client: client.name,
    status: "draft",
    updatedAt: "2026-10-08",
    owner: { id: "test-user", name: "Test User", initials: "TU" },
    route: "/modules/workspace",
  };
  await setup(page, {
    "workspace.documents": { items: [row], nextCursor: null },
  });
  await page.goto("/modules/workspace");
  const search = page.getByLabel("Search documents");
  await expect(page.getByRole("table")).toContainText(row.name);
  const boxes = await Promise.all(
    [
      search,
      ...(await page
        .getByRole("combobox", { name: /Filter documents by/ })
        .all()),
    ].map((locator) => locator.boundingBox()),
  );
  expect(
    Math.max(...boxes.map((box) => box!.y)) -
      Math.min(...boxes.map((box) => box!.y)),
  ).toBeLessThan(8);
  expect(boxes.slice(1).every((box) => box!.width <= 190)).toBe(true);
  await choose(page, "Filter documents by client", client.name);
  await expect(page.getByRole("table")).toContainText(row.name);
  await search.fill("no matching record");
  await expect(page.getByRole("table")).not.toContainText(row.name);
  await search.clear();
  await page.screenshot({
    path: info.outputPath("workspace-filters-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const trigger of await page
    .getByRole("combobox", { name: /Filter documents by/ })
    .all()) {
    const box = await trigger.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({
    path: info.outputPath("workspace-filters-phone.png"),
    fullPage: true,
  });
});
const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64),
  question = "30000000-0000-4000-8000-000000000001";
const form = {
  name: "Request a briefing",
  description: "Ask the team to prepare a staff briefing.",
  fields: [
    {
      id: question,
      label: "What needs to be done?",
      type: "text",
      required: true,
      options: [],
      maxLength: 500,
    },
  ],
};
test("MS09 regression: public form uses bounded card hierarchy and keeps input on styled error", async ({
  page,
}, info) => {
  let fail = true,
    writes = 0;
  await setup(page, {
    "public-form.read": form,
    "public-form.submit": () => {
      writes++;
      return { received: true };
    },
  });
  await page.route("**/api/capiro/public-form.submit", (route) =>
    fail
      ? route.fulfill({
          status: 422,
          json: { message: "Please revise this request." },
        })
      : route.fallback(),
  );
  await page.goto(`/forms/${token}`);
  const title = page.getByRole("heading", { name: form.name, exact: true });
  await expect(title).toHaveCSS("font-size", "40px");
  const submit = page.getByRole("button", {
    name: "Submit request",
    exact: true,
  });
  expect((await submit.boundingBox())!.width).toBeLessThan(200);
  await page.getByLabel("What needs to be done?").fill("Keep this draft");
  await submit.click();
  await expect(page.getByRole("alert")).toHaveCSS(
    "background-color",
    "rgb(243, 231, 229)",
  );
  await expect(page.getByLabel("What needs to be done?")).toHaveValue(
    "Keep this draft",
  );
  expect((await page.getByRole("alert").boundingBox())!.y).toBeLessThan(
    (await submit.boundingBox())!.y,
  );
  await page.screenshot({
    path: info.outputPath("public-form-error-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: info.outputPath("public-form-error-phone.png"),
    fullPage: true,
  });
  fail = false;
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Your request was received." }),
  ).toBeVisible();
  expect(writes).toBe(1);
});
test("MS09 preserves malformed-receipt and replaced-token controls", async ({
  page,
}) => {
  let held: Route | undefined,
    writes = 0;
  const nextToken = token.replace(/a/g, "b");
  await setup(page, {
    "public-form.read": (input) => ({
      ...form,
      name:
        (input as { params: { token: string } }).params.token === token
          ? form.name
          : "Replacement request",
    }),
  });
  await page.route("**/api/capiro/public-form.submit", (route) => {
    writes++;
    if (writes === 1) return route.fulfill({ json: { received: false } });
    held = route;
  });
  await page.goto(`/forms/${token}`);
  await page
    .getByLabel("What needs to be done?")
    .fill("Preserve until verified");
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("What needs to be done?")).toHaveValue(
    "Preserve until verified",
  );
  await expect(
    page.getByRole("heading", { name: "Your request was received." }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect.poll(() => Boolean(held)).toBe(true);
  await navigate(page, `/forms/${nextToken}`);
  await expect(
    page.getByRole("heading", { name: "Replacement request" }),
  ).toBeVisible();
  await held!.fulfill({ json: { received: true } }).catch(() => {});
  await expect(page.getByLabel("What needs to be done?")).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Your request was received." }),
  ).toHaveCount(0);
  expect(writes).toBe(2);
});
