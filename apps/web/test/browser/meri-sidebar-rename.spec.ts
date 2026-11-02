import { expect, test } from "@playwright/test";
import { MANAGEMENT_VERSION } from "@capiro/meri-contracts/conversation-history";
import { json } from "../../tests/browser/fixtures";
import {
  binding,
  clientId,
  setupConversation,
} from "./meri-conversation-fixtures";
import {
  installCurrentRun,
  installHistory,
  selectedUrl,
} from "./meri-history-fixtures";

/** The control's summary of the open chat: its server-derived title until the person renames it. */
const summary = (title: string, revision = "0") => ({
  conversationId: binding.conversationId,
  title,
  revision,
  scopeKind: "client",
  clientId,
  status: "active",
  updatedAt: "2026-10-13T00:01:00.000Z",
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: true,
  canManage: true,
});

test("the sidebar lists the library before recent chats, names a chat from its summary and renames it inline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  const fixture = await setupConversation(page);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  let current = summary("What changed in the FY27");
  const manages: Record<string, unknown>[] = [];
  await page.route("**/api/conversations/summaries", (route) =>
    json(route, {
      version: MANAGEMENT_VERSION,
      conversations: [current],
      nextBefore: null,
    }),
  );
  await page.route("**/api/conversations/manage", (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    manages.push(body);
    current = summary(body.title as string, "1");
    const { hasTranscript, canManage, ...conversation } = current;
    void hasTranscript;
    void canManage;
    return json(route, {
      version: MANAGEMENT_VERSION,
      requestId: body.requestId,
      conversation,
    });
  });
  await page.goto(selectedUrl);
  const sidebar = page.getByRole("complementary", { name: "Meri navigation" });
  const recent = sidebar.getByRole("link", {
    name: "What changed in the FY27",
    exact: true,
  });
  await expect(recent).toBeVisible();
  await expect(recent).toHaveAttribute("aria-current", "page");
  await expect(sidebar.getByText("Conversation · ")).toHaveCount(0);

  // Library (Files, Memory, Routines, Data access) sits above the recent chats; Preferences stays last.
  const library = (await sidebar
    .getByRole("heading", { name: "Library", exact: true })
    .boundingBox())!;
  const recents = (await sidebar
    .getByRole("heading", { name: "Recent", exact: true })
    .boundingBox())!;
  const preferences = (await sidebar
    .getByRole("link", { name: "Preferences", exact: true })
    .boundingBox())!;
  expect(library.y).toBeLessThan(recents.y);
  expect(recents.y).toBeLessThan(preferences.y);
  const dataAccess = sidebar.getByRole("button", {
    name: "Data access",
    exact: true,
  });
  expect((await dataAccess.boundingBox())!.y).toBeLessThan(recents.y);
  await expect(dataAccess).toBeDisabled();

  // The rename control shows on hover; Escape leaves the saved name and sends nothing.
  const rename = sidebar.getByRole("button", {
    name: "Rename What changed in the FY27",
    exact: true,
  });
  await expect(rename).toHaveCSS("opacity", "0");
  await recent.hover();
  await expect(rename).toHaveCSS("opacity", "1");
  await rename.click();
  const field = sidebar.getByRole("textbox", {
    name: "Conversation name",
    exact: true,
  });
  await expect(field).toHaveValue("What changed in the FY27");
  await expect(field).toBeFocused();
  await field.fill("Not saved");
  await page.keyboard.press("Escape");
  await expect(field).toHaveCount(0);
  await expect(recent).toBeVisible();
  expect(manages).toEqual([]);

  // Enter saves through the management route with the row's exact revision; the list shows the receipt's title.
  await recent.hover();
  await rename.click();
  await field.fill("Defense budget outlook");
  await page.keyboard.press("Enter");
  await expect(
    sidebar.getByRole("link", { name: "Defense budget outlook", exact: true }),
  ).toBeVisible();
  await expect(field).toHaveCount(0);
  expect(manages).toHaveLength(1);
  expect(manages[0]).toMatchObject({
    version: MANAGEMENT_VERSION,
    conversationId: binding.conversationId,
    expectedRevision: "0",
    operation: "rename",
    title: "Defense budget outlook",
  });
  expect(fixture.unexpected).toEqual([]);
});
