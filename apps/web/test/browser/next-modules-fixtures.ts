import { installFixedDate } from "./fixed-date";
import type { Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
export const clientId = "30000000-0000-4000-8000-000000000001";
export const otherClientId = "30000000-0000-4000-8000-000000000002";
export const taskId = "51000000-0000-4000-8000-000000000001";
export const otherTaskId = "51000000-0000-4000-8000-000000000002";
export const nextTask = {
  id: taskId,
  name: "Test appropriation review",
  description: "Synthetic review work",
  ownerId: "test-user",
  assigneeId: "test-user",
  version: 1,
  archived: false,
  status: "todo",
  priority: "high",
  subtype: "task",
  approval: "pending",
  startOn: null,
  dueOn: "2026-10-12",
  startTime: null,
  dueTime: null,
  timeZone: null,
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 90,
  actualMinutes: 15,
  recurrence: null,
  clientId: null,
  meetingId: null,
  completedAt: null,
  createdAt: "2026-10-08T12:00:00Z",
  updatedAt: "2026-10-08T12:00:00Z",
  access: "admin",
};

export const client = {
  id: clientId,
  name: "Current Aerospace",
  status: "ACTIVE",
  profileStatus: "ACTIVE",
};
export const otherClient = {
  ...client,
  id: otherClientId,
  name: "Other Aerospace",
};
export const bootstrap = {
  me: { id: "test-user", name: "Test User" },
  people: [{ id: "test-user", name: "Test User" }],
  projects: [],
};
export async function setup(
  page: Page,
  overrides: Parameters<typeof operationFixtures>[1] = {},
) {
  await onlyLocalRequests(page);
  await installFixedDate(page, Date.parse("2026-10-08T16:00:00Z"));
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [client, otherClient],
    "planner.bootstrap": bootstrap,
    "planner.tasks": (input: unknown) => ({
      items: (input as { query?: { parentId?: string } }).query?.parentId
        ? []
        : [nextTask],
      nextCursor: null,
    }),
    "planner.task": nextTask,
    "planner.task.events": [],
    "planner.task.attachments": [],
    ...overrides,
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith(otherClientId)
        ? otherClient
        : client,
    }),
  );
}
export async function navigate(page: Page, url: string) {
  await page.evaluate((href) => {
    history.pushState({}, "", href);
    dispatchEvent(new PopStateEvent("popstate"));
  }, url);
}
