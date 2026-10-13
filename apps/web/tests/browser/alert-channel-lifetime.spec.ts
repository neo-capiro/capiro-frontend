import { test, expect } from "@playwright/test";
import {
  alertDialog,
  alertEvent,
  installAlertChannels,
  openAlerts,
  json,
} from "./alert-channel-helpers";
import { trackerIdentity, trackerClientId } from "../alert-channel-fixtures";

for (const action of ["start", "test"] as const)
  test(`an unknown ${action} attempt survives close and requires deliberate review before another dispatch`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(
      page,
      "intelligence",
    );
    state[action] = (route) =>
      json(route, { message: "Synthetic lost response" }, 502);
    let dialog = await openAlerts(page, "intelligence");
    const label =
      action === "start" ? "Request verification code" : "Send test alert";
    const unknown =
      action === "start"
        ? /verification request could not be confirmed/
        : /The test result is unknown/;
    const review =
      action === "start" ? "Review another request" : "Review another test";
    await dialog.getByRole("button", { name: label, exact: true }).click();
    await expect(dialog.getByText(unknown)).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await alertEvent(page, "alert-test-open");
    dialog = alertDialog(page);
    await expect(dialog.getByText(unknown)).toBeVisible();
    expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(
      1,
    );
    await dialog.getByRole("button", { name: review, exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: label, exact: true }),
    ).toBeEnabled();
    expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(
      1,
    );
    await dialog.getByRole("button", { name: label, exact: true }).click();
    await expect(dialog.getByText(unknown)).toBeVisible();
    expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(
      2,
    );
    expect(unexpected).toEqual([]);
  });

for (const action of ["start", "test"] as const)
  for (const transition of ["actor", "client", "owner", "close"] as const)
    test(`a late ${action} receipt cannot publish after ${transition} change`, async ({
      page,
    }) => {
      const { state, unexpected } = await installAlertChannels(
        page,
        "intelligence",
      );
      let release: (() => void) | undefined;
      let completed = false;
      state[action] = async (route) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        await json(
          route,
          action === "start"
            ? { dormant: false, masked: "••• ••• 0123" }
            : [{ channel: "email", status: "sent" }],
        );
        completed = true;
      };
      const dialog = await openAlerts(page, "intelligence");
      await dialog
        .getByRole("button", {
          name:
            action === "start"
              ? "Request verification code"
              : "Send test alert",
          exact: true,
        })
        .click();
      await expect
        .poll(() => state.calls.filter((call) => call.method === "POST").length)
        .toBe(1);
      if (transition === "actor")
        await alertEvent(page, "alert-test-identity", {
          ...trackerIdentity,
          role: "client_portal_user",
        });
      else if (transition === "client")
        await alertEvent(
          page,
          "alert-test-client",
          "10000000-0000-4000-8000-000000000002",
        );
      else if (transition === "owner")
        await alertEvent(page, "alert-test-owner", "core");
      else await alertEvent(page, "alert-test-close");
      release?.();
      await expect.poll(() => completed).toBe(true);
      await expect(
        page.getByText(/Request acknowledged for|Email · Provider accepted/),
      ).toHaveCount(0);
      expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(
        1,
      );
      expect(unexpected).toEqual([]);
    });

for (const target of ["identity", "client", "preferences"] as const)
  test(`a test action latches a same-callback ${target} interruption even after the source is restored`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(page, "core");
    let release: (() => void) | undefined;
    let completed = false;
    state.test = async (route) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await json(route, [{ channel: "email", status: "sent" }]);
      completed = true;
    };
    let dialog = await openAlerts(page, "core");
    await dialog
      .getByRole("button", { name: "Send test alert", exact: true })
      .click();
    await expect
      .poll(() => state.calls.filter((call) => call.method === "POST").length)
      .toBe(1);
    await alertEvent(page, "alert-test-flap", target);
    release?.();
    await expect.poll(() => completed).toBe(true);
    await expect(dialog.getByText("Email · Provider accepted")).toHaveCount(0);
    if (target === "identity") {
      await expect(dialog.getByText(/Your account changed/)).toBeVisible();
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await alertEvent(page, "alert-test-open");
      dialog = alertDialog(page);
    }
    await expect(dialog.getByText(/The test result is unknown/)).toBeVisible();
    expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(
      1,
    );
    expect(unexpected).toEqual([]);
  });

test("a late confirmation cannot trigger a saved-state read after the client lifetime ends", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  let release: (() => void) | undefined;
  let completed = false;
  state.confirm = async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await json(route, { verified: true, phone: "+12025550123" });
    completed = true;
  };
  const dialog = await openAlerts(page, "core");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  await dialog.getByLabel("Verification code", { exact: true }).fill("123456");
  await dialog
    .getByRole("button", { name: "Confirm phone", exact: true })
    .click();
  await expect
    .poll(() => state.calls.filter((call) => call.action === "confirm").length)
    .toBe(1);
  await alertEvent(page, "alert-test-close");
  release?.();
  await expect.poll(() => completed).toBe(true);
  expect(
    state.calls.filter((call) => call.action === "preferences"),
  ).toHaveLength(1);
  await expect(
    page.getByText(
      "Phone verified and SMS alerts enabled in the saved preferences.",
    ),
  ).toHaveCount(0);
  await alertEvent(page, "alert-test-client", trackerClientId);
  await alertEvent(page, "alert-test-open");
  await expect(
    alertDialog(page).getByText(/verification request could not be confirmed/),
  ).toBeVisible();
  expect(state.calls.filter((call) => call.action === "confirm")).toHaveLength(
    1,
  );
  expect(unexpected).toEqual([]);
});

test("a pending channel action disables preference edits and other channel effects", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  let release: (() => void) | undefined;
  state.test = async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await json(route, [{ channel: "email", status: "sent" }]);
  };
  const dialog = await openAlerts(page, "core");
  await dialog
    .getByRole("button", { name: "Send test alert", exact: true })
    .click();
  await expect
    .poll(() => state.calls.filter((call) => call.method === "POST").length)
    .toBe(1);
  await expect(
    dialog.getByLabel("Phone number", { exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", {
      name: "Request verification code",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  expect(state.calls.filter((call) => call.method !== "GET")).toHaveLength(1);
  release?.();
  await expect(dialog.getByText("Email · Provider accepted")).toBeVisible();
  await expect(
    dialog.getByLabel("Phone number", { exact: true }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});
