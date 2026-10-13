import { test } from "./runtime-observed-test";
import { expect, type Route } from "@playwright/test";
import {
  bootstrap,
  clientId,
  navigate,
  nextTask,
  otherClientId,
  otherTaskId,
  setup,
  taskId,
} from "./next-modules-fixtures";

for (const receipt of ["wrong-task", "wrong-client"] as const)
  test(`linked task rejects ${receipt} receipt without detail actions`, async ({
    page,
  }) => {
    let events = 0;
    await setup(page, {
      "planner.task": {
        ...nextTask,
        id: receipt === "wrong-task" ? otherTaskId : taskId,
        clientId: receipt === "wrong-client" ? otherClientId : clientId,
      },
      "planner.task.events": () => {
        events++;
        return [];
      },
    });
    await page.goto(`/modules/planner?clientId=${clientId}&task=${taskId}`);
    await expect(page.getByRole("alert")).toContainText(
      "This task is unavailable in the selected scope.",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit task", exact: true }),
    ).toHaveCount(0);
    expect(events).toBe(0);
  });

test("invalid task link makes no detail request and can be dismissed without losing scope", async ({
  page,
}) => {
  let reads = 0;
  await setup(page, {
    "planner.task": () => {
      reads++;
      return nextTask;
    },
  });
  await page.goto(`/modules/planner?clientId=${clientId}&task=invalid`);
  await expect(page.getByRole("alert")).toContainText(
    "This task link is invalid.",
  );
  expect(reads).toBe(0);
  await page
    .getByRole("button", { name: "Dismiss task link", exact: true })
    .click();
  await expect(page).toHaveURL(`/modules/planner?clientId=${clientId}`);
});

for (const status of [403, 503])
  test(`task link hides prior editor after current ${status}, then recovers only after successful retry`, async ({
    page,
  }) => {
    let failure = 0;
    let held: Route | undefined;
    let hold = false;
    await setup(page);
    await page.route("**/api/capiro/planner.task?*", (route) => {
      if (hold) {
        held = route;
        return;
      }
      return route.fulfill(
        failure
          ? { status: failure, json: { message: `Current detail ${failure}` } }
          : { json: nextTask },
      );
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    await page
      .getByLabel("Task name", { exact: true })
      .fill("Unsaved former draft");
    failure = status;
    // The same real route is revisited through history, forcing a current receipt.
    await navigate(page, "/modules/planner");
    await page.goBack();
    await expect(page.getByRole("alert")).toContainText(
      `Current detail ${status}`,
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Unsaved former draft")).toHaveCount(0);
    failure = 0;
    hold = true;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await held!.fulfill({ json: nextTask });
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
      nextTask.name,
    );
  });

test("linked task follows back-forward and discards a held replaced task", async ({
  page,
}) => {
  let held: Route | undefined;
  await setup(page);
  await page.route("**/api/capiro/planner.task?*", (route) => {
    const id = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    ).params.id;
    if (id === taskId && !held) {
      held = route;
      return;
    }
    return route.fulfill({
      json: {
        ...nextTask,
        id,
        name: id === taskId ? nextTask.name : "Other current task",
      },
    });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  await expect.poll(() => Boolean(held)).toBe(true);
  await navigate(page, `/modules/planner?task=${otherTaskId}`);
  await expect(
    page.getByRole("dialog", { name: "Other current task", exact: true }),
  ).toBeVisible();
  await held!.fulfill({ json: nextTask }).catch(() => {});
  await expect(
    page.getByRole("dialog", { name: nextTask.name, exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: nextTask.name, exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("dialog", { name: "Other current task", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/modules/planner");
});

for (const replacement of ["client", "tenant"] as const)
  test(`linked task ${replacement} replacement rejects the former read and editor`, async ({
    page,
  }) => {
    let count = 0;
    let held: Route | undefined;
    await setup(page);
    await page.route("**/api/capiro/planner.task?*", (route) => {
      count++;
      if (count === 1) {
        held = route;
        return;
      }
      return route.fulfill({
        status: 403,
        json: { message: "Replacement access denied" },
      });
    });
    await page.goto(`/modules/planner?clientId=${clientId}&task=${taskId}`);
    await expect.poll(() => Boolean(held)).toBe(true);
    if (replacement === "client")
      await navigate(
        page,
        `/modules/planner?clientId=${otherClientId}&task=${taskId}`,
      );
    else
      await page.evaluate(() =>
        dispatchEvent(
          new CustomEvent("test:session", {
            detail: {
              orgId: "replacement-org",
              sessionId: "replacement-session",
            },
          }),
        ),
      );
    await expect(page.getByRole("alert")).toContainText(
      "Replacement access denied",
    );
    await held!.fulfill({ json: { ...nextTask, clientId } }).catch(() => {});
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit task", exact: true }),
    ).toHaveCount(0);
  });

test("agenda link opens a done task despite default open list filter, and respects viewer access", async ({
  page,
}, info) => {
  await setup(page, {
    "planner.tasks": { items: [nextTask], nextCursor: null },
    "planner.task": { ...nextTask, status: "done", access: "viewer" },
  });
  await page.goto("/modules/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await page.getByRole("link", { name: nextTask.name, exact: true }).click();
  await expect(page).toHaveURL(`/modules/planner?task=${taskId}`);
  await expect(
    page.getByRole("dialog", { name: nextTask.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit task", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: info.outputPath("linked-task-detail.png") });
});

for (const directClient of [null, otherClientId]) {
  test(`linked task uses current project membership when direct client is ${directClient ? "different" : "absent"}`, async ({
    page,
  }) => {
    const projectId = "52000000-0000-4000-8000-000000000001";
    const project = {
      id: projectId,
      name: "Current client project",
      description: "",
      color: "#123456",
      privacy: "team",
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
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      access: "editor",
    };
    await setup(page, {
      "planner.bootstrap": { ...bootstrap, projects: [project] },
      "planner.task": {
        ...nextTask,
        clientId: directClient,
        memberships: [{ projectId, sectionId: null, position: 0 }],
      },
    });
    await page.goto(`/modules/planner?clientId=${clientId}&task=${taskId}`);
    await expect(
      page.getByRole("dialog", { name: nextTask.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit task", exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole("dialog")).toContainText(project.name);
  });
}
