import assert from "node:assert/strict";
import { join } from "node:path";

/** Actual unconfigured Next routes; no session/service interception or native calls. */
export async function verifyDocumentHttp(origin) {
  const local = new URL(origin);
  local.hostname = "localhost";
  const results = [];
  for (const operation of ["create", "revise", "inspect", "download"]) {
    const path = `/api/documents/${operation}`;
    const response = await fetch(local.origin + path, {
      method: "POST",
      headers: { Origin: local.origin, "Content-Type": "application/json" },
      body: "{}",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(response.status, 503, path);
    assert.deepEqual(await response.json(), {
      error: { code: "FRONTEND_DOCUMENT_UNAVAILABLE" },
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    results.push({ path, status: response.status, configured: false });
  }
  return results;
}

export async function verifyDocumentNavigation(
  page,
  origin,
  output,
  viewport,
  colorScheme,
) {
  await page.evaluate(() => window.next.router.push("/meri"));
  await page
    .getByRole("heading", { name: "Connection setup required", exact: true })
    .waitFor();
  if (viewport.width <= 680)
    await page
      .getByRole("button", { name: "Workspace menu", exact: true })
      .click();
  await page
    .getByRole(viewport.width <= 680 ? "link" : "button", {
      name: "Files",
      exact: true,
    })
    .click();
  await page.waitForURL("**/meri/files");
  await page
    .getByRole("heading", { name: "Connection setup required" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Connect document service", exact: true })
      .count(),
    0,
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.equal(await page.locator("[data-portfolio-root]").count(), 0);
  assert.equal(
    await page.evaluate(() => window.portfolioRuntimeProbe),
    "same-document",
  );
  await page.screenshot({
    path: join(
      output,
      `production-meri-files-${viewport.width}-${colorScheme}.png`,
    ),
  });
  await page.goBack();
  await page.waitForURL(`${origin}/meri`);
  await page.goForward();
  await page.waitForURL(`${origin}/meri/files`);
  if (viewport.width <= 680)
    await page
      .getByRole("button", { name: "Workspace menu", exact: true })
      .click();
  await page
    .getByRole(viewport.width <= 680 ? "link" : "button", {
      name: "Conversations",
      exact: true,
    })
    .click();
  await page.waitForURL(`${origin}/meri/conversations`);
  return {
    documentFiles: "actual unconfigured host",
    viewport,
    colorScheme,
    navigation: "Meri/Files/back/forward/Conversations",
    sameDocument: true,
    nativeOperations: "unavailable",
  };
}
