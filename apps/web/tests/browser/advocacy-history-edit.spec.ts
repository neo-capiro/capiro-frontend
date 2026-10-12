import { test, expect, type Page } from "@playwright/test";
import { json } from "./fixtures";
import {
  advocacyEvent,
  deferred,
  installAdvocacyHistory,
} from "./advocacy-history-fixtures";
import {
  advocacyIdentity,
  advocacyMatter,
  advocacyMatterId,
} from "../advocacy-history-fixtures";

const pagePath = "/advocacy-history.html";
const history = (page: Page) =>
  page.getByRole("region", { name: "Advocacy history", exact: true });
const events = (page: Page) =>
  history(page).getByRole("list", { name: "Loaded advocacy events" });
async function openEdit(page: Page) {
  await page.goto(`${pagePath}?matter=${advocacyMatterId}`);
  const detail = page.getByRole("dialog", {
    name: advocacyMatter.title,
    exact: true,
  });
  await detail
    .getByRole("button", { name: "Edit matter", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: /^Edit (advocacy )?matter$/ });
  await expect(edit).toBeVisible();
  return edit;
}
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test("baseline: dated timeline reveals only withheld loaded events and preserves undated evidence", async ({
  page,
}, info) => {
  const { unexpected } = await installAdvocacyHistory(page);
  await page.goto(pagePath);
  await expect(events(page).getByRole("listitem")).toHaveCount(5);
  await expect(history(page)).toContainText("6 loaded events");
  await expect(events(page)).toContainText("Oct 9, 2026");
  await expect(events(page)).toContainText("INFERRED · Confidence 74%");
  await expect(
    events(page).getByRole("button", { name: /Synthetic unassigned record/ }),
  ).toHaveCount(0);
  await history(page)
    .getByRole("button", { name: "View all 6 loaded events" })
    .click();
  await expect(events(page).getByRole("listitem")).toHaveCount(6);
  await expect(events(page)).toContainText("Undated");
  await expect(
    history(page).getByRole("button", { name: /View all/ }),
  ).toHaveCount(0);
  const icon = events(page).locator("img").first();
  await expect(icon).toHaveAttribute("width", "16");
  const size = await icon.evaluate((image: HTMLImageElement) => ({
    natural: image.naturalWidth,
    rendered: image.getBoundingClientRect().width,
  }));
  expect(size).toEqual({ natural: 16, rendered: 14 });
  await page.screenshot({
    path: info.outputPath("advocacy-timeline-desktop.png"),
    fullPage: true,
  });
  await expect(history(page)).toHaveCSS("padding", "20px");
  await expect(history(page)).toHaveCSS("border-radius", "12px");
  expect(unexpected).toEqual([]);
});

test("baseline: search and status operate on native title summary PE and bill fields", async ({
  page,
}) => {
  const { unexpected, state } = await installAdvocacyHistory(page);
  await page.goto(pagePath);
  const section = history(page);
  await section.getByRole("button", { name: "Matters", exact: true }).click();
  for (const term of ["FUNDING", "appropriation", "0604134a", "HR-987"]) {
    await section.getByLabel("Search advocacy history").fill(term);
    await expect(
      section.getByRole("button", { name: /Synthetic funding matter/ }),
    ).toHaveCount(1);
    await expect(
      section.getByRole("button", { name: /Synthetic regulatory matter/ }),
    ).toHaveCount(0);
  }
  await section.getByLabel("Search advocacy history").fill("");
  await section
    .getByLabel("Matter status", { exact: true })
    .selectOption("monitoring");
  await expect(
    section.getByRole("button", { name: /Synthetic funding matter/ }),
  ).toHaveCount(0);
  await section.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(events(page).getByRole("listitem")).toHaveCount(1);
  await expect(events(page)).toContainText("Synthetic correspondence");
  await expect(events(page)).not.toContainText("Synthetic unknown association");
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("baseline: failed timeline refresh conceals retained events while current matters stay reachable", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  await page.goto(pagePath);
  await expect(events(page).getByRole("listitem")).toHaveCount(5);
  state.timelineStatus = 503;
  await advocacyEvent(page, "refresh", "timeline");
  await expect(history(page)).toContainText("Synthetic timeline unavailable");
  await expect(events(page)).toHaveCount(0);
  await expect(history(page)).not.toContainText("No matching events");
  await history(page)
    .getByRole("button", { name: "Matters", exact: true })
    .click();
  await expect(
    history(page).getByRole("button", { name: /Synthetic funding matter/ }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("failed matter reads conceal retained rows but preserve independently current unfiltered events", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  await page.goto(pagePath);
  await history(page)
    .getByRole("button", { name: "Matters", exact: true })
    .click();
  await expect(
    history(page).getByRole("button", { name: /Synthetic funding matter/ }),
  ).toBeVisible();
  state.listStatus = 503;
  await advocacyEvent(page, "refresh", "matters");
  await expect(history(page)).toContainText(
    "Synthetic matter list unavailable",
  );
  await expect(
    history(page).getByRole("button", { name: /Synthetic funding matter/ }),
  ).toHaveCount(0);
  await expect(
    history(page).getByLabel("Search advocacy history"),
  ).toBeDisabled();
  await history(page)
    .getByRole("button", { name: "Timeline", exact: true })
    .click();
  await expect(events(page).getByRole("listitem")).toHaveCount(5);
  expect(unexpected).toEqual([]);
});

test("a selected status cannot join stale matter data after catalog failure", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  await page.goto(pagePath);
  await history(page)
    .getByLabel("Matter status", { exact: true })
    .selectOption("active");
  await expect(events(page).getByRole("listitem")).toHaveCount(3);
  state.listStatus = 503;
  await advocacyEvent(page, "refresh", "matters");
  await expect(history(page)).toContainText(
    "selected filters need a current matter list",
  );
  await expect(events(page)).toHaveCount(0);
  await expect(
    history(page).getByLabel("Matter status", { exact: true }),
  ).toHaveValue("active");
  await expect(history(page)).not.toContainText("No matching events");
  await expect(history(page)).toContainText(
    "Synthetic matter list unavailable",
  );
  state.listStatus = 200;
  await history(page)
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(events(page).getByRole("listitem")).toHaveCount(3);
  expect(unexpected).toEqual([]);
});

test("exact requested detail remains independent of a failed timeline and refuses another matter receipt", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  state.timelineStatus = 503;
  await page.goto(`${pagePath}?matter=${advocacyMatterId}`);
  const detail = page.getByRole("dialog", {
    name: advocacyMatter.title,
    exact: true,
  });
  await expect(
    detail.getByRole("button", { name: "Edit matter" }),
  ).toBeEnabled();
  state.wrongDetail = true;
  await advocacyEvent(page, "refresh", "matter");
  await expect(page.getByRole("dialog")).toContainText(
    "unexpected matter identity",
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    "Sensor appropriation review",
  );
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Edit matter" }),
  ).toHaveCount(0);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("invalidated timeline success is not displayed as current", async ({
  page,
}) => {
  const { unexpected } = await installAdvocacyHistory(page);
  await page.goto(pagePath);
  await expect(events(page).getByRole("listitem")).toHaveCount(5);
  await advocacyEvent(page, "invalidate", "timeline");
  await expect(events(page)).toHaveCount(0);
  await expect(history(page)).not.toContainText("No matching events");
  expect(unexpected).toEqual([]);
});

for (const status of ["successful", "partially_successful", "unsuccessful"]) {
  test(`baseline: final ${status} requires explicit judgment and exact native confirmation body`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAdvocacyHistory(page);
    const dialog = await openEdit(page);
    const statusField = dialog.getByRole("combobox", { name: /^Status/ });
    await expect(statusField).toBeVisible();
    await expect(statusField.locator(`option[value="${status}"]`)).toHaveCount(
      1,
    );
    await statusField.selectOption(status);
    const save = dialog.getByRole("button", { name: /Save (changes|matter)/ });
    await expect(save).toBeDisabled();
    await expect(dialog).toContainText("explicit human judgment");
    expect(state.writes).toEqual([]);
    await dialog.getByRole("checkbox").check();
    await save.click();
    await expect(dialog).not.toBeVisible();
    expect(state.writes).toEqual([
      {
        method: "PATCH",
        path: `/${advocacyMatterId}`,
        body: {
          title: advocacyMatter.title,
          summary: advocacyMatter.summary,
          status,
          confirmOutcome: true,
        },
      },
    ]);
    expect(
      state.reads.filter((path) => path === `/${advocacyMatterId}`).length,
    ).toBeGreaterThanOrEqual(3);
    expect(unexpected).toEqual([]);
  });
}

for (const evidence of ["linked", "unchanged-final"] as const) {
  test(`${evidence} status edit follows native outcome evidence semantics`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAdvocacyHistory(page);
    state.matters[0] = {
      ...advocacyMatter,
      ...(evidence === "linked"
        ? {
            links: [
              {
                id: "native-outcome",
                linkType: "outcome_event",
                linkKey: "source-outcome",
                label: null,
              },
            ],
          }
        : { status: "successful" }),
    };
    const dialog = await openEdit(page);
    await dialog
      .getByLabel("Status", { exact: true })
      .selectOption("successful");
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await dialog
      .getByLabel("Title", { exact: true })
      .fill("Updated synthetic matter");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).not.toBeVisible();
    expect(state.writes[0]?.body).toEqual({
      title: "Updated synthetic matter",
      summary: advocacyMatter.summary,
      status: "successful",
    });
    expect(unexpected).toEqual([]);
  });
}

test("legacy current status remains editable without offering other legacy transitions", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  state.matters[0] = { ...advocacyMatter, status: "open" };
  const dialog = await openEdit(page);
  await expect(
    dialog.getByRole("option", { name: "open (legacy)", exact: true }),
  ).toHaveCount(1);
  await expect(
    dialog.getByRole("option", { name: /resolved|stalled/ }),
  ).toHaveCount(0);
  await dialog
    .getByLabel("Summary", { exact: true })
    .fill("Legacy matter reviewed");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes[0]?.body.status).toBe("open");
  expect(unexpected).toEqual([]);
});

test("fresh native source changes retain the draft and stop dispatch", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  const dialog = await openEdit(page);
  await dialog
    .getByLabel("Summary", { exact: true })
    .fill("Retained local review");
  state.matters[0] = {
    ...advocacyMatter,
    summary: "Changed by another reviewer",
  };
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "differs from your review",
  );
  await expect(dialog.getByLabel("Summary", { exact: true })).toHaveValue(
    "Retained local review",
  );
  expect(state.writes).toEqual([]);
  await expect(
    dialog.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Reload current details" }).click();
  await expect(dialog).toContainText("Changed by another reviewer");
  await expect(dialog.getByLabel("Summary", { exact: true })).toHaveValue(
    "Retained local review",
  );
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]?.body.summary).toBe("Retained local review");
  expect(unexpected).toEqual([]);
});

test("a definite native refusal allows an explicit retry without a false success", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  state.write = (route) =>
    json(route, { message: "Synthetic role refusal" }, 403);
  const dialog = await openEdit(page);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText("permission");
  await expect(
    dialog.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();
  await expect(dialog).not.toContainText("submitted result is unknown");
  expect(state.writes).toHaveLength(1);
  state.write = null;
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(unexpected).toEqual([]);
});

test("unexpected acknowledgement remains unknown and reconciles by GET without replay", async ({
  page,
}) => {
  const { state, unexpected, apply } = await installAdvocacyHistory(page);
  state.write = async (route) => {
    apply(route);
    await json(route, { id: advocacyMatterId });
  };
  const dialog = await openEdit(page);
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Reviewed title without native acknowledgement");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toContainText("submitted result is unknown");
  await expect(
    dialog.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Check current result" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(history(page)).toContainText(
    "original response was not acknowledged",
  );
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("void acknowledgement cannot replace wrong-field readback with a success claim", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  state.write = (route) => route.fulfill({ status: 204, body: "" });
  const dialog = await openEdit(page);
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Reviewed title requiring readback");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toContainText("submitted result is unknown");
  await dialog.getByRole("button", { name: "Check current result" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "does not confirm all reviewed changes",
  );
  await expect(dialog).toBeVisible();
  expect(state.writes).toHaveLength(1);
  state.matters[0] = {
    ...advocacyMatter,
    title: "Reviewed title requiring readback",
  };
  await dialog.getByRole("button", { name: "Check current result" }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("another matter returned after PATCH remains unknown without late invalidation", async ({
  page,
}) => {
  const { state, unexpected, apply } = await installAdvocacyHistory(page);
  state.write = async (route) => {
    apply(route);
    state.wrongDetail = true;
    await route.fulfill({ status: 204, body: "" });
  };
  const dialog = await openEdit(page);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toContainText("submitted result is unknown");
  await expect(dialog.getByRole("alert")).toContainText(
    "unexpected matter identity",
  );
  expect(state.writes).toHaveLength(1);
  expect(state.reads.filter((path) => path === "")).toHaveLength(2);
  expect(unexpected).toEqual([]);
});

for (const change of [
  "actor",
  "role",
  "source",
  "client",
  "unmount",
] as const) {
  test(`delayed preflight cannot dispatch after ${change} changes`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAdvocacyHistory(page);
    const dialog = await openEdit(page);
    const gate = deferred();
    state.listGate = gate.promise;
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect.poll(() => state.gatedLists).toBe(1);
    // A replacement actor makes an independent read; only hold this preflight.
    if (change === "actor") state.listGate = null;
    if (change === "role")
      await advocacyEvent(page, "identity", {
        ...advocacyIdentity,
        role: "standard_user",
      });
    else if (change === "actor")
      await advocacyEvent(page, "identity", {
        ...advocacyIdentity,
        user: { ...advocacyIdentity.user, id: "replacement-user" },
      });
    else if (change === "source")
      await advocacyEvent(page, "invalidate", "matter");
    else if (change === "client")
      await advocacyEvent(
        page,
        "client",
        "10000000-0000-4000-8000-000000000002",
      );
    else await advocacyEvent(page, "unmount");
    gate.release();
    await expect.poll(() => state.completedLists).toBe(1);
    await settle(page);
    expect(state.writes).toEqual([]);
    if (change === "unmount" || change === "client" || change === "actor")
      await expect(dialog).not.toBeVisible();
    else
      await expect(
        dialog.getByRole("button", { name: "Save changes" }),
      ).toBeDisabled();
    if (change === "role")
      await expect(dialog.getByLabel("Title", { exact: true })).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
}

test("closing after dispatch preserves the original attempt across reopen and does not replay", async ({
  page,
}) => {
  const { state, unexpected, apply } = await installAdvocacyHistory(page);
  const gate = deferred();
  state.write = async (route) => {
    await gate.promise;
    apply(route);
    await route.fulfill({ status: 204, body: "" }).catch(() => {});
  };
  const dialog = await openEdit(page);
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Dispatched reviewed title");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  const detail = page.getByRole("dialog", {
    name: advocacyMatter.title,
    exact: true,
  });
  await detail
    .getByRole("button", { name: "Edit matter", exact: true })
    .click();
  const reopened = page.getByRole("dialog", {
    name: "Edit advocacy matter",
    exact: true,
  });
  await expect(reopened).toContainText("submitted result is unknown");
  await expect(reopened.getByLabel("Title", { exact: true })).toHaveValue(
    "Dispatched reviewed title",
  );
  gate.release();
  await settle(page);
  await expect(
    reopened.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await reopened.getByRole("button", { name: "Check current result" }).click();
  await expect(reopened).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a late role response cannot refresh or clear the initiating actor's uncertain save", async ({
  page,
}) => {
  const { state, unexpected, apply } = await installAdvocacyHistory(page);
  const gate = deferred();
  state.write = async (route) => {
    await gate.promise;
    apply(route);
    await route.fulfill({ status: 204, body: "" }).catch(() => {});
  };
  const dialog = await openEdit(page);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await advocacyEvent(page, "identity", {
    ...advocacyIdentity,
    role: "standard_user",
  });
  await expect(dialog).toContainText("submitted result is unknown");
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveCount(0);
  const reads = state.reads.length;
  gate.release();
  await settle(page);
  expect(state.reads).toHaveLength(reads);
  await expect(
    dialog.getByRole("button", { name: "Check current result" }),
  ).toBeDisabled();
  await advocacyEvent(page, "identity", advocacyIdentity);
  await expect(
    dialog.getByRole("button", { name: "Check current result" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Check current result" }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("timeline and outcome review match phone geometry with keyboard cancellation", async ({
  page,
}, info) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pagePath);
  await expect(events(page).getByRole("listitem")).toHaveCount(5);
  expect(
    await history(page).evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("advocacy-timeline-phone.png"),
    fullPage: true,
  });
  await expect(history(page)).toHaveCSS("padding", "20px");
  await expect(history(page)).toHaveCSS("border-radius", "12px");
  const dialog = await openEdit(page);
  await dialog.getByLabel("Status", { exact: true }).selectOption("successful");
  const bounds = await dialog.boundingBox();
  if (!bounds) throw new Error("Outcome review geometry missing");
  expect(bounds.width).toBe(358);
  expect(bounds.y).toBeGreaterThanOrEqual(16);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(828);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("advocacy-outcome-phone.png"),
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("desktop outcome review uses the exact Figma frame dimensions", async ({
  page,
}, info) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  const dialog = await openEdit(page);
  await dialog
    .getByLabel("Status", { exact: true })
    .selectOption("unsuccessful");
  const bounds = await dialog.boundingBox();
  expect(bounds?.width).toBe(560);
  expect(bounds?.y).toBe(120);
  await page.screenshot({
    path: info.outputPath("advocacy-outcome-desktop.png"),
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("interrupted actor lifetime prevents a held save after same-callback identity restoration", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  const dialog = await openEdit(page);
  const gate = deferred();
  state.listGate = gate.promise;
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => state.gatedLists).toBe(1);
  await advocacyEvent(page, "interrupt-identity", "invalidate");
  gate.release();
  await expect.poll(() => state.completedLists).toBe(1);
  await expect(
    dialog.getByRole("button", { name: "Saving…", exact: true }),
  ).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
  await expect(dialog).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("interrupted actor lifetime prevents a held result check after same-callback role restoration", async ({
  page,
}) => {
  const { state, unexpected, apply } = await installAdvocacyHistory(page);
  state.write = async (route) => {
    apply(route);
    await json(route, { message: "Synthetic acknowledgement lost" }, 503);
  };
  const dialog = await openEdit(page);
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Submitted lifetime review");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toContainText("submitted result is unknown");
  const gate = deferred();
  state.detailGate = gate.promise;
  await dialog.getByRole("button", { name: "Check current result" }).click();
  await expect.poll(() => state.gatedDetails).toBe(1);
  await advocacyEvent(page, "interrupt-identity", "role");
  gate.release();
  await expect.poll(() => state.completedDetails).toBeGreaterThanOrEqual(1);
  await expect(
    dialog.getByRole("button", { name: "Saving…", exact: true }),
  ).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("submitted result is unknown");
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("interrupted actor lifetime prevents a held review reload after same-callback identity restoration", async ({
  page,
}) => {
  const { state, unexpected } = await installAdvocacyHistory(page);
  const dialog = await openEdit(page);
  state.matters[0] = {
    ...advocacyMatter,
    summary: "New saved source for lifetime review",
  };
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "differs from your review",
  );
  const gate = deferred();
  state.listGate = gate.promise;
  await dialog.getByRole("button", { name: "Reload current details" }).click();
  await expect.poll(() => state.gatedLists).toBe(1);
  await advocacyEvent(page, "interrupt-identity", "invalidate");
  gate.release();
  await expect.poll(() => state.completedLists).toBe(1);
  await expect(
    dialog.getByRole("button", { name: "Saving…", exact: true }),
  ).toHaveCount(0);
  await expect(dialog).not.toContainText("Current details reloaded.");
  await expect(
    dialog.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(0);
  expect(unexpected).toEqual([]);
});
