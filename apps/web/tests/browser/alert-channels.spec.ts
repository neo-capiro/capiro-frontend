import { test, expect } from "@playwright/test";
import {
  alertDialog,
  alertEvent,
  installAlertChannels,
  openAlerts,
  reloadAlerts,
  json,
} from "./alert-channel-helpers";
import {
  corePreferences,
  trackerIdentity,
  trackerActor,
} from "../alert-channel-fixtures";

test("baseline: Core preferences use database identity and preserve the full native no-echo PUT", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.identity = {
    ...trackerIdentity,
    user: { id: trackerActor.userId, email: "core@example.test" },
  };
  state.record = { ...corePreferences, smsPhoneVerified: true };
  const dialog = await openAlerts(page, "core");
  await expect(dialog.getByLabel("Jurisdictions")).toHaveCount(0);
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  expect(state.calls.filter((call) => call.method === "PUT")).toEqual([
    {
      owner: "core",
      method: "PUT",
      action: "preferences",
      body: { ...corePreferences, smsPhoneVerified: true, materiality: "high" },
    },
  ]);
  expect(state.calls.some((call) => call.owner === "intelligence")).toBe(false);
  expect(unexpected).toEqual([]);
});

test("baseline: Core phone edits clear the submitted verification flag without losing native criteria", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.record = { ...corePreferences, smsPhoneVerified: true };
  const dialog = await openAlerts(page, "core");
  await dialog.getByLabel("Phone number", { exact: true }).fill("+12025550124");
  await expect(
    dialog.getByText("Phone verification required before SMS delivery."),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  const write = state.calls.find((call) => call.method === "PUT")!;
  expect(write.body).toEqual({
    ...corePreferences,
    smsPhone: "+12025550124",
    smsPhoneVerified: false,
  });
  expect(unexpected).toEqual([]);
});

for (const owner of ["core", "intelligence"] as const) {
  test(`baseline: ${owner} verification uses exact explicit requests and reads the resulting SMS opt-in`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(page, owner);
    const dialog = await openAlerts(page, owner);
    await expect(
      dialog.getByRole("group", { name: "Test channels", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Confirming it enables SMS alerts/),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Request verification code", exact: true })
      .click();
    await expect(dialog.getByText(/Request acknowledged for/)).toBeVisible();
    await expect(dialog.getByText(/code sent|delivered/i)).toHaveCount(0);
    await dialog
      .getByLabel("Verification code", { exact: true })
      .fill("123456");
    await dialog
      .getByRole("button", { name: "Confirm phone", exact: true })
      .click();
    await expect(
      dialog.getByText(
        "Phone verified and SMS alerts enabled in the saved preferences.",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByLabel("SMS alerts", { exact: true }),
    ).toBeChecked();
    expect(state.calls.filter((call) => call.method === "POST")).toEqual([
      {
        owner,
        method: "POST",
        action: "start",
        body: { phone: "+12025550123" },
      },
      {
        owner,
        method: "POST",
        action: "confirm",
        body: { phone: "+12025550123", code: "123456" },
      },
    ]);
    expect(
      state.calls.filter(
        (call) => call.action === "preferences" && call.method === "GET",
      ),
    ).toHaveLength(2);
    expect(unexpected).toEqual([]);
  });
  test(`baseline: ${owner} test alerts use saved channels and distinguish provider acceptance from delivery`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(page, owner);
    state.record = {
      ...state.record,
      smsPhoneVerified: true,
      smsEnabled: true,
    };
    const dialog = await openAlerts(page, owner);
    await dialog
      .getByRole("group", { name: "Test channels", exact: true })
      .getByLabel("SMS", { exact: true })
      .check();
    await dialog
      .getByRole("button", { name: "Send test alert", exact: true })
      .click();
    const results = dialog.getByRole("list", { name: "Test results" });
    await expect(results).toContainText("Email · Provider accepted");
    await expect(results).toContainText("SMS · Suppressed by the service");
    await expect(
      dialog.getByText("Provider acceptance does not confirm delivery."),
    ).toBeVisible();
    expect(state.calls.filter((call) => call.method === "POST")).toEqual([
      {
        owner,
        method: "POST",
        action: "test",
        body: { channels: ["email", "sms"] },
      },
    ]);
    expect(unexpected).toEqual([]);
  });
}

test("Core defaults cannot authorize preferences when the separate current client read is refused", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.clientStatus = 403;
  await page.goto("/alert-channels.html?backend=core");
  await expect(alertDialog(page).getByRole("alert")).toBeVisible();
  await expect(
    alertDialog(page).getByLabel("Email address", { exact: true }),
  ).toHaveCount(0);
  expect(state.calls).toEqual([]);
  state.clientStatus = 200;
  await alertDialog(page)
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(
    alertDialog(page).getByLabel("Email address", { exact: true }),
  ).toHaveValue("core@example.test");
  expect(unexpected).toEqual([]);
});

for (const owner of ["core", "intelligence"] as const)
  test(`${owner} unsaved destinations disable verification and test actions without implicit saves`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(page, owner);
    const dialog = await openAlerts(page, owner);
    await dialog
      .getByLabel("Email address", { exact: true })
      .fill("unsaved@example.test");
    await expect(
      dialog.getByRole("button", { name: "Send test alert", exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", {
        name: "Request verification code",
        exact: true,
      }),
    ).toBeDisabled();
    expect(state.calls.every((call) => call.method === "GET")).toBe(true);
    await reloadAlerts(page);
    await expect(
      dialog.getByRole("button", { name: "Send test alert", exact: true }),
    ).toBeEnabled();
    expect(state.calls.every((call) => call.method === "GET")).toBe(true);
    expect(unexpected).toEqual([]);
  });

test("a changed current saved phone conceals the old challenge and requires explicit reload", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(
    page,
    "intelligence",
  );
  const dialog = await openAlerts(page, "intelligence");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  await expect(
    dialog.getByLabel("Verification code", { exact: true }),
  ).toBeVisible();
  state.record = { ...state.record, smsPhone: "+12025550124" };
  await alertEvent(page, "alert-test-refresh-preferences");
  await expect(
    dialog.getByText(/Reload saved preferences before saving again/),
  ).toBeVisible();
  await expect(
    dialog.getByLabel("Verification code", { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", {
      name: "Request verification code",
      exact: true,
    }),
  ).toBeDisabled();
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  await reloadAlerts(page);
  await expect(dialog.getByLabel("Phone number", { exact: true })).toHaveValue(
    "+12025550124",
  );
  await expect(
    dialog.getByRole("button", {
      name: "Request verification code",
      exact: true,
    }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});

test("Core dormant acknowledgement displays only an actually returned development code", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.start = (route) =>
    json(route, {
      dormant: true,
      masked: "+1 (•••) •••-0123",
      devCode: "654321",
    });
  const dialog = await openAlerts(page, "core");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  await expect(
    dialog.getByText(/service reports that SMS is dormant/),
  ).toBeVisible();
  await expect(
    dialog.getByText(/Development code returned by the service: 654321/),
  ).toBeVisible();
  await expect(dialog.getByText(/code sent|delivered/i)).toHaveCount(0);
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

for (const target of ["client", "preferences"] as const)
  test(`a preference PUT cannot publish after a same-callback ${target} interruption and restoration`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(page, "core");
    let release: (() => void) | undefined;
    let completed = false;
    state.put = async (route) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await json(route, { ...state.record, ...route.request().postDataJSON() });
      completed = true;
    };
    const dialog = await openAlerts(page, "core");
    await dialog.getByLabel("Minimum importance").selectOption("high");
    await dialog
      .getByRole("button", { name: "Save preferences", exact: true })
      .click();
    await expect
      .poll(() => state.calls.filter((call) => call.method === "PUT").length)
      .toBe(1);
    await alertEvent(page, "alert-test-flap", target);
    release?.();
    await expect.poll(() => completed).toBe(true);
    await expect(
      dialog.getByText(/The save could not be confirmed/),
    ).toBeVisible();
    await expect(
      dialog.getByText("Preferences saved.", { exact: true }),
    ).toHaveCount(0);
    await expect(dialog.getByLabel("Minimum importance")).toHaveValue("high");
    expect(state.calls.filter((call) => call.method === "PUT")).toHaveLength(1);
    expect(unexpected).toEqual([]);
  });

test("a Core no-echo PUT with different returned settings remains unconfirmed", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.put = (route) => json(route, state.record);
  const dialog = await openAlerts(page, "core");
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText(/The save could not be confirmed/),
  ).toBeVisible();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toHaveCount(0);
  expect(state.calls.filter((call) => call.method === "PUT")).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a failed client refresh conceals old fields and blocks every changed operation until a current reload", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  const dialog = await openAlerts(page, "core");
  state.clientStatus = 403;
  await alertEvent(page, "alert-test-refresh-client");
  await expect(dialog.getByText(/current client is unavailable/)).toBeVisible();
  await expect(dialog.getByLabel("Email address", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    dialog.getByRole("button", { name: "Send test alert", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", {
      name: "Request verification code",
      exact: true,
    }),
  ).toBeDisabled();
  expect(state.calls.every((call) => call.method === "GET")).toBe(true);
  state.clientStatus = 200;
  await dialog
    .getByRole("button", { name: "Reload client", exact: true })
    .click();
  await expect(dialog.getByLabel("Email address", { exact: true })).toHaveValue(
    "core@example.test",
  );
  await expect(
    dialog.getByRole("button", { name: "Send test alert", exact: true }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});

for (const [action, status] of [
  ["start", 403],
  ["test", 404],
] as const)
  test(`a native ${status} ${action} refusal stays on the configured owner without a delivery claim or retry`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(
      page,
      "intelligence",
    );
    state[action] = (route) =>
      json(route, { message: "Synthetic native channel refusal" }, status);
    const dialog = await openAlerts(page, "intelligence");
    await dialog
      .getByRole("button", {
        name:
          action === "start" ? "Request verification code" : "Send test alert",
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(
      dialog.getByText(/Request acknowledged for|Provider accepted/),
    ).toHaveCount(0);
    await expect(
      dialog.getByText(
        /test result is unknown|verification request could not be confirmed/,
      ),
    ).toHaveCount(0);
    expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(
      1,
    );
    expect(state.calls.every((call) => call.owner === "intelligence")).toBe(
      true,
    );
    expect(unexpected).toEqual([]);
  });

test("a mismatched phone confirmation is unknown and cannot fabricate verification or auto-read success", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(
    page,
    "intelligence",
  );
  state.confirm = (route) =>
    json(route, { verified: true, phone: "+12025550124" });
  const dialog = await openAlerts(page, "intelligence");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  await dialog.getByLabel("Verification code", { exact: true }).fill("123456");
  await dialog
    .getByRole("button", { name: "Confirm phone", exact: true })
    .click();
  await expect(
    dialog.getByText(/verification request could not be confirmed/),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "Phone verified and SMS alerts enabled in the saved preferences.",
    ),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Review another request" }),
  ).toBeDisabled();
  expect(
    state.calls.filter((call) => call.action === "preferences"),
  ).toHaveLength(1);
  await reloadAlerts(page);
  await expect(
    dialog.getByRole("button", { name: "Review another request" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Review another request" }).click();
  await expect(
    dialog.getByRole("button", {
      name: "Request verification code",
      exact: true,
    }),
  ).toBeEnabled();
  expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(2);
  expect(unexpected).toEqual([]);
});

test("an accepted phone confirmation with an unavailable saved read cannot claim SMS opt-in", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.confirm = (route) => {
    state.prefsStatus = 403;
    return json(route, { verified: true, phone: "+12025550123" });
  };
  const dialog = await openAlerts(page, "core");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  await dialog.getByLabel("Verification code", { exact: true }).fill("123456");
  await dialog
    .getByRole("button", { name: "Confirm phone", exact: true })
    .click();
  await expect(
    dialog.getByText(/verification request could not be confirmed/),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "Phone verified and SMS alerts enabled in the saved preferences.",
    ),
  ).toHaveCount(0);
  expect(state.calls.filter((call) => call.action === "confirm")).toHaveLength(
    1,
  );
  expect(
    state.calls.filter((call) => call.action === "preferences"),
  ).toHaveLength(2);
  expect(unexpected).toEqual([]);
});

for (const [label, results] of [
  ["missing", []],
  [
    "duplicate",
    [
      { channel: "email", status: "sent" },
      { channel: "email", status: "sent" },
    ],
  ],
  ["unrequested", [{ channel: "in_app", status: "sent" }]],
] as const)
  test(`a ${label} test result is unknown without inferred success or automatic replay`, async ({
    page,
  }) => {
    const { state, unexpected } = await installAlertChannels(
      page,
      "intelligence",
    );
    state.test = (route) => json(route, results);
    const dialog = await openAlerts(page, "intelligence");
    await dialog
      .getByRole("button", { name: "Send test alert", exact: true })
      .click();
    await expect(dialog.getByText(/The test result is unknown/)).toBeVisible();
    await expect(
      dialog.getByRole("list", { name: "Test results" }),
    ).toHaveCount(0);
    expect(state.calls.filter((call) => call.method === "POST")).toHaveLength(
      1,
    );
    expect(unexpected).toEqual([]);
  });

test("a settled verification acknowledgement cannot survive a later saved phone change", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  const dialog = await openAlerts(page, "core");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  await dialog.getByLabel("Verification code", { exact: true }).fill("123456");
  await dialog
    .getByRole("button", { name: "Confirm phone", exact: true })
    .click();
  await expect(
    dialog.getByText(
      "Phone verified and SMS alerts enabled in the saved preferences.",
    ),
  ).toBeVisible();
  state.put = (route) => {
    state.record = {
      ...state.record,
      ...route.request().postDataJSON(),
      smsEnabled: false,
    };
    return json(route, state.record);
  };
  await dialog.getByLabel("Phone number", { exact: true }).fill("+12025550124");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "Phone verified and SMS alerts enabled in the saved preferences.",
    ),
  ).toHaveCount(0);
  await expect(
    dialog.getByText("Phone verification required before SMS delivery."),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("Core retains native optional email and string quiet-hours values during an unrelated edit", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.record = {
    ...corePreferences,
    emailAddress: null,
    emailEnabled: true,
    quietHoursStart: "saved",
  };
  await page.goto("/alert-channels.html?backend=core");
  const dialog = alertDialog(page);
  await expect(dialog.getByLabel("Email address", { exact: true })).toHaveValue(
    "",
  );
  await dialog.getByLabel("Minimum importance").selectOption("high");
  await dialog
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(
    dialog.getByText("Preferences saved.", { exact: true }),
  ).toBeVisible();
  expect(state.calls.find((call) => call.method === "PUT")?.body).toEqual({
    ...corePreferences,
    emailAddress: null,
    emailEnabled: true,
    quietHoursStart: "saved",
    materiality: "high",
  });
  expect(unexpected).toEqual([]);
});

test("Core verification binds the normalized receipt to the exact saved legacy phone value", async ({
  page,
}) => {
  const { state, unexpected } = await installAlertChannels(page, "core");
  state.record = { ...corePreferences, smsPhone: "(202) 555-0123" };
  const dialog = await openAlerts(page, "core");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  await dialog.getByLabel("Verification code", { exact: true }).fill("123456");
  await dialog
    .getByRole("button", { name: "Confirm phone", exact: true })
    .click();
  await expect(
    dialog.getByText(
      "Phone verified and SMS alerts enabled in the saved preferences.",
    ),
  ).toBeVisible();
  expect(
    state.calls
      .filter((call) => call.method === "POST")
      .map((call) => call.body),
  ).toEqual([
    { phone: "+12025550123" },
    { phone: "+12025550123", code: "123456" },
  ]);
  await expect(dialog.getByLabel("Phone number", { exact: true })).toHaveValue(
    "+12025550123",
  );
  expect(unexpected).toEqual([]);
});
