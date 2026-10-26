import { expect, type Page } from "@playwright/test";
import {
  onlyLocalRequests,
  testIdentity,
} from "../../../../../../test/browser/fixtures";

export const draftId = "d3000000-0000-4000-8000-000000000001";
export const invitationId = "d3000000-0000-4000-8000-000000000002";
const notificationId = "d3000000-0000-4000-8000-000000000003";
export const owner = {
  id: `owner:${draftId}`,
  subjectId: "test-user",
  email: null,
  name: "Jordan Clayton",
  role: "owner",
  status: "active",
  isOwner: true,
};
export const pendingPerson = {
  id: invitationId,
  subjectId: "user_alex",
  email: null,
  name: "Alex Morgan",
  role: "reviewer",
  status: "pending",
  isOwner: false,
};
export function savedPerson(actor = "user_alex") {
  return {
    id: invitationId,
    tenantId: testIdentity.tenant.id,
    draftId,
    subjectId: actor,
    email: null,
    name: "Alex Morgan",
    role: "reviewer",
    status: "pending",
    invitedById: "test-user",
    createdAt: "2026-10-26T00:00:00Z",
    updatedAt: "2026-10-26T00:00:00Z",
  };
}
export function notice() {
  return {
    id: notificationId,
    tenantId: testIdentity.tenant.id,
    recipientId: "test-user",
    kind: "collab_invite",
    draftId,
    collaboratorId: invitationId,
    newsletterId: null,
    actorName: "Jordan Clayton",
    draftTitle: "Weekly policy briefing",
    role: "reviewer",
    message: "Synthetic invitation",
    read: false,
    actionable: true,
    createdAt: "2026-10-26T00:00:00Z",
  };
}
export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
export async function fixture(page: Page, initiallyPending = true) {
  await onlyLocalRequests(page);
  const state = {
    actor: "test-user",
    people: [owner, ...(initiallyPending ? [pendingPerson] : [])],
    notices: [notice()],
    requests: [] as { key: string; input: unknown }[],
    status: "not_requested",
    providerMessageId: null as string | null,
    errorCode: null as string | null,
    refused: false,
    reads: 0,
  };
  const receipt = () => ({
    draftId,
    invitationId,
    status: state.status,
    providerMessageId: state.providerMessageId,
    errorCode: state.errorCode,
    updatedAt: state.status === "not_requested" ? null : "2026-10-26T00:00:00Z",
  });
  await page.route("**/api/capiro/*", async (route) => {
    const url = new URL(route.request().url());
    const key = decodeURIComponent(url.pathname.split("/").pop()!);
    const input =
      route.request().method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : route.request().postDataJSON();
    state.requests.push({ key, input });
    const responses: Record<string, unknown> = {
      "me.read": {
        ...testIdentity,
        user: {
          ...testIdentity.user,
          clerkUserId: state.actor,
          firstName: "Jordan",
          lastName: "Clayton",
        },
      },
      "settings.tenantMembers": [
        {
          id: "local-member-id",
          clerkUserId: "user_alex",
          name: "Alex Morgan",
          email: "alex@example.test",
        },
      ],
      "workspace.documents": { items: [], nextCursor: null },
      "workspace.templates": [],
      "workspace.clients": { items: [] },
    };
    if (key === "workspace.collaborators") {
      state.reads++;
      return state.refused
        ? route.fulfill({
            status: 403,
            json: { message: "Synthetic access revoked" },
          })
        : route.fulfill({ json: { collaborators: state.people } });
    }
    if (key === "workspace.collaborator.invite") {
      state.people = [owner, { ...pendingPerson, role: input.body.role }];
      return route.fulfill({
        json: { ...savedPerson(), role: input.body.role },
      });
    }
    if (key === "workspace.collaborator.role") {
      state.people = [owner, { ...pendingPerson, role: input.body.role }];
      return route.fulfill({
        json: { ...savedPerson(), role: input.body.role },
      });
    }
    if (key === "workspace.collaborator.remove") {
      state.people = [owner];
      return route.fulfill({ json: { deleted: true } });
    }
    if (key === "workspace.collaborator.email.request") {
      state.status = "accepted";
      state.providerMessageId = "synthetic-provider-id";
      return route.fulfill({ json: receipt() });
    }
    if (key === "workspace.collaborator.email.cancel") {
      if (["not_requested", "claimed"].includes(state.status))
        state.status = "cancelled";
      return route.fulfill({ json: receipt() });
    }
    if (key === "workspace.collaborator.email.status")
      return route.fulfill({ json: receipt() });
    if (key === "workspace.notifications")
      return route.fulfill({
        json: {
          items: state.notices,
          unread: state.notices.filter((item) => !item.read).length,
        },
      });
    if (
      key === "workspace.collaborator.accept" ||
      key === "workspace.collaborator.decline"
    ) {
      state.notices = state.notices.map((item) => ({
        ...item,
        actionable: false,
      }));
      return route.fulfill({
        json: key.endsWith("accept")
          ? { ...savedPerson("test-user"), status: "active" }
          : { declined: true },
      });
    }
    if (key === "workspace.notification.read") {
      state.notices[0]!.read = true;
      return route.fulfill({ json: state.notices[0] });
    }
    if (key === "workspace.notifications.readAll") {
      state.notices = state.notices.map((item) => ({ ...item, read: true }));
      return route.fulfill({ json: { updated: state.notices.length } });
    }
    return Object.hasOwn(responses, key)
      ? route.fulfill({ json: responses[key] })
      : route.fulfill({
          status: 500,
          json: { message: `Unexpected synthetic operation ${key}` },
        });
  });
  return state;
}
export async function openPeople(page: Page) {
  await page.goto("/harness.html");
  await page
    .getByRole("button", { name: "People with access", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "People", exact: true }),
  ).toBeVisible();
}
