import { test, expect } from "@playwright/test";
import {
  providerFixture,
  selectProviderBlock,
  proposedText,
  capabilities,
  expectNoProviderSideEffects,
} from "./newsletter-providers-fixture";
import {
  button,
  heldResponse,
  documentId,
} from "./newsletter-document-fixtures";
import { auditDialog } from "./newsletter-assets-fixture";

test("writing uses explicit source and proposed plain text with keyboard adoption and Undo", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page);
  await selectProviderBlock(page, "Heading");
  const original = await page
    .getByRole("textbox", { name: "Block rich text", exact: true })
    .innerText();
  await button(page, "Write with AI").click();
  await page
    .getByLabel("Source text and source URLs")
    .fill("Synthetic policy source https://source.example.test/report");
  await page
    .getByLabel("Instructions", { exact: true })
    .fill("Summarize for members");
  expect(fixture.calls("write")).toEqual([]);
  await auditDialog(page, info, "writing-form-desktop");
  await page.screenshot({ path: info.outputPath("writing-form-desktop.png") });
  await button(page, "Generate").click();
  await expect(page.getByLabel("Proposed text")).toHaveValue(proposedText);
  expect(fixture.calls("write")[0]?.input).toEqual({
    params: { id: documentId },
    body: {
      text: "Synthetic policy source https://source.example.test/report",
      prompt: "Summarize for members",
      kind: "heading",
    },
  });
  await button(page, "Close").click();
  await expect(
    page.getByRole("textbox", { name: "Block rich text", exact: true }),
  ).toHaveText(original);
  await button(page, "Write with AI").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "writing-proposal-narrow");
  await page.screenshot({
    path: info.outputPath("writing-proposal-narrow.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await button(page, "Use text").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Block rich text", exact: true }),
  ).toHaveText(proposedText);
  expect(await page.evaluate(() => "providerCode" in window)).toBe(false);
  await button(page, "Undo").click();
  await expect(
    page.getByRole("textbox", { name: "Block rich text", exact: true }),
  ).toHaveText(original);
  expect(fixture.calls("write")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});

test("unavailable writing capability prevents generation and keeps its actual reason", async ({
  page,
}) => {
  const fixture = await providerFixture(page);
  fixture.queue("capabilities", (route) =>
    route.fulfill({
      json: {
        ...capabilities,
        ai: {
          available: false,
          reason: "Synthetic provider credentials missing",
        },
      },
    }),
  );
  await selectProviderBlock(page, "Heading");
  await button(page, "Write with AI").click();
  await expect(
    page.getByText("Synthetic provider credentials missing"),
  ).toBeVisible();
  await page.getByLabel("Instructions", { exact: true }).fill("Summarize");
  await expect(button(page, "Generate")).toBeDisabled();
  expect(fixture.calls("write")).toEqual([]);
  await expectNoProviderSideEffects(fixture);
});

test("an unconfirmed writing request stays fenced through dialog close and capability refresh", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page),
    held = heldResponse();
  fixture.queue("write", async (route) => {
    await held.wait;
    await route.fulfill({ json: { text: proposedText, documentId } });
    held.finished();
  });
  await selectProviderBlock(page, "Heading");
  await button(page, "Write with AI").click();
  await page.getByLabel("Instructions", { exact: true }).fill("Summarize");
  await button(page, "Generate").click();
  await expect(page.getByText(/Request in progress/)).toBeVisible();
  await button(page, "Close").click();
  held.release();
  await held.settled;
  await button(page, "Write with AI").click();
  await expect(
    page.getByText(/This request could not be confirmed/),
  ).toBeVisible();
  await expect(button(page, "Generate")).toBeDisabled();
  await expect(button(page, "Use text")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("writing-unconfirmed.png") });
  await button(page, "Close").click();
  await button(page, "Write with AI").click();
  await expect(button(page, "Generate")).toBeDisabled();
  expect(fixture.calls("write")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});
