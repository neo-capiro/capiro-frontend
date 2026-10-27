import { expect, test, type Page } from "@playwright/test";
import {
  dashboard,
  design,
  hostileText,
  ids,
  link,
  portfolio,
  shareToken,
  timestamp,
} from "./research-sharing-fixture";

async function sharingApi(
  page: Page,
  options: {
    enabled?: boolean;
    tenantEnabled?: boolean;
    userId?: string;
    links?: unknown[];
  } = {},
) {
  let enabled = options.enabled ?? false;
  let links: unknown[] = options.links ?? [];
  const writes: { key: string; body: Record<string, unknown> }[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const request = route.request();
    const key = new URL(request.url()).pathname.split("/").at(-1)!;
    const input =
      request.method() === "GET" ? undefined : request.postDataJSON();
    if (input) writes.push({ key, body: input.body });
    const settings = () => ({
      portfolioId: ids.portfolio,
      enabled,
      tenantEnabled: options.tenantEnabled ?? true,
      pinSet: enabled,
      pinUpdatedAt: enabled ? timestamp : null,
      activeLinkCount: links.length,
      updatedAt: timestamp,
    });
    let result: unknown;
    switch (key) {
      case "me.read":
        result = {
          user: {
            id: options.userId ?? "10000000-0000-4000-8000-000000000006",
            clerkUserId: "synthetic-owner",
            email: null,
            firstName: null,
            lastName: null,
            title: null,
            emailSignatureEnabled: false,
            hasEmailSignature: false,
            tourCompleted: true,
            legiwatchIntroSeen: false,
          },
          tenant: {
            id: "10000000-0000-4000-8000-000000000007",
            slug: "synthetic",
            name: "Synthetic firm",
          },
          role: "standard_user",
          billingAdmin: false,
          entitlements: {
            memoryGovernance: false,
            peWatch: false,
            defenseBudgetIntel: false,
            complianceModule: false,
            dataExport: false,
            customConnectors: false,
          },
          features: {},
        };
        break;
      case "research.detail":
        result = portfolio;
        break;
      case "research.sharing":
        result = settings();
        break;
      case "research.sharing.enable":
        enabled = true;
        result = settings();
        break;
      case "research.sharing.disable":
        enabled = false;
        links = [];
        result = settings();
        break;
      case "research.sharing.pin":
        result = settings();
        break;
      case "research.designs":
        result = [design];
        break;
      case "research.shareLinks":
        result = links;
        break;
      case "research.snapshots":
        result = [
          {
            ...dashboard.snapshot,
            portfolioId: ids.portfolio,
            contentHash: "synthetic",
          },
        ];
        break;
      case "research.sharePreview":
        result = {
          dashboard: {
            ...dashboard,
            branding: input.body.branding
              ? { firmName: "Frozen firm", logoAvailable: false }
              : null,
          },
          previewHash: (input.body.branding ? "d" : "e").repeat(64),
          designVersion: design.version,
          logoUrl: null,
        };
        break;
      case "research.shareLinks.publish":
        links = [link];
        result = { link, token: shareToken, replayed: false };
        break;
      case "research.shareLinks.revoke":
        links = [{ ...link, status: "revoked", revokedAt: timestamp }];
        result = links[0];
        break;
      default:
        throw new Error(`Unexpected operation ${key}`);
    }
    await route.fulfill({ json: result });
  });
  return writes;
}

test("the owner lock badge follows lockedUntil rather than a lifetime failed-PIN count", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-27T12:00:00Z") });
  await sharingApi(page, {
    enabled: true,
    links: [
      { ...link, failedPinAttempts: 5, lockedUntil: "2026-10-27T12:15:00Z" },
    ],
  });
  await page.goto("/research-sharing.html");
  await expect(page.getByText(/5 · locked until/)).toBeVisible();
  await page.clock.fastForward(900001);
  await expect(page.getByText(/locked until/)).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "5", exact: true }),
  ).toBeVisible();
});

test("Sharing enables a PIN, publishes the exact selection once, and confirms disable", async ({
  page,
}) => {
  const writes = await sharingApi(page);
  await page.goto("/research-sharing.html");
  await expect(
    page.getByRole("button", { name: "Publish link", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Turn on sharing" }).click();
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("I reviewed this frozen dashboard and everything it exposes.")
    .check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(`/share/${shareToken}`);
  expect(
    writes.filter((w) => w.key === "research.shareLinks.publish"),
  ).toHaveLength(1);
  expect(
    writes.find((w) => w.key === "research.shareLinks.publish")?.body,
  ).toMatchObject({
    clientId: ids.client,
    snapshotId: ids.snapshot,
    designId: ids.design,
    branding: true,
    previewHash: "d".repeat(64),
    expectedDesignVersion: 1,
  });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "Turn off sharing", exact: true })
    .click();
  expect(writes.some((w) => w.key === "research.sharing.disable")).toBe(false);
  await page.getByRole("button", { name: "Turn off and revoke links" }).click();
  await expect(
    page.getByRole("button", { name: "Turn on sharing" }),
  ).toBeVisible();
  expect(
    writes.filter((w) => w.key === "research.sharing.disable"),
  ).toHaveLength(1);
});

test("workspace switch prevents publishing an already enabled portfolio", async ({
  page,
}) => {
  const writes = await sharingApi(page, {
    enabled: true,
    tenantEnabled: false,
  });
  await page.goto("/research-sharing.html");
  await expect(
    page.getByText("Client sharing is switched off for your whole workspace", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish link", exact: true }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});

test("all keyboard designer removal and phone ordering controls announce their changes", async ({
  page,
}) => {
  await page.goto("/research-sharing.html?mode=designer");
  const widget = page.getByRole("group", { name: /^Commentary widget/ });
  await widget.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    "Commentary moved: column 1, row 8",
  );
  await page
    .getByRole("button", { name: "Move Commentary earlier", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[aria-live="polite"]')).toHaveText(
    "Commentary moved to phone position 2.",
  );
  await page
    .getByRole("button", { name: "Remove widget", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(widget).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: /^Firm mark widget/ }),
  ).toBeFocused();
  await expect(page.locator('[aria-live="polite"]')).toHaveText(
    "Commentary removed.",
  );
});

test("designer ignores modified and descendant keys and returns focus after keyboard deletion", async ({
  page,
}) => {
  await page.goto("/research-sharing.html?mode=designer");
  const widget = page.getByRole("group", { name: /^Commentary widget/ });
  const initial = await widget.getAttribute("aria-label");
  await widget.focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(widget).toHaveAttribute("aria-label", initial!);
  await page
    .getByRole("button", { name: "Resize Commentary", exact: true })
    .focus();
  await page.keyboard.press("Delete");
  await expect(widget).toHaveCount(1);
  await widget.focus();
  await page.keyboard.press("Delete");
  await expect(widget).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: /^Firm mark widget/ }),
  ).toBeFocused();
});

test("archive and unlink wait for the live-link count and preserve the confirmation", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const writes: string[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (key === "research.sharing") {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        json: {
          portfolioId: ids.portfolio,
          enabled: true,
          tenantEnabled: true,
          pinSet: true,
          pinUpdatedAt: timestamp,
          activeLinkCount: 2,
          updatedAt: timestamp,
        },
      });
    } else if (route.request().method() !== "GET") {
      writes.push(key);
      await route.fulfill({
        json: {
          portfolioId: ids.portfolio,
          eventId: "synthetic-event",
          actorUserId: "owner",
          occurredAt: timestamp,
          resultingRevision: 2,
          replayed: false,
          outcomes: [],
        },
      });
    } else await route.fulfill({ json: [] });
  });
  await page.goto("/research-sharing.html?mode=settings");
  await expect.poll(() => Boolean(release)).toBe(true);
  await expect(
    page.getByRole("button", { name: "Archive portfolio", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Unlink", exact: true }),
  ).toBeDisabled();
  release!();
  await page
    .getByRole("button", { name: "Archive portfolio", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "2 active client links will keep working",
  );
  expect(writes).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Unlink", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "2 active client links will keep working",
  );
  expect(writes).toEqual([]);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect.poll(() => writes).toEqual(["research.clients.unlink"]);
});

test("workspace admin confirms off, turns sharing on and revokes a listed link", async ({
  page,
}) => {
  let enabled = true;
  let activeLinks = [link];
  const writes: string[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const request = route.request();
    const key = new URL(request.url()).pathname.split("/").at(-1)!;
    if (request.method() === "POST") {
      writes.push(key);
      if (key === "research.tenantSharing.set")
        enabled = request.postDataJSON().body.enabled;
      if (key === "research.shareLinks.tenantRevoke") activeLinks = [];
    }
    const json =
      key === "research.shareLinks.tenant"
        ? activeLinks
        : key === "research.shareLinks.tenantRevoke"
          ? { ...link, status: "revoked", revokedAt: timestamp }
          : {
              enabled,
              activeLinkCount: activeLinks.length,
              updatedAt: timestamp,
              updatedByUserId: null,
            };
    await route.fulfill({ json });
  });
  await page.goto("/research-sharing.html?mode=admin");
  await page
    .getByRole("button", { name: "Turn off client sharing", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "1 active link will stop working immediately",
  );
  await page
    .getByRole("button", { name: "Keep sharing on", exact: true })
    .click();
  expect(writes).toEqual([]);
  await page
    .getByRole("button", { name: "Turn off client sharing", exact: true })
    .click();
  await page.getByRole("button", { name: "Turn off", exact: true }).click();
  await page
    .getByRole("button", { name: "Turn on client sharing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Turn off client sharing", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(
    page.getByText("No active client links.", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([
    "research.tenantSharing.set",
    "research.tenantSharing.set",
    "research.shareLinks.tenantRevoke",
  ]);
});

test("branded recipient fetches the signed logo only after PIN entry", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/synthetic-logo.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="blue"/></svg>',
    }),
  );
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    requests.push(key);
    const json = key.endsWith("availability")
      ? { available: true }
      : key.endsWith("pin")
        ? {
            viewToken: "synthetic-session",
            expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          }
        : key.endsWith("logo")
          ? { url: `${new URL(page.url()).origin}/synthetic-logo.svg` }
          : {
              ...dashboard,
              branding: { firmName: "Synthetic firm", logoAvailable: true },
            };
    await route.fulfill({ json });
  });
  await page.goto("/research-sharing.html?mode=public");
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  expect(new Set(requests)).toEqual(
    new Set(["public-research-share.availability"]),
  );
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(
    page.getByRole("img", { name: "Synthetic firm logo", exact: true }),
  ).toHaveCount(2);
  expect(requests.filter((key) => !key.endsWith("availability"))).toEqual([
    "public-research-share.pin",
    "public-research-share.dashboard",
    "public-research-share.logo",
  ]);
});

test("viewer has no publish, edit or settings write controls", async ({
  page,
}) => {
  const writes = await sharingApi(page);
  await page.goto("/research-sharing.html?role=viewer");
  await expect(
    page.getByText("Only the portfolio owner", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Turn on sharing" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "New design" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish link" })).toHaveCount(
    0,
  );
  expect(writes).toEqual([]);
});

test("designer commits pointer move/resize, undo/redo, keyboard and phone order", async ({
  page,
}) => {
  await page.goto("/research-sharing.html?mode=designer");
  const widget = page.getByRole("group", { name: /^Commentary widget/ });
  const handle = widget.locator("div").first();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 146, { steps: 4 });
  await page.mouse.up();
  await expect(widget).toHaveAttribute("aria-label", /row 9,/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(widget).toHaveAttribute("aria-label", /row 7,/);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(widget).toHaveAttribute("aria-label", /row 9,/);
  const resize = (await widget
    .getByRole("button", { name: "Resize Commentary" })
    .boundingBox())!;
  await page.mouse.move(resize.x + 9, resize.y + 9);
  await page.mouse.down();
  await page.mouse.move(resize.x + 9, resize.y + 77, { steps: 4 });
  await page.mouse.up();
  await expect(widget).toHaveAttribute("aria-label", /4 tall$/);
  await widget.focus();
  await page.keyboard.press("ArrowDown");
  await expect(widget).toHaveAttribute("aria-label", /row 10,/);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(widget).toHaveAttribute("aria-label", /5 tall$/);
  await page
    .getByRole("button", { name: "Move Commentary earlier", exact: true })
    .click();
  await page.getByRole("button", { name: "Save design", exact: true }).click();
  const saved = JSON.parse(await page.getByTestId("saved-layout").innerText());
  expect(
    saved.widgets.find((w: { id: string }) => w.id === "comment"),
  ).toMatchObject({ y: 9, h: 5 });
  expect(saved.phoneOrder).toEqual(["header", "comment", "totals", "mark"]);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText(hostileText, { exact: true })).toHaveCount(2);
  await page.screenshot({
    path: test.info().outputPath("designer-desktop.png"),
    fullPage: true,
  });
});

test("full financial basis stays distinct and exact numeric strings are rendered", async ({
  page,
}) => {
  const duplicateKeys: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("same key")) duplicateKeys.push(message.text());
  });
  await page.goto("/research-sharing.html?mode=widgets");
  await expect(
    page.getByText("9007199254740993.123456 USD M", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/constant FY2024/)).toHaveCount(1);
  await expect(page.getByText(/price basis current/)).toHaveCount(1);
  expect(duplicateKeys).toEqual([]);
});

test("public PIN opens the snapshot without external images or persistent credentials", async ({
  page,
}) => {
  const requests: string[] = [];
  const external: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://external.invalid"))
      external.push(request.url());
  });
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    requests.push(key);
    const result = key.endsWith("availability")
      ? { available: true }
      : key.endsWith("pin")
        ? {
            viewToken: "synthetic-session",
            expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          }
        : dashboard;
    await route.fulfill({ json: result });
  });
  await page.goto("/research-sharing.html?mode=public");
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic research" }),
  ).toBeVisible();
  await expect(page.getByText(hostileText, { exact: true })).toHaveCount(2);
  await expect(page.locator("img")).toHaveCount(0);
  expect(external).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByText("9007199254740993.123456 USD M", { exact: true }),
  ).toBeVisible();
  const total = page.getByText("9007199254740993.123456 USD M", {
    exact: true,
  });
  expect(
    await total.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = element.getBoundingClientRect();
      return [...range.getClientRects()].every(
        (rect) => rect.left >= box.left - 1 && rect.right <= box.right + 1,
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("recipient-phone.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  expect(requests.filter((key) => key.endsWith("dashboard"))).toHaveLength(1);
});

test("unavailable links disclose no dashboard and late old-token work stays retired", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  let dashboardRequested = false;
  await page.route("**/api/capiro/**", async (route) => {
    const request = route.request();
    const key = new URL(request.url()).pathname.split("/").at(-1)!;
    if (key.endsWith("availability")) {
      const input = JSON.parse(
        new URL(request.url()).searchParams.get("input")!,
      );
      await route.fulfill({
        json: { available: input.params.token === shareToken },
      });
    } else if (key.endsWith("pin"))
      await route.fulfill({
        json: {
          viewToken: "synthetic-session",
          expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        },
      });
    else {
      dashboardRequested = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({ json: dashboard }).catch(() => undefined);
    }
  });
  await page.goto("/research-sharing.html?mode=public");
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect.poll(() => dashboardRequested).toBe(true);
  await page.getByRole("button", { name: "Switch synthetic token" }).click();
  await expect(
    page.getByRole("heading", { name: "Link not available" }),
  ).toBeVisible();
  release!();
  await expect(
    page.getByRole("heading", { name: "Synthetic research" }),
  ).toHaveCount(0);
});

test("preview uses frozen figures and changes require reviewing the new frozen payload", async ({
  page,
}) => {
  const writes = await sharingApi(page, { enabled: true });
  await page.goto("/research-sharing.html");
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  const preview = page.getByRole("region", { name: "Recipient preview" });
  await expect(preview).toContainText("9007199254740993.123456");
  await expect(preview).toContainText("Frozen firm");
  await page
    .getByLabel("I reviewed this frozen dashboard and everything it exposes.")
    .check();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Show our firm name and logo on the dashboard")
    .uncheck();
  await expect(preview).not.toContainText("Frozen firm");
  await expect(
    page.getByLabel(
      "I reviewed this frozen dashboard and everything it exposes.",
    ),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  expect(
    writes.filter((row) => row.key === "research.shareLinks.publish"),
  ).toHaveLength(0);
});

for (const outcome of ["present", "absent", "unknown", "timeout"] as const) {
  test(`lost publish response reconciles ${outcome} without an automatic write`, async ({
    page,
  }) => {
    await sharingApi(page, { enabled: true });
    const publications: unknown[] = [];
    let lookups = 0;
    await page.route(
      "**/api/capiro/research.shareLinks.publish",
      async (route) => {
        publications.push(route.request().postDataJSON());
        if (publications.length === 1 && outcome === "timeout")
          await route.fulfill({
            status: 408,
            json: { message: "Request timed out" },
          });
        else if (publications.length === 1) await route.abort("failed");
        else
          await route.fulfill({
            json: { link, token: shareToken, replayed: false },
          });
      },
    );
    await page.route(
      "**/api/capiro/research.shareLinks.operation?*",
      async (route) => {
        lookups += 1;
        if (outcome === "unknown") await route.abort("failed");
        else
          await route.fulfill({
            json: {
              link:
                outcome === "present" || outcome === "timeout" ? link : null,
            },
          });
      },
    );
    await page.goto("/research-sharing.html");
    await page
      .getByRole("button", { name: "Publish link", exact: true })
      .click();
    await page
      .getByLabel("I reviewed this frozen dashboard and everything it exposes.")
      .check();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(
      page.getByText("The publication result is unknown.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByLabel("Close dialog")).toBeDisabled();
    await expect(page.getByLabel("Client", { exact: true })).toBeDisabled();
    expect(publications).toHaveLength(1);
    expect(lookups).toBe(0);
    await page
      .getByRole("button", { name: "Check publication result" })
      .click();
    if (outcome === "present" || outcome === "timeout") {
      await expect(page.getByRole("dialog")).toContainText(
        "one-time address was not received here",
      );
      await expect(page.getByRole("button", { name: "Copy link" })).toHaveCount(
        0,
      );
    } else if (outcome === "absent") {
      await expect(
        page.getByRole("button", { name: "Retry this publication" }),
      ).toBeVisible();
      expect(publications).toHaveLength(1);
      await page
        .getByRole("button", { name: "Retry this publication" })
        .click();
      await expect(page.getByRole("dialog")).toContainText(
        `/share/${shareToken}`,
      );
      expect(publications).toHaveLength(2);
      expect(publications[1]).toEqual(publications[0]);
    } else {
      await expect(
        page.getByText("The publication result is still unknown.", {
          exact: false,
        }),
      ).toBeVisible();
      await expect(page.getByLabel("Close dialog")).toBeDisabled();
      await expect(page.getByLabel("Client", { exact: true })).toBeDisabled();
    }
    expect(lookups).toBe(1);
    if (outcome !== "absent") expect(publications).toHaveLength(1);
  });
}

test("canonical address dispatches research to the PIN gate and a document to safe captured text", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  let kind = "research_portfolio";
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    requests.push(key);
    if (key === "public-share.kind")
      await route.fulfill({ json: { available: true, kind } });
    else if (key === "public-research-share.availability")
      await route.fulfill({ json: { available: true } });
    else if (key === "public-share.document")
      await route.fulfill({
        json: {
          draftId: "",
          versionId: "frozen-v1",
          docTitle: "Captured document",
          sections: [
            {
              id: "section",
              title: "Captured section",
              content:
                '<img src="https://external.invalid/sentinel" onerror="alert(1)">',
            },
          ],
        },
      });
    else throw new Error(`Unexpected operation ${key}`);
  });
  await page.goto("/research-sharing.html?mode=shared");
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  expect(requests).not.toContain("public-share.document");
  kind = "workspace_document";
  await page.getByRole("button", { name: "Switch synthetic token" }).click();
  await expect(
    page.getByRole("heading", { name: "Captured document" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      '<img src="https://external.invalid/sentinel" onerror="alert(1)">',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator("article img")).toHaveCount(0);
  expect(
    requests.every(
      (key) =>
        key.startsWith("public-share.") ||
        key.startsWith("public-research-share."),
    ),
  ).toBe(true);
  expect(await context.cookies()).toEqual([]);
});

test("canonical failed kind lookup reveals only unavailable", async ({
  page,
}) => {
  await page.route("**/api/capiro/**", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.goto("/research-sharing.html?mode=shared");
  await expect(
    page.getByRole("heading", { name: "Link not available" }),
  ).toBeVisible();
  await expect(page.getByLabel("PIN", { exact: true })).toHaveCount(0);
});

test("recipient expands exact frozen source evidence and table rows without another request", async ({
  page,
}) => {
  const requests: string[] = [];
  const frozen = structuredClone(dashboard);
  frozen.layout = {
    columns: 12,
    widgets: [
      {
        id: "funding",
        kind: "funding_table",
        x: 0,
        y: 0,
        w: 12,
        h: 5,
        settings: { limit: 1 },
      },
    ],
    phoneOrder: ["funding"],
  };
  frozen.data.sources = [
    {
      id: "source",
      evidenceRefId: "evidence",
      sourceDocumentId: "doc",
      sourceRevisionId: "revision-frozen",
      sourceFamily: "budget",
      publisher: "Captured publisher",
      sourceUrl: "https://source.example/frozen",
      nativeLocator: {
        page: 37,
        section: "Captured section",
        occurrenceId: "occurrence",
      },
      contentHash: "frozenhash",
      edition: "FY2027",
      observedAt: timestamp,
    },
  ];
  frozen.data.contributions = [1, 2].map((index) => ({
    contributionId: `contribution-${index}`,
    targetKind: "program",
    targetId: `program-${index}`,
    label: `Frozen subject ${index}`,
    basis: frozen.data.totals[0]!.basis,
    value: "9007199254740993.123456",
    disposition: "included",
    reason: "captured",
    sourceRevisionIds: ["revision-frozen"],
  }));
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    requests.push(key);
    if (key.endsWith("availability"))
      await route.fulfill({ json: { available: true } });
    else if (key.endsWith("pin"))
      await route.fulfill({
        json: {
          viewToken: "session",
          expiresAt: new Date(Date.now() + 1_800_000).toISOString(),
        },
      });
    else if (key.endsWith("dashboard")) await route.fulfill({ json: frozen });
    else throw new Error(`Unexpected operation ${key}`);
  });
  await page.goto("/research-sharing.html?mode=public");
  await page.getByLabel("PIN", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(
    page.getByText("Frozen subject 1", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Frozen subject 2", { exact: true })).toHaveCount(
    0,
  );
  const before = requests.length;
  await page
    .locator("summary")
    .filter({ hasText: "9007199254740993.123456" })
    .click();
  await page
    .locator("summary")
    .filter({ hasText: "Captured publisher" })
    .click();
  await expect(
    page.getByText("revision-frozen", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Captured section", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("37", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show all 2 rows" }).click();
  await expect(
    page.getByText("Frozen subject 2", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(before);
  await expect(
    page.getByText("Prepared for Synthetic client", { exact: false }),
  ).toBeVisible();
});

test("a retained unknown publication survives reload and is isolated to its Core actor", async ({
  page,
}) => {
  const actor = {
    enabled: true,
    userId: "10000000-0000-4000-8000-000000000006",
  };
  await sharingApi(page, actor);
  const publications: unknown[] = [];
  let operationKey: string | undefined;
  let reads = 0;
  await page.route(
    "**/api/capiro/research.shareLinks.publish",
    async (route) => {
      const request = route.request().postDataJSON();
      publications.push(request);
      operationKey = request.body.operationKey;
      await route.abort("failed");
    },
  );
  await page.route(
    "**/api/capiro/research.shareLinks.operation?*",
    async (route) => {
      reads += 1;
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input")!,
      );
      expect(input.params.operationKey).toBe(operationKey);
      await route.fulfill({ json: { link } });
    },
  );
  await page.goto("/research-sharing.html");
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  await page
    .getByLabel("I reviewed this frozen dashboard and everything it exposes.")
    .check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check publication result" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check publication result" }),
  ).toBeVisible();
  await expect(page.getByLabel("Client", { exact: true })).toBeDisabled();
  expect(publications).toHaveLength(1);
  expect(reads).toBe(0);
  actor.userId = "10000000-0000-4000-8000-000000000008";
  await page.reload();
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  await expect(
    page.getByLabel(
      "I reviewed this frozen dashboard and everything it exposes.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check publication result" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  actor.userId = "10000000-0000-4000-8000-000000000006";
  await page.reload();
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  await page.getByRole("button", { name: "Check publication result" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "one-time address was not received here",
  );
  expect(publications).toHaveLength(1);
  expect(reads).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    shareToken,
  );
});

test("unavailable publication recovery storage prevents a new write", async ({
  page,
}) => {
  const writes = await sharingApi(page, { enabled: true });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", { value: undefined }),
  );
  await page.goto("/research-sharing.html");
  await page.getByRole("button", { name: "Publish link", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Saved-command recovery is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  expect(
    writes.filter((row) => row.key === "research.shareLinks.publish"),
  ).toHaveLength(0);
});
