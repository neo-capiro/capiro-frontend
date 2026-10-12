import { expect, test, type Page } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  committee,
  subcommittee,
  installGovernmentFixtures,
} from "./government-fixtures";

const path = `/portfolio/${clientId}/relationships?kind=government`;
const armed = { ...committee, name: "Armed Services" };
const tactical = { ...subcommittee, name: "Tactical Air and Land Forces" };
const houseAppropriations = {
  ...armed,
  id: "house-appropriations",
  officeId: 3,
  name: "Appropriations",
};
const defense = {
  ...tactical,
  id: "house-defense",
  officeId: 4,
  parentOfficeId: 3,
  name: "Defense",
};
const senateArmed = {
  ...armed,
  id: "senate-armed",
  officeId: 5,
  chamber: "Senate",
};
const senateAirland = {
  ...tactical,
  id: "senate-airland",
  officeId: 6,
  parentOfficeId: 5,
  chamber: "Senate",
  name: "Airland",
};
const rows = [
  armed,
  tactical,
  houseAppropriations,
  defense,
  senateArmed,
  senateAirland,
];

async function openPicker(page: Page) {
  const unexpected = await installGovernmentFixtures(page);
  const staffReads: string[] = [];
  await page.route("**/directory/committees?**", (route) =>
    json(route, {
      committees: rows,
      total: rows.length,
      page: 1,
      pageSize: 200,
    }),
  );
  await page.route("**/directory/committees/*/staff?**", (route) => {
    const selectedId = new URL(route.request().url()).pathname
      .split("/")
      .at(-2)!;
    staffReads.push(selectedId);
    return json(route, {
      committee: rows.find((row) => row.id === selectedId),
      staff: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });
  await page.goto(path);
  await page
    .getByRole("button", { name: "Add committee staff", exact: true })
    .click();
  const trigger = page.getByRole("button", {
    name: /^Committee \/ subcommittee/,
  });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  return {
    picker: page.getByRole("dialog", {
      name: "Choose a committee",
      exact: true,
    }),
    trigger,
    staffReads,
    unexpected,
  };
}

test("committee branches navigate without selecting; Done commits one exact parent or child", async ({
  page,
}) => {
  const { picker, trigger, staffReads, unexpected } = await openPicker(page);
  await picker.getByRole("button", { name: "Open House", exact: true }).click();
  await expect(
    picker.getByText("All committees › House", { exact: true }),
  ).toBeVisible();
  expect(staffReads).toEqual([]);
  await picker
    .getByRole("button", { name: "Select House / Armed Services", exact: true })
    .click();
  await expect(
    picker.getByRole("button", {
      name: "Select House / Armed Services",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(staffReads).toEqual([]);
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect(trigger).toContainText("House / Armed Services");
  await expect.poll(() => staffReads).toEqual([armed.id]);
  await trigger.click();
  await picker.getByRole("button", { name: "Open House", exact: true }).click();
  await picker
    .getByRole("button", {
      name: "Open House / Armed Services subcommittees",
      exact: true,
    })
    .click();
  await expect(
    picker.getByText("All committees › House › Armed Services", {
      exact: true,
    }),
  ).toBeVisible();
  expect(staffReads).toEqual([armed.id]);
  await picker
    .getByRole("button", {
      name: "Select House / Armed Services / Tactical Air and Land Forces",
      exact: true,
    })
    .click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect(trigger).toContainText(
    "House / Armed Services / Tactical Air and Land Forces",
  );
  await expect.poll(() => staffReads).toEqual([armed.id, tactical.id]);
  expect(unexpected).toEqual([]);
});

test("search carries the full parent path and Escape discards an uncommitted change", async ({
  page,
}) => {
  const { picker, trigger, staffReads, unexpected } = await openPicker(page);
  await picker
    .getByLabel("Search committees", { exact: true })
    .fill("tactical air");
  await expect(
    picker.getByText("House / Armed Services / Tactical Air and Land Forces", {
      exact: true,
    }),
  ).toBeVisible();
  await picker
    .getByRole("button", {
      name: "Select House / Armed Services / Tactical Air and Land Forces",
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  await expect(picker).not.toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Add relationship", exact: true }),
  ).toBeVisible();
  await expect(trigger).toContainText("Select a committee");
  await expect(trigger).toBeFocused();
  expect(staffReads).toEqual([]);
  await trigger.click();
  await picker.getByLabel("Search committees", { exact: true }).fill("SENATE");
  await expect(
    picker.getByRole("button", {
      name: "Select Senate / Armed Services",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    picker.getByRole("button", {
      name: "Select House / Armed Services",
      exact: true,
    }),
  ).toHaveCount(0);
  await picker
    .getByRole("button", {
      name: "Select Senate / Armed Services",
      exact: true,
    })
    .click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect.poll(() => staffReads).toEqual([senateArmed.id]);
  await trigger.click();
  await picker.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(picker.getByRole("status")).toHaveText(
    "Choose a committee or subcommittee",
  );
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect(trigger).toContainText("Select a committee");
  expect(staffReads).toEqual([senateArmed.id]);
  expect(unexpected).toEqual([]);
});

test("committee picker supports keyboard branch navigation and staged selection", async ({
  page,
}) => {
  const { picker, trigger, staffReads, unexpected } = await openPicker(page);
  await picker.getByLabel("Search committees", { exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    picker.getByRole("button", { name: "Open House", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    picker.getByRole("button", {
      name: "Select House / Appropriations",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    picker.getByRole("button", {
      name: "Select House / Armed Services",
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const child = picker.getByRole("button", {
    name: "Select House / Armed Services / Tactical Air and Land Forces",
    exact: true,
  });
  await expect(child).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(child).toHaveAttribute("aria-pressed", "true");
  expect(staffReads).toEqual([]);
  await page.keyboard.press("ArrowLeft");
  await expect(
    picker.getByText("All committees › House", { exact: true }),
  ).toBeVisible();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await expect(trigger).toContainText("Tactical Air and Land Forces");
  await expect.poll(() => staffReads).toEqual([tactical.id]);
  expect(unexpected).toEqual([]);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`committee picker keeps exact static icon sizes and readable layout on a phone in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    const { picker, unexpected } = await openPicker(page);
    await picker
      .getByRole("button", { name: "Open House", exact: true })
      .click();
    await expect(picker).toBeVisible();
    const geometry = await picker.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        right: box.right,
        width: box.width,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        images: [...element.querySelectorAll("img")].map((image) => ({
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          width: image.getBoundingClientRect().width,
          height: image.getBoundingClientRect().height,
        })),
      };
    });
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(390);
    expect(geometry.width).toBe(336);
    expect(geometry.scrollWidth).toBe(geometry.clientWidth);
    expect(geometry.images).toHaveLength(4);
    expect(
      geometry.images.every(
        (image) =>
          image.complete &&
          image.naturalWidth === 16 &&
          image.width === 16 &&
          image.height === 16,
      ),
    ).toBe(true);
    await picker.screenshot({
      path: `test-results/committee-picker-phone-${colorScheme}.png`,
    });
    expect(unexpected).toEqual([]);
  });
}
