import { expect, type Page, type Route } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  corePreferences,
  intelPreferences,
  trackerIdentity,
  trackerClientId,
  alertClient,
} from "../alert-channel-fixtures";
import type { PersonalPreferences } from "../../src/features/portfolio/bill-tracker/alert-preferences/personal-contracts";

export const alertDialog = (page: Page) =>
  page.getByRole("dialog", { name: "My bill alerts", exact: true });
export async function alertEvent(page: Page, name: string, detail?: unknown) {
  await page.evaluate(
    ({ name, detail }) =>
      window.dispatchEvent(new CustomEvent(name, { detail })),
    { name, detail },
  );
}
export async function installAlertChannels(
  page: Page,
  backend: "core" | "intelligence",
) {
  const unexpected = await installFixtures(page);
  const state: {
    record: PersonalPreferences;
    identity: unknown;
    clientStatus: number;
    prefsStatus: number;
    calls: { owner: string; method: string; action: string; body: unknown }[];
    put?: (route: Route) => Promise<void>;
    start?: (route: Route) => Promise<void>;
    confirm?: (route: Route) => Promise<void>;
    test?: (route: Route) => Promise<void>;
  } = {
    record: structuredClone(
      backend === "core" ? corePreferences : intelPreferences,
    ),
    identity: trackerIdentity,
    clientStatus: 200,
    prefsStatus: 200,
    calls: [],
  };
  await page.route("**/core/me", (route) => json(route, state.identity));
  await page.route("**/core/clients/*", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-1)!;
    return json(
      route,
      state.clientStatus === 200
        ? { ...alertClient, id }
        : { message: "Synthetic client access refused" },
      state.clientStatus,
    );
  });
  for (const owner of ["core", "intelligence"] as const) {
    const prefs =
      owner === "core"
        ? "**/core/intelligence/clients/*/tracker/alert-prefs"
        : "**/intelligence/tracker/watchlists/*/alert-prefs";
    await page.route(prefs, async (route) => {
      const method = route.request().method();
      state.calls.push({
        owner,
        method,
        action: "preferences",
        body: method === "GET" ? undefined : route.request().postDataJSON(),
      });
      if (owner !== backend)
        return json(
          route,
          owner === "core" ? corePreferences : intelPreferences,
        );
      if (method === "PUT") {
        if (state.put) return state.put(route);
        state.record = { ...state.record, ...route.request().postDataJSON() };
      }
      const parts = new URL(route.request().url()).pathname.split("/");
      const clientId =
        owner === "core"
          ? parts[parts.indexOf("clients") + 1]
          : parts[parts.indexOf("watchlists") + 1];
      const record =
        owner === "core" ? state.record : { ...state.record, clientId };
      return json(
        route,
        state.prefsStatus === 200
          ? record
          : { message: "Synthetic preference access refused" },
        state.prefsStatus,
      );
    });
    const prefix =
      owner === "core"
        ? "**/api/backend/core/intelligence/clients/*/tracker"
        : "**/api/backend/intelligence/clients/*/tracker";
    for (const [action, path] of [
      ["start", "sms/verify/start"],
      ["confirm", "sms/verify/confirm"],
      ["test", "test-alert"],
    ] as const) {
      await page.route(`${prefix}/${path}`, async (route) => {
        expect(route.request().method()).toBe("POST");
        state.calls.push({
          owner,
          method: "POST",
          action,
          body: route.request().postDataJSON(),
        });
        if (state[action]) return state[action]!(route);
        if (action === "start")
          return json(route, { dormant: false, masked: "••• ••• 0123" });
        if (action === "confirm") {
          state.record = {
            ...state.record,
            smsPhone: "+12025550123",
            smsPhoneVerified: true,
            smsEnabled: true,
          };
          return json(route, { verified: true, phone: "+12025550123" });
        }
        const channels = route.request().postDataJSON().channels as string[];
        return json(
          route,
          channels.map((channel) => ({
            channel,
            status: channel === "email" ? "sent" : "suppressed",
          })),
        );
      });
    }
  }
  return { state, unexpected };
}
export async function openAlerts(page: Page, backend: "core" | "intelligence") {
  await page.goto(`/alert-channels.html?backend=${backend}`);
  const dialog = alertDialog(page);
  await expect(dialog.getByLabel("Email address", { exact: true })).toHaveValue(
    backend === "core"
      ? corePreferences.emailAddress!
      : intelPreferences.emailAddress!,
  );
  return dialog;
}
export async function reloadAlerts(page: Page) {
  const dialog = alertDialog(page);
  await dialog
    .getByRole("button", { name: "Reload saved preferences", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Discard edits and reload" })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Discard edits and reload" }),
  ).toHaveCount(0);
}
export { trackerClientId, json };
