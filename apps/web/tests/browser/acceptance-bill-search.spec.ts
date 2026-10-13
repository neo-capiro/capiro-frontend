import { expect, test } from "@playwright/test";
import {
  billSearchFixtures,
  billDialog,
  trackButton,
  openBillSearch,
  holdBillSearch,
  refreshBillSearch,
  recoveredBill,
  nextBillClient,
  assertCurrentTrack,
} from "./acceptance-bill-search-fixtures";

test("a held current search conceals old results and fences Track until the new response", async ({
  page,
}) => {
  const { state, unexpected } = await billSearchFixtures(page);
  await openBillSearch(page);
  state.rows = [recoveredBill];
  const release = holdBillSearch(state);
  try {
    await refreshBillSearch(page);
    await expect.poll(() => state.entered).toBe(2);
    await expect(billDialog(page).getByRole("radio")).toHaveCount(0);
    await expect(trackButton(page)).toBeDisabled();
    expect(state.writes).toEqual([]);
  } finally {
    release();
  }
  await expect(page.getByTestId("acceptance-bill-search-settled")).toHaveText(
    "1",
  );
  await expect(
    billDialog(page).getByRole("radio", { name: /HB 2/ }),
  ).toBeVisible();
  await expect(trackButton(page)).toBeDisabled();
  await assertCurrentTrack(page, state);
  expect(unexpected).toEqual([]);
});

for (const status of [403, 503]) {
  test(`a cached search followed by ${status} removes selection; held retry cannot resurrect it`, async ({
    page,
  }, info) => {
    const { state, unexpected } = await billSearchFixtures(page);
    await openBillSearch(page);
    state.status = status;
    await refreshBillSearch(page);
    await expect(page.getByTestId("acceptance-bill-search-settled")).toHaveText(
      "1",
    );
    await expect(billDialog(page).getByRole("alert")).toContainText(
      status === 403
        ? "You do not have permission for this operation."
        : "Synthetic search refused",
    );
    await info.attach("search-refusal-observation", {
      body: JSON.stringify({ reads: state.reads, writes: state.writes }),
      contentType: "application/json",
    });
    await expect(billDialog(page).getByRole("radio")).toHaveCount(0);
    await expect(trackButton(page)).toBeDisabled();
    state.status = 200;
    state.rows = [recoveredBill];
    const before = state.entered,
      release = holdBillSearch(state);
    try {
      await billDialog(page)
        .getByRole("button", { name: "Retry", exact: true })
        .click();
      await expect.poll(() => state.entered).toBe(before + 1);
      await expect(billDialog(page).getByRole("radio")).toHaveCount(0);
      await expect(trackButton(page)).toBeDisabled();
      expect(state.writes).toEqual([]);
    } finally {
      release();
    }
    await expect(
      billDialog(page).getByRole("radio", { name: /HB 2/ }),
    ).toBeVisible();
    await expect(trackButton(page)).toBeDisabled();
    await assertCurrentTrack(page, state);
    expect(unexpected).toEqual([]);
  });
}

test("a successful empty reread cannot keep an absent bill selected for tracking", async ({
  page,
}) => {
  const { state, unexpected } = await billSearchFixtures(page);
  await openBillSearch(page);
  state.rows = [];
  await refreshBillSearch(page);
  await expect(page.getByTestId("acceptance-bill-search-settled")).toHaveText(
    "1",
  );
  await expect(billDialog(page).getByText("No matching bills.")).toBeVisible();
  await expect(billDialog(page).getByRole("radio")).toHaveCount(0);
  await expect(trackButton(page)).toBeDisabled();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

for (const change of ["query", "jurisdiction"]) {
  test(`${change} replacement clears prior selection while its new search is held`, async ({
    page,
  }) => {
    const { state, unexpected } = await billSearchFixtures(page);
    await openBillSearch(page);
    state.rows = [recoveredBill];
    const release = holdBillSearch(state);
    try {
      if (change === "query") {
        await billDialog(page).getByLabel("Bill number or title").fill("HB 2");
        await billDialog(page)
          .getByRole("button", { name: "Search", exact: true })
          .click();
      } else await billDialog(page).getByLabel("TX", { exact: true }).check();
      await expect.poll(() => state.entered).toBe(2);
      await expect(trackButton(page)).toBeDisabled();
      await expect(billDialog(page).getByRole("radio")).toHaveCount(0);
    } finally {
      release();
    }
    await expect(
      billDialog(page).getByRole("radio", { name: /HB 2/ }),
    ).toBeVisible();
    await expect(trackButton(page)).toBeDisabled();
    expect(state.reads[1]).toMatchObject(
      change === "query"
        ? { query: "HB 2", jurisdictions: ["US"] }
        : { query: "HB 1", jurisdictions: ["US", "TX"] },
    );
    await assertCurrentTrack(page, state);
    expect(unexpected).toEqual([]);
  });
}

test("client replacement cancels a held former-client search and starts with no selection", async ({
  page,
}, info) => {
  const { state, unexpected } = await billSearchFixtures(page);
  await openBillSearch(page);
  const release = holdBillSearch(state);
  const aborted = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url().includes("/bill-search?"),
  });
  try {
    await refreshBillSearch(page);
    await expect.poll(() => state.entered).toBe(2);
    await page.evaluate(
      (client) =>
        window.dispatchEvent(
          new CustomEvent("acceptance-bill-search-client", { detail: client }),
        ),
      nextBillClient,
    );
    await expect(billDialog(page)).toHaveCount(0);
    expect((await aborted).failure()?.errorText).toContain("ERR_ABORTED");
  } finally {
    release();
  }
  await expect.poll(() => state.offered).toBe(2);
  state.rows = [recoveredBill];
  await page.getByRole("button", { name: "Track bill", exact: true }).click();
  await expect(billDialog(page).getByRole("radio")).toHaveCount(0);
  await expect(trackButton(page)).toBeDisabled();
  await billDialog(page).getByLabel("Bill number or title").fill("HB 2");
  await billDialog(page)
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await assertCurrentTrack(page, state, nextBillClient);
  await info.attach("client-read-scope", {
    body: JSON.stringify(state.reads),
    contentType: "application/json",
  });
  expect(state.reads.at(-1)?.client).toBe(nextBillClient);
  expect(unexpected).toEqual([]);
});
