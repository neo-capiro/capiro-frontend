import type { Page, Route } from "@playwright/test";
import {
  capability,
  capabilityId,
  client,
  clientId,
  installFixtures,
  json,
} from "./fixtures";

export const secondClientId = "10000000-0000-4000-8000-000000000002";
export const fit = {
  status: "ready",
  computedAt: "2026-10-11T12:00:00Z",
  matches: [
    {
      id: "fit-test",
      kind: "pe",
      targetId: "0604134A",
      target: "Synthetic fit program",
      why: "Explicit synthetic capability reference",
      fit: 90,
      capabilityIds: [capabilityId],
      href: "/program-elements/0604134A",
    },
  ],
};

export async function installCapabilityBoundary(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route(`**/core/clients/${clientId}/capability-fit`, (route) =>
    json(route, fit),
  );
  await page.route(`**/core/clients/${secondClientId}`, (route) =>
    json(route, {
      ...client,
      id: secondClientId,
      name: "Second synthetic client",
    }),
  );
  await page.route(`**/core/clients/${secondClientId}/capabilities`, (route) =>
    json(route, [{ ...capability, name: "Second client capability" }]),
  );
  await page.route(
    `**/core/clients/${secondClientId}/capability-fit`,
    (route) => json(route, { ...fit, matches: [] }),
  );
  return unexpected;
}

export function transition(page: Page, name: string) {
  return page.evaluate(
    (event) => window.dispatchEvent(new Event(`capability-boundary-${event}`)),
    name,
  );
}

/** Release is explicit so assertions cover the response arriving after a change. */
export async function holdResponse(
  page: Page,
  url: string,
  method: string,
  body: unknown,
) {
  let release!: () => void;
  let received!: () => void;
  let finished!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    received = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    finished = resolve;
  });
  let calls = 0;
  await page.route(url, async (route: Route) => {
    if (route.request().method() !== method) return route.fallback();
    calls += 1;
    received();
    await gate;
    await json(route, body).catch(() => undefined);
    finished();
  });
  return { release, started, settled, calls: () => calls };
}
