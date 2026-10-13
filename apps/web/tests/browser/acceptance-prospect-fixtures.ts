import { expect, type Page } from "@playwright/test";
import { installFixtures, json, prospectId } from "./fixtures";

export const prospectDetail = `/portfolio/prospects/${prospectId}`;
export const currentReadFailure = "Synthetic current prospect subread failed";

export async function prepareProspectRead(page: Page, baseURL?: string) {
  if (!baseURL) throw new Error("The isolated fixture baseURL is required.");
  const origin = new URL(baseURL).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  const unexpected = await installFixtures(page);
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/") && request.method() !== "GET")
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  let instant = Date.parse("2026-10-13T12:00:00Z");
  await page.clock.setFixedTime(new Date(instant));
  return {
    async reread() {
      instant += 31_000;
      await page.clock.setFixedTime(new Date(instant));
      await page.evaluate(() => dispatchEvent(new Event("offline")));
      await page.evaluate(() => dispatchEvent(new Event("online")));
    },
    assertNoEffects() {
      expect(writes).toEqual([]);
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
    },
  };
}

/** Intercepts only a read. Each held request retains its original response. */
export async function installProspectRead(
  page: Page,
  pattern: string,
  initial: unknown,
) {
  let body = initial;
  let status = 200;
  let gate: Promise<void> | undefined;
  let reads = 0;
  await page.route(pattern, async (route) => {
    expect(route.request().method()).toBe("GET");
    reads++;
    const response = { body, status, gate };
    if (response.gate) await response.gate;
    await json(
      route,
      response.status === 200 ? response.body : { message: currentReadFailure },
      response.status,
    );
  });
  return {
    reads: () => reads,
    fail(code: 403 | 503) {
      status = code;
    },
    holdRecovery(next: unknown) {
      body = next;
      status = 200;
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        gate = undefined;
        release();
      };
    },
  };
}

export function failureText(status: number) {
  return status === 403 ? "You do not have permission" : currentReadFailure;
}

export async function replaceProspectRoute(page: Page, path: string) {
  await page.evaluate((next) => {
    history.pushState({}, "", next);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
