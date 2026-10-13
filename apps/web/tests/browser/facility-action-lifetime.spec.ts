import { test, expect, type Page } from "@playwright/test";
import { json } from "./fixtures";
import {
  installProfileCurrentState,
  profileEvent,
} from "./profile-current-state-fixtures";
import {
  profileFacility,
  profileIdentity,
} from "../profile-current-state-fixtures";

const addressFacility = {
  ...profileFacility,
  addressLine: "1 Test Street",
  zip: "78701",
};
const revision = (character: string) => `v1:${character.repeat(64)}`;
const candidate = (label: string) => ({
  matchedAddress: label,
  congressionalDistrict: "10",
  state: "TX",
  latitude: 30.27,
  longitude: -97.74,
});
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function openAddress(page: Page) {
  await page.getByRole("button", { name: /Synthetic profile lab/ }).click();
  return page.getByRole("region", { name: "Address resolution", exact: true });
}
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test("a facility action refuses another tenant's otherwise matching receipt", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [addressFacility];
  state.write = (route) =>
    json(route, { ...addressFacility, tenantId: "other-tenant" });
  await page.goto("/profile-current-state.html?mode=facilities");
  const section = await openAddress(page);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  await expect(section.getByText(/Retry requested/)).not.toBeVisible();
  await expect(
    section.getByRole("button", { name: "Retry geocoding" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a definite facility action refusal remains a deliberate retry without claiming success", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [addressFacility];
  await page.goto("/profile-current-state.html?mode=facilities");
  const section = await openAddress(page);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect(section.getByRole("alert")).toBeVisible();
  await expect(
    section.getByText(/action result is unknown/i),
  ).not.toBeVisible();
  await expect(
    section.getByRole("button", { name: "Retry geocoding" }),
  ).toBeEnabled();
  await expect(section.getByText(/Retry requested/)).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("an uncertain facility action needs a current GET review before a new explicit request", async ({
  page,
}, testInfo) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [addressFacility];
  state.write = (route) =>
    json(route, { message: "Synthetic unknown geocode result" }, 503);
  await page.goto("/profile-current-state.html?mode=facilities");
  const section = await openAddress(page);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  await expect(
    section.getByRole("button", { name: "Resolve district" }),
  ).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath("address-action-unknown-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = page.getByRole("dialog", { name: "Synthetic profile lab" });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await section
    .getByRole("button", { name: "Review current address resolution" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("address-action-unknown-phone.png"),
  });
  const reads = state.reads.facilities;
  await section
    .getByRole("button", { name: "Review current address resolution" })
    .click();
  await expect.poll(() => state.reads.facilities).toBeGreaterThan(reads);
  await expect(
    section.getByText(/earlier provider request may still be running/i),
  ).toBeVisible();
  await expect(
    section.getByRole("button", { name: "Retry geocoding" }),
  ).toBeEnabled();
  expect(state.writes).toHaveLength(1);
  state.write = (route) => json(route, addressFacility);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect(section.getByText(/Retry requested/)).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(
    state.writes.every(
      (write) => write.body === null && write.method === "POST",
    ),
  ).toBe(true);
  expect(unexpected).toEqual([]);
});

test("closing a pending geocode view retains uncertainty without replay when reopened", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [addressFacility];
  const pending = deferred();
  state.write = async (route) => {
    await pending.promise;
    await json(route, addressFacility).catch(() => {});
  };
  await page.goto("/profile-current-state.html?mode=facilities");
  let section = await openAddress(page);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await page
    .getByRole("dialog", { name: "Synthetic profile lab" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  section = await openAddress(page);
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  pending.release();
  await settle(page);
  await expect(
    section.getByRole("button", { name: "Retry geocoding" }),
  ).toBeDisabled();
  await expect(section.getByText(/Retry requested/)).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a refreshed facility source aborts obsolete action effects and retains the new address", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [addressFacility];
  const pending = deferred();
  const aborted: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.url().endsWith("/geocode"))
      aborted.push(request.failure()?.errorText ?? "Failed");
  });
  state.write = async (route) => {
    await pending.promise;
    await json(route, addressFacility).catch(() => {});
  };
  await page.goto("/profile-current-state.html?mode=facilities");
  const section = await openAddress(page);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  state.facilities = [{ ...addressFacility, addressLine: "2 Current Street" }];
  await profileEvent(page, "refresh");
  await expect(
    page.getByRole("dialog", { name: "Synthetic profile lab" }),
  ).toContainText("2 Current Street");
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  await expect.poll(() => aborted.length).toBe(1);
  const reads = state.reads.facilities;
  pending.release();
  await settle(page);
  expect(state.reads.facilities).toBe(reads);
  await expect(section.getByText(/Retry requested/)).not.toBeVisible();
  await expect(
    section.getByRole("button", { name: "Retry geocoding" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a failed current review cannot erase an uncertain facility action", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [addressFacility];
  state.write = (route) =>
    json(route, { message: "Synthetic unknown result" }, 503);
  await page.goto("/profile-current-state.html?mode=facilities");
  let section = await openAddress(page);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  state.facilitiesStatus = 403;
  await section
    .getByRole("button", { name: "Review current address resolution" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Synthetic profile lab" }),
  ).not.toBeVisible();
  state.facilitiesStatus = 200;
  await profileEvent(page, "refresh");
  section = await openAddress(page);
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  await expect(
    section.getByRole("button", { name: "Retry geocoding" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a late geocode receipt cannot clear the initiating actor's unknown fence", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [addressFacility];
  const pending = deferred();
  state.write = async (route) => {
    await pending.promise;
    await json(route, addressFacility).catch(() => {});
  };
  await page.goto("/profile-current-state.html?mode=facilities");
  let section = await openAddress(page);
  await section.getByRole("button", { name: "Retry geocoding" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await profileEvent(page, "identity", {
    ...profileIdentity,
    user: { ...profileIdentity.user, id: "replacement-user" },
  });
  await expect(
    page.getByRole("dialog", { name: "Synthetic profile lab" }),
  ).not.toBeVisible();
  pending.release();
  await profileEvent(page, "identity", profileIdentity);
  section = await openAddress(page);
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  await expect(section.getByText(/Retry requested/)).not.toBeVisible();
  await expect(
    section.getByRole("button", { name: "Retry geocoding" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a late candidate conflict cannot refresh a newer reviewed snapshot", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.facilities = [
    {
      ...addressFacility,
      geocodeCandidateRevision: revision("a"),
      geocodeCandidates: [candidate("FIRST CANDIDATE")],
    },
  ];
  const pending = deferred();
  state.write = async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      candidateIndex: 0,
      expectedRevision: revision("a"),
    });
    await pending.promise;
    await json(route, { message: "Old candidate conflict" }, 409).catch(
      () => {},
    );
  };
  await page.goto("/profile-current-state.html?mode=facilities");
  const section = await openAddress(page);
  await section.getByRole("button", { name: "Use this address" }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  state.facilities = [
    {
      ...addressFacility,
      geocodeCandidateRevision: revision("b"),
      geocodeCandidates: [candidate("CURRENT CANDIDATE")],
    },
  ];
  await profileEvent(page, "refresh");
  await expect(section).toContainText("CURRENT CANDIDATE");
  const reads = state.reads.facilities;
  pending.release();
  await expect(section.getByText(/action result is unknown/i)).toBeVisible();
  await settle(page);
  expect(state.reads.facilities).toBe(reads);
  await expect(section).not.toContainText("Old candidate conflict");
  await expect(
    section.getByRole("button", { name: "Use this address" }),
  ).toBeDisabled();
  expect(state.writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});
