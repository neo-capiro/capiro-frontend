import assert from "node:assert/strict";
import { join } from "node:path";

/** Inspect emitted styles on the actual unconfigured application, not a harness. */
export async function verifyMeriTheme(page, output, viewport, colorScheme) {
  const workspace = await page.getByRole("main").evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      foreground: css.getPropertyValue("--foreground").trim(),
      card: css.getPropertyValue("--card").trim(),
      scheme: css.colorScheme,
      background: css.backgroundImage,
      color: css.color,
    };
  });
  const header = await page.getByRole("banner").evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      foreground: css.getPropertyValue("--foreground").trim(),
      background: css.backgroundColor,
    };
  });
  assert.equal(header.foreground, "#0a0a0a");
  assert.equal(header.background, "rgb(255, 255, 255)");
  assert.equal(
    workspace.foreground,
    colorScheme === "dark" ? "#f5f5f4" : "#0a0a0a",
  );
  if (colorScheme === "dark") {
    assert.equal(workspace.card, "#0a0a0a");
    assert.equal(workspace.scheme, "dark");
    assert.match(workspace.background, /^linear-gradient\(/);
    assert.equal(workspace.color, "rgb(245, 245, 244)");
  }
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: join(output, `production-meri-${viewport.width}-${colorScheme}.png`),
    fullPage: true,
  });
  const error = await verifyWorkspaceError(page, output, viewport, colorScheme);
  return { meriTheme: colorScheme, viewport, workspace, header, error };
}

async function verifyWorkspaceError(page, output, viewport, colorScheme) {
  await page.evaluate(() =>
    window.next.router.push("/meri/fixture/run-activity"),
  );
  await page
    .getByLabel("Sample scenario", { exact: true })
    .selectOption("failed");
  const alert = page.getByRole("main").getByRole("alert");
  await alert.waitFor();
  const error = await alert.evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      text: element.textContent,
      color: css.color,
      background: css.backgroundColor,
    };
  });
  assert.equal(error.color, "rgb(10, 10, 10)");
  assert.equal(error.background, "rgb(255, 247, 247)");
  assert.ok(error.text && !error.text.includes("PRIVATE_RAW_EXCEPTION"));
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: join(
      output,
      `production-meri-error-${viewport.width}-${colorScheme}.png`,
    ),
    fullPage: true,
  });
  return error;
}
