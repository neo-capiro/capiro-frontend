import { createHash } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { client } from "./fixtures";
import {
  commandActor as actor,
  commandMeeting as meeting,
  commandFile as file,
} from "./meeting-command-data";
import type { MeetingAttempt } from "../../src/features/portfolio/calendar/commands/recovery";

async function setup(page: Page) {
  const state = {
    posts: [] as MeetingAttempt["input"][],
    writes: 0,
    gets: 0,
    before: false,
    after: false,
    deny: false,
    refuse: false,
    receipts: new Map<string, unknown>(),
    unexpected: [] as string[],
  };
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/backend/",
    )[1]!;
    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (path === "core/me")
      return json({
        user: { id: actor.userId, email: "synthetic@example.test" },
        tenant: { id: actor.tenantId, name: "Synthetic" },
        role: "standard_user",
      });
    if (path === "core/clients") return json([client]);
    if (path === "core/engagement/attachments") return json([file]);
    if (path.endsWith(`/meetings/${meeting.id}/notes`))
      return json(meeting.notes);
    if (path.endsWith(`/meetings/${meeting.id}`)) return json(meeting);
    if (path.startsWith("core/engagement/meeting-commands")) {
      if (state.deny) return json({ message: "Current access denied" }, 403);
      if (route.request().method() === "POST") {
        const input = route.request().postDataJSON() as MeetingAttempt["input"];
        state.posts.push(input);
        if (state.before) {
          state.before = false;
          return route.abort("failed");
        }
        if (!state.receipts.has(input.requestId)) {
          if (!state.refuse) state.writes++;
          const artifactId =
            input.artifact?.id ?? "00000000-0000-4000-8000-000000000009";
          const artifacts = input.artifact
            ? [
                {
                  type: input.operation.startsWith("note-")
                    ? "note"
                    : "debrief",
                  id: artifactId,
                  revision: "2026-10-24T12:01:00.000Z",
                },
              ]
            : input.artifacts.map((row) => ({
                ...row,
                revision:
                  typeof row.revision === "number"
                    ? row.revision + 1
                    : "2026-10-24T12:01:00.000Z",
              }));
          state.receipts.set(input.requestId, {
            schemaVersion: 1,
            tenantId: actor.tenantId,
            actorUserId: actor.userId,
            requestId: input.requestId,
            payloadDigest: createHash("sha256")
              .update(
                JSON.stringify([
                  "meeting-command",
                  1,
                  actor.tenantId,
                  actor.userId,
                  input,
                ]),
              )
              .digest("hex"),
            operation: input.operation,
            requestedMeetingId: input.meetingId,
            expectedClientId: input.expectedClientId,
            status: state.refuse ? "refused" : "completed",
            result: state.refuse
              ? null
              : {
                  meetingId: input.meetingId ?? meeting.id,
                  clientId: input.meeting?.assignClient
                    ? input.meeting.clientId
                    : input.expectedClientId,
                  revision: "2026-10-24T12:01:00.000Z",
                  artifacts,
                },
            refusal: state.refuse
              ? {
                  code: "MEETING_COMMAND_REFUSED",
                  message:
                    "The reviewed meeting changed. Review this action again.",
                }
              : null,
            createdAt: "2026-10-24T12:01:00.000Z",
            available: !state.refuse,
          });
        }
        if (state.after) {
          state.after = false;
          return route.abort("failed");
        }
        return json(state.receipts.get(input.requestId));
      }
      state.gets++;
      const receipt = state.receipts.get(path.split("/").at(-1)!);
      return receipt ? json(receipt) : json({ message: "Not found" }, 404);
    }
    state.unexpected.push(path);
    return json({ message: "Unexpected synthetic route" }, 404);
  });
  return state;
}
async function fillMeeting(page: Page) {
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Retain my synthetic meeting");
  await page.getByLabel("Starts", { exact: true }).fill("2026-10-24T12:00");
  await page.getByLabel("Ends", { exact: true }).fill("2026-10-24T13:00");
  await expect(
    page.getByRole("button", { name: "Save meeting", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save meeting", exact: true }).click();
}
test("create recovers committed response loss after hard reload without another POST", async ({
  page,
}) => {
  const state = await setup(page);
  state.after = true;
  await page.goto("/meeting-command.html");
  await fillMeeting(page);
  await expect(
    page.getByRole("button", { name: "Check result", exact: true }),
  ).toBeVisible();
  expect(state.writes).toBe(1);
  await page.reload();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Retain my synthetic meeting",
  );
  await page.getByRole("button", { name: "Check result", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText("Action acknowledged", { exact: true }),
  ).toBeVisible();
  expect(state.posts).toHaveLength(1);
  expect(state.unexpected).toEqual([]);
});
test("note draft survives an uncommitted request and retries its exact retained body", async ({
  page,
}) => {
  const state = await setup(page);
  state.before = true;
  await page.goto("/meeting-command.html?mode=artifact");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page
    .getByLabel("Content", { exact: true })
    .fill("Keep this original private draft");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Check result", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Check result", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Not found");
  await page
    .getByRole("button", { name: "Retry original action", exact: true })
    .click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByLabel("Content", { exact: true })).toHaveValue("");
  expect(state.posts).toHaveLength(2);
  expect(state.posts[0]).toEqual(state.posts[1]);
  expect(state.posts[1]!.artifact?.body).toBe(
    "Keep this original private draft",
  );
  expect(state.writes).toBe(1);
  expect(state.unexpected).toEqual([]);
});
test("selected prep and attachment sharing recovers the original set after hard reload", async ({
  page,
}) => {
  const state = await setup(page);
  state.after = true;
  await page.goto("/meeting-command.html?mode=sharing");
  await page.getByRole("checkbox", { name: /Meeting prep/ }).check();
  await page.getByRole("checkbox", { name: /Synthetic questions/ }).check();
  await page
    .getByRole("button", { name: "Share selected artifacts", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirm: Share selected artifacts",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Check result", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Check result", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0]!.artifacts).toHaveLength(2);
  expect(
    state.posts[0]!.artifacts.find((row) => row.type === "attachment")
      ?.revision,
  ).toBe(0);
  expect(state.writes).toBe(1);
  expect(state.unexpected).toEqual([]);
});
test("a stored refusal preserves the reviewed form through reload and explicit review", async ({
  page,
}) => {
  const state = await setup(page);
  state.refuse = true;
  await page.goto("/meeting-command.html");
  await fillMeeting(page);
  await expect(
    page.getByRole("button", { name: "Review again", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Check result", exact: true }).click();
  await page.getByRole("button", { name: "Review again", exact: true }).click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Retain my synthetic meeting",
  );
  await expect(
    page.getByRole("button", { name: "Save meeting", exact: true }),
  ).toBeEnabled();
  expect(state.writes).toBe(0);
  expect(state.posts).toHaveLength(1);
  expect(state.unexpected).toEqual([]);
});
