import { test, expect } from "/workspace/capiro-remaining-profile/node_modules/@playwright/test/index.mjs";
import "/workspace/capiro-remaining-profile/apps/web/tests/browser/profile-presentation.spec.ts";
const blocked = new WeakMap();
test.beforeEach(async ({ page }) => {
  const requests = [];
  blocked.set(page, requests);
  await page.route(url => ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && url.port !== "5299", route => {
    requests.push(route.request().url());
    return route.abort("blockedbyclient");
  });
  await page.addInitScript(() => {
    const original = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
      if (["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && url.port !== "5299") throw new Error("Cross-port provider request blocked: " + url.href);
      return original(input, init);
    };
  });
});
test.afterEach(async ({ page }) => expect(blocked.get(page)).toEqual([]));
