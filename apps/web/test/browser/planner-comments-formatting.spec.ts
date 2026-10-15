import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { nextTask, setup, taskId } from "./next-modules-fixtures";

test.use({ viewport: { width: 1440, height: 1040 } });
const eventId = "54000000-0000-4000-8000-000000000001";
const receipt = (text: string, id = eventId, kind = "comment") => ({
  id,
  kind,
  text,
  createdAt: "2026-10-15T12:00:00Z",
  minutes: null,
  actorId: "test-user",
});
async function openTask(
  page: Page,
  overrides: Parameters<typeof setup>[1] = {},
  path = `/modules/planner?task=${taskId}`,
) {
  await setup(page, overrides);
  await page.goto(path);
  await expect(composer(page).input).toBeVisible();
}
function composer(page: Page) {
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  const toolbar = dialog.getByRole("toolbar", { name: "Comment formatting" });
  return {
    dialog,
    input: dialog.getByLabel("Comment", { exact: true }),
    toolbar,
    format: (name: string) =>
      toolbar.getByRole("button", { name, exact: true }),
    preview: dialog.getByRole("region", {
      name: "Comment preview",
      exact: true,
    }),
    post: dialog.getByRole("button", { name: "Post comment", exact: true }),
  };
}
function commentLink(page: Page) {
  return page.getByRole("dialog", { name: "Insert comment link", exact: true });
}
async function select(input: Locator, from: number, to: number) {
  await input.focus();
  await input.evaluate(
    (node, range) => {
      (node as HTMLTextAreaElement).setSelectionRange(...range);
    },
    [from, to] as [number, number],
  );
}
function observeWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      !["GET", "HEAD"].includes(request.method())
    )
      writes.push(request.url());
  });
  return writes;
}
async function refresh(page: Page, version: number, access = "admin") {
  await page.evaluate(
    (task) => {
      dispatchEvent(
        new CustomEvent("capiro-task-receipt-refresh", { detail: task }),
      );
    },
    { ...nextTask, version, access },
  );
}

test("Desktop comment composer previews formatting and posts only the existing kind/text contract", async ({
  page,
}) => {
  let events: ReturnType<typeof receipt>[] = [];
  const writes: unknown[] = [];
  await openTask(page, {
    "planner.task.events": () => events,
    "planner.task.comment": (input) => {
      writes.push(input);
      events = [receipt((input as { body: { text: string } }).body.text)];
      return events[0]!;
    },
  });
  const ui = composer(page);
  await ui.input.fill("Alpha link");
  await select(ui.input, 0, 5);
  await ui.format("Bold").click();
  await expect(ui.input).toHaveValue("**Alpha** link");
  await select(ui.input, 10, 14);
  await ui.format("Link").click();
  const link = commentLink(page);
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("javascript:alert(1)");
  await link.getByRole("button", { name: "Insert link", exact: true }).click();
  await expect(link.getByRole("alert")).toContainText("Use an http");
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("https://example.test/a(b)");
  await link.getByRole("button", { name: "Insert link", exact: true }).click();
  const source = "**Alpha** [link](https://example.test/a%28b%29)";
  await expect(ui.input).toHaveValue(source);
  await ui.format("Preview").click();
  const preview = ui.preview;
  await expect(preview.locator("strong")).toHaveText("Alpha");
  await expect(
    preview.getByRole("link", { name: "link", exact: true }),
  ).toHaveAttribute("href", "https://example.test/a%28b%29");
  expect(writes).toEqual([]);
  await ui.post.click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes).toEqual([
    { params: { id: taskId }, body: { kind: "comment", text: source } },
  ]);
  await expect(ui.input).toHaveValue("");
  let row = ui.dialog.locator("article").filter({ hasText: "comment" });
  await expect(row).toContainText(source);
  await expect(row.locator("strong")).toHaveCount(0);
  await row
    .getByRole("button", { name: "Preview formatting", exact: true })
    .click();
  await expect(
    row
      .getByRole("region", { name: "Comment formatting preview", exact: true })
      .locator("strong"),
  ).toHaveText("Alpha");
  const showText = row.getByRole("button", {
    name: "Show comment text",
    exact: true,
  });
  await expect(showText).toHaveAttribute("aria-pressed", "true");
  await showText.click();
  await expect(row).toContainText(source);
  await page.reload();
  row = composer(page).dialog.locator("article").filter({ hasText: "comment" });
  await expect(row).toContainText(source);
  await expect(
    row.getByRole("button", { name: "Preview formatting", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(row.locator("strong")).toHaveCount(0);
  expect(writes).toHaveLength(1);
});

test("Desktop stored comments remain literal until explicit safe preview and other activity stays literal", async ({
  page,
}) => {
  const legacy =
    '**Literal** <b>angle</b> [Unsafe](javascript:alert(1)) [Safe](https://example.test/path)\n![Tracking](https://tracker.invalid/a)\n- [x] Done\n<script>window.commentExecuted=true</script><img src=x onerror="window.commentExecuted=true">';
  const timeText = "**Time literal** <em>kept</em>";
  const external: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      external.push(request.url());
  });
  const writes = observeWrites(page);
  await openTask(page, {
    "planner.task.events": [
      receipt(legacy),
      receipt(timeText, "54000000-0000-4000-8000-000000000002", "time"),
    ],
  });
  const ui = composer(page);
  const row = ui.dialog.locator("article").filter({ hasText: "comment" });
  const time = ui.dialog.locator("article").filter({ hasText: timeText });
  await expect(row).toContainText(legacy);
  await expect(row.locator("strong,img,script")).toHaveCount(0);
  await expect(time).toContainText(timeText);
  await expect(
    time.getByRole("button", { name: "Preview formatting", exact: true }),
  ).toHaveCount(0);
  await row
    .getByRole("button", { name: "Preview formatting", exact: true })
    .click();
  const preview = row.getByRole("region", {
    name: "Comment formatting preview",
    exact: true,
  });
  await expect(preview.locator("strong")).toHaveText("Literal");
  await expect(
    preview.getByRole("link", { name: "Unsafe", exact: true }),
  ).toHaveCount(0);
  await expect(
    preview.getByRole("link", { name: "Safe", exact: true }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(preview.locator("img,script,iframe")).toHaveCount(0);
  await expect(preview.getByRole("checkbox")).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { commentExecuted?: boolean }).commentExecuted,
    ),
  ).toBeUndefined();
  await row
    .getByRole("button", { name: "Show comment text", exact: true })
    .click();
  await expect(row).toContainText(legacy);
  expect(external).toEqual([]);
  expect(writes).toEqual([]);
});

test("Desktop comment keyboard formatting retains selection and native undo without writes", async ({
  page,
}) => {
  const writes = observeWrites(page);
  await openTask(page);
  const ui = composer(page);
  await ui.input.fill("Alpha beta");
  await select(ui.input, 0, 5);
  await ui.input.press("Control+b");
  await expect(ui.input).toHaveValue("**Alpha** beta");
  await ui.input.press("Control+z");
  await expect(ui.input).toHaveValue("Alpha beta");
  await ui.input.press("Control+Shift+z");
  await expect(ui.input).toHaveValue("**Alpha** beta");
  await select(ui.input, 2, 7);
  await ui.input.press("Control+i");
  await expect(ui.input).toHaveValue("***Alpha*** beta");
  for (const [name, expected] of [
    ["Heading", "### one\n### two"],
    ["List", "- one\n- two"],
    ["Checklist", "- [ ] one\n- [ ] two"],
  ] as const) {
    await ui.input.fill("one\ntwo");
    await select(ui.input, 0, 7);
    await ui.format(name).click();
    await expect(ui.input).toHaveValue(expected);
  }
  await ui.format("Bold").focus();
  await page.keyboard.press("ArrowRight");
  await expect(ui.format("Italic")).toBeFocused();
  await page.keyboard.press("End");
  await expect(ui.format("Preview")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(ui.preview).toBeVisible();
  expect(writes).toEqual([]);
});

for (const outcome of ["success", "refusal"] as const) {
  test(`Desktop formatted comment held ${outcome} fences formatting and native duplicate submission`, async ({
    page,
  }) => {
    await openTask(page);
    const writes: unknown[] = [];
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/capiro/planner.task.comment", async (route) => {
      writes.push(route.request().postDataJSON());
      await held;
      await route.fulfill(
        outcome === "success"
          ? { json: receipt("Pending text") }
          : { status: 409, json: { message: "Synthetic comment refusal" } },
      );
    });
    const ui = composer(page);
    await ui.input.fill("Pending text");
    await select(ui.input, 0, 7);
    await ui.input.locator("xpath=ancestor::form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
      form
        .querySelector<HTMLButtonElement>('button[aria-label="Bold"]')
        ?.click();
      for (const button of form.querySelectorAll<HTMLButtonElement>(
        '[role="toolbar"] button',
      ))
        if (["Link", "Preview"].includes(button.textContent?.trim() ?? ""))
          button.click();
      (form as HTMLFormElement).requestSubmit();
    });
    try {
      await expect.poll(() => writes.length).toBe(1);
      await expect(ui.input).toBeDisabled();
      await expect(ui.input).toHaveValue("Pending text");
      for (const button of await ui.toolbar.getByRole("button").all())
        await expect(button).toBeDisabled();
      await expect(commentLink(page)).toHaveCount(0);
      await expect(ui.preview).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(ui.dialog).toBeVisible();
      expect(writes).toEqual([
        {
          params: { id: taskId },
          body: { kind: "comment", text: "Pending text" },
        },
      ]);
    } finally {
      release();
    }
    if (outcome === "success") await expect(ui.input).toHaveValue("");
    else {
      await expect(ui.dialog.getByRole("alert")).toContainText(
        "Synthetic comment refusal",
      );
      await expect(ui.input).toHaveValue("Pending text");
    }
    await expect(ui.input).toBeEnabled();
    expect(writes).toHaveLength(1);
  });
}

test("Desktop receipt replacement retires a held formatted comment before its late completion", async ({
  page,
}) => {
  await openTask(page, {}, "/__test/task-detail-refresh");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let settled = false;
  let writes = 0;
  await page.route("**/api/capiro/planner.task.comment", async (route) => {
    writes++;
    await held;
    await route.fulfill({ json: receipt("**Former**") }).catch(() => undefined);
    settled = true;
  });
  const ui = composer(page);
  await ui.input.fill("**Former**");
  await ui.post.click();
  try {
    await expect(ui.input).toBeDisabled();
    await refresh(page, 2);
    await expect(ui.input).toBeEnabled();
    await expect(ui.input).toHaveValue("");
    await ui.input.fill("Replacement draft");
  } finally {
    release();
  }
  await expect.poll(() => settled).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(ui.input).toHaveValue("Replacement draft");
  await expect(page.getByTestId("task-saved")).toHaveText("Saved callbacks: 0");
  await expect(page.getByTestId("task-closed")).toHaveText(
    "Closed callbacks: 0",
  );
  expect(writes).toBe(1);
});

test("Desktop comment receipt replacement discards open and queued link drafts and respects viewer access", async ({
  page,
}) => {
  const writes = observeWrites(page);
  await openTask(page, {}, "/__test/task-detail-refresh");
  const ui = composer(page);
  await ui.input.fill("Former link");
  await select(ui.input, 0, 6);
  await ui.format("Link").click();
  const link = commentLink(page);
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("https://example.test/former");
  await page.keyboard.press("Escape");
  await expect(link).toHaveCount(0);
  await expect(ui.input).toBeFocused();
  await ui.format("Link").click();
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("https://example.test/former");
  await refresh(page, 2);
  await expect(link).toHaveCount(0);
  await expect(ui.input).toHaveValue("");
  await ui.input.fill("Current link");
  await select(ui.input, 0, 7);
  await ui.format("Link").click();
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("https://example.test/queued");
  await link.locator("form").evaluate(
    (form, task) => {
      (form as HTMLFormElement).requestSubmit();
      dispatchEvent(
        new CustomEvent("capiro-task-receipt-refresh", { detail: task }),
      );
    },
    { ...nextTask, version: 3, access: "viewer" },
  );
  await expect(link).toHaveCount(0);
  await expect(ui.input).toBeDisabled();
  await expect(ui.input).toHaveValue("");
  for (const button of await ui.toolbar.getByRole("button").all())
    await expect(button).toBeDisabled();
  await expect(
    ui.dialog.getByRole("link", { name: /Current|Former/ }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("Desktop comment limit and empty preview validation never dispatch invalid comments", async ({
  page,
  runtimeObservation,
}) => {
  const writes = observeWrites(page);
  await openTask(page);
  const ui = composer(page);
  await expect(ui.input).toHaveAttribute("required", "");
  await ui.input.locator("xpath=ancestor::form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });
  expect(writes).toEqual([]);
  await ui.format("Preview").click();
  const preview = ui.preview;
  await expect(preview).toBeVisible();
  await expect(preview).not.toContainText("No description");
  await ui.input.locator("xpath=ancestor::form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });
  expect(writes).toEqual([]);
  expect(
    runtimeObservation.consoleErrors.filter((error) =>
      /not focusable/i.test(error.text),
    ),
  ).toEqual([]);
  await ui.format("Preview").click();
  await ui.input.fill("A".repeat(20000));
  await select(ui.input, 0, 1);
  await ui.format("Bold").click();
  await expect(
    ui.dialog.getByRole("alert").filter({ hasText: "character limit" }),
  ).toBeVisible();
  await expect(ui.input).toHaveValue("A".repeat(20000));
  await ui.format("Link").click();
  const link = commentLink(page);
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("https://example.test/limit");
  await link.getByRole("button", { name: "Insert link", exact: true }).click();
  await expect(link.getByRole("alert")).toContainText("character limit");
  await link.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(ui.input).toHaveValue("A".repeat(20000));
  expect(writes).toEqual([]);
});
