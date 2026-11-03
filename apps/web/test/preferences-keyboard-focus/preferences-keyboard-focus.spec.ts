import { expect, test, type Page } from "@playwright/test";

const labels: Record<string, string> = {
  personal: "Personal defaults",
  connections: "Connections",
  "connected-services": "Connected services",
  "data-access": "Data access",
  usage: "Usage and limits",
  skills: "Skills and templates",
  updates: "Workspace updates",
  privacy: "Privacy and retention",
  help: "Help and shortcuts",
};

const tab = (page: Page, id: string) =>
  page.getByRole("tab", { name: labels[id] ?? id, exact: true });

async function shown(page: Page, id: string) {
  await expect(page.getByTestId("page-body")).toHaveAttribute("data-page", id);
  await expect(tab(page, id)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { selected: true })).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`page=${id}`));
}

/** The element holding DOM focus, described the way the QA observation recorded it. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body)
      return { tag: "BODY", role: "body", name: "" };
    return {
      tag: element.tagName,
      role: element.getAttribute("role") ?? element.tagName.toLowerCase(),
      name: (element.getAttribute("aria-label") ?? element.textContent ?? "")
        .trim()
        .replace(/\s+/g, " "),
    };
  });
}

/** Hold this page's own RSC response so a real navigation stays pending until released. */
async function holdPageResponse(page: Page, id: string) {
  let release!: () => void;
  let started!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  const pending = new Promise<void>((resolve) => (started = resolve));
  const matches = (url: string) => {
    const target = new URL(url);
    return (
      target.hostname === "127.0.0.1" &&
      target.searchParams.get("page") === id &&
      target.searchParams.has("_rsc")
    );
  };
  await page.route(
    (url) => matches(url.toString()),
    async (route) => {
      started();
      await hold;
      await route.continue();
    },
  );
  return {
    pending,
    release,
    answered: () => page.waitForResponse((response) => matches(response.url())),
  };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
});

// VQA-014: B002-13 pressed ArrowLeft and Privacy and retention became the selected page
// while DOM focus fell to the document body, so a keyboard user lost their place in the
// tab list. The tab list is replaced when the panel renders the next page, so focus has
// to survive that replacement on the tab the user selected.
test("arrow selection keeps focus on the visible selected tab", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=help");
  await shown(page, "help");
  await tab(page, "help").focus();
  await page.keyboard.press("ArrowLeft");
  await shown(page, "privacy");
  await expect(tab(page, "privacy")).toBeFocused();
  // A keyboard user has to see the same focus the DOM reports.
  expect(
    await page.evaluate(
      () => document.activeElement?.matches(":focus-visible") ?? false,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("privacy-tab-focused.png"),
  });
});

test("the neighbouring tab is selected and focused in both directions", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access");
  await shown(page, "data-access");
  await tab(page, "data-access").focus();

  await page.keyboard.press("ArrowLeft");
  await shown(page, "connected-services");
  await expect(tab(page, "connected-services")).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await shown(page, "data-access");
  await expect(tab(page, "data-access")).toBeFocused();
});

test("arrow wrapping at the bounds keeps focus on the visible selected tab", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=personal");
  await shown(page, "personal");
  await tab(page, "personal").focus();

  await page.keyboard.press("ArrowLeft");
  await shown(page, "help");
  await expect(tab(page, "help")).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await shown(page, "personal");
  await expect(tab(page, "personal")).toBeFocused();
});

test("the tab list keeps one tab stop and lets Tab leave it", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access");
  await shown(page, "data-access");
  const stops = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].map(
      (element) => element.tabIndex,
    ),
  );
  expect(stops.filter((value) => value === 0)).toHaveLength(1);
  expect(stops.filter((value) => value === -1)).toHaveLength(
    Object.keys(labels).length - 1,
  );

  await tab(page, "data-access").focus();
  await page.keyboard.press("Tab");
  await expect(tab(page, "data-access")).not.toBeFocused();
  const after = await focused(page);
  expect(after.role).not.toBe("tab");
});

test("a click selection also keeps focus on the selected tab", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access");
  await shown(page, "data-access");
  await tab(page, "privacy").click();
  await shown(page, "privacy");
  await expect(tab(page, "privacy")).toBeFocused();
});

// The restore must belong to a tab selection only: an in-page link starts its own
// navigation, and the tab list that later mounts must not take focus from it.
test("an in-page link navigation does not move focus to the tab list", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access");
  await shown(page, "data-access");
  await page.getByTestId("page-editor").focus();
  await page.getByRole("link", { name: "Open connections page" }).click();
  await shown(page, "connections");
  const after = await focused(page);
  expect(after.role).not.toBe("tab");
});

// Back/Forward change the address without any tab selection, so the re-rendered tab
// list must stay quiet.
test("history navigation does not move focus to the tab list", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access");
  await shown(page, "data-access");
  await tab(page, "data-access").focus();
  await page.keyboard.press("ArrowLeft");
  await shown(page, "connected-services");
  await expect(tab(page, "connected-services")).toBeFocused();

  await page.goBack();
  await shown(page, "data-access");
  const after = await focused(page);
  expect(after.role).not.toBe("tab");
});

// A selection superseded in the pending window must not leave a focus request behind
// for whatever page is shown next.
test("a superseded selection leaves no later focus request", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access&reviewDelay=1");
  await shown(page, "data-access");
  await tab(page, "data-access").focus();
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(200);
  await tab(page, "data-access").click();
  await page.waitForTimeout(2000);
  await shown(page, "data-access");

  await page.getByRole("link", { name: "Open connections page" }).click();
  await shown(page, "connections");
  const after = await focused(page);
  expect(after.role).not.toBe("tab");
});

// Reviewer R1: a pending page must not take focus back from a control the user
// deliberately moved to while that page was still loading.
test("a pending keyboard selection leaves focus with a header control the user moved to", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=help");
  await shown(page, "help");
  const held = await holdPageResponse(page, "personal");
  await tab(page, "help").focus();
  await page.keyboard.press("ArrowRight");
  await held.pending;
  // The arrow moved focus inside the list, so the handoff is still current here.
  await expect(tab(page, "personal")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  const outside = page.getByRole("textbox", {
    name: "Persistent header input",
  });
  await expect(outside).toBeFocused();
  await outside.fill("mine");
  await expect(outside).toHaveValue("mine");

  const answered = held.answered();
  held.release();
  await answered;
  await shown(page, "personal");
  await expect(outside).toHaveValue("mine");
  await expect(outside).toBeFocused();
});

test("a pending click selection leaves focus with a footer control the user tabbed to", async ({
  page,
}) => {
  await page.goto("/settings/preferences?page=data-access");
  await shown(page, "data-access");
  const held = await holdPageResponse(page, "privacy");
  await tab(page, "privacy").click();
  await held.pending;
  // Leave the list through the still-rendered page body, never a forced focus.
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("page-editor")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Open connections page" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const outside = page.getByRole("textbox", {
    name: "Persistent footer input",
  });
  await expect(outside).toBeFocused();

  const answered = held.answered();
  held.release();
  await answered;
  await shown(page, "privacy");
  await expect(outside).toBeFocused();
});
