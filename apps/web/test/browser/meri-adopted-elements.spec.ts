import { test, expect } from "@playwright/test";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  colorSchemes,
  expectExplainedUnavailable,
  fixtureScreenPath,
  fixtureScreenUrl,
  openFixtureScreen,
  press,
} from "./meri-fixture-screen-helpers";

// Adopted AI Elements without a disclosure, as the Meri fixture screens compose them.
for (const colorScheme of colorSchemes) {
  test(`Meri proposal Confirmation and receipts expose named regions and keyboard links in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "review-task-action",
      colorScheme,
    );
    // Confirmation renders the adopted Alert; Meri names it as a region.
    const proposal = page.getByRole("region", {
      name: "TP-2048 proposal",
      exact: true,
    });
    await expect(proposal).toHaveAttribute("data-slot", "alert");
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await expect(
      proposal.getByRole("heading", {
        level: 2,
        name: "Create one task in Anduril",
      }),
    ).toBeVisible();
    for (const name of ["Approve and create task", "Reject"])
      await expectExplainedUnavailable(
        proposal.getByRole("button", { name, exact: true }),
      );
    const changes = proposal.getByRole("link", {
      name: "Request changes",
      exact: true,
    });
    await tabTo(page, changes);
    await expectFocusEvidence(changes, info);
    await finish();
    await press(page, "Enter");
    await expect(page).toHaveURL(
      fixtureScreenPath("reject-or-request-changes"),
    );

    await page.goto(fixtureScreenUrl("action-receipts"));
    for (const name of ["TP-2048 receipt", "MP-1042 receipt"])
      await expect(
        page.getByRole("region", { name, exact: true }),
      ).toHaveAttribute("data-slot", "alert");
    await expectExplainedUnavailable(
      page.getByRole("button", { name: "Open current memory", exact: true }),
    );
    const proposalLink = page.getByRole("link", {
      name: "View proposal",
      exact: true,
    });
    await tabTo(page, proposalLink);
    await expectFocusEvidence(proposalLink, info);
    await press(page, "Enter");
    await expect(page).toHaveURL(fixtureScreenPath("executed-task-proposal"));
  });

  test(`Meri Checkpoint restore renders the checkpoint and its keyboard fork in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "checkpoint-restore",
      colorScheme,
    );
    const panel = page.getByRole("region", {
      name: "Checkpoint · After commitment analysis",
      exact: true,
    });
    await expect(
      panel.getByRole("heading", {
        level: 2,
        name: "Checkpoint · After commitment analysis",
      }),
    ).toBeVisible();
    await expect(
      panel
        .getByRole("table", {
          name: "Checkpoint · After commitment analysis saved items",
        })
        .getByRole("row"),
    ).toHaveCount(6);
    await expectExplainedUnavailable(
      panel.getByRole("button", { name: "Resume this run", exact: true }),
    );
    const fork = panel.getByRole("link", {
      name: "Fork into a new conversation",
      exact: true,
    });
    await tabTo(page, fork);
    await expectFocusEvidence(fork, info);
    await finish();
    await press(page, "Enter");
    await expect(page).toHaveURL(fixtureScreenPath("interrupted-run"));
  });

  test(`Meri cited Sources select evidence by keyboard in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "evidence-sources",
      colorScheme,
    );
    const cited = page.getByRole("region", {
      name: "Cited sources",
      exact: true,
    });
    await expect(cited).toHaveAttribute("data-slot", "collapsible");
    await expect(cited.getByRole("article")).toHaveCount(3);
    // All three sources fit the visible count, so no expand control is offered.
    await expect(cited.locator("[aria-expanded]")).toHaveCount(0);
    const first = cited.getByRole("button", {
      name: "View evidence for [1] Public funding update",
      exact: true,
    });
    await expect(first).toHaveAttribute("aria-pressed", "false");
    await expect(
      cited.getByRole("button", {
        name: "View evidence for [2] Restoration request",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await tabTo(page, first);
    await expectFocusEvidence(first, info);
    await press(page, "Enter");
    await expect(first).toHaveAttribute("aria-pressed", "true");
    const detail = page.getByRole("heading", {
      level: 2,
      name: "[1] Public funding update",
      exact: true,
    });
    await expect(detail).toBeFocused();
    await expect(
      page.getByRole("region", {
        name: "[1] Public funding update",
        exact: true,
      }),
    ).toBeVisible();
    await finish();
  });

  test(`Meri Artifact cards name their file and actions in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "analysis-outputs",
      colorScheme,
    );
    const outputs = page.getByRole("region", {
      name: "Analysis outputs",
      exact: true,
    });
    const files = ["commitments.csv", "analysis.ipynb", "analysis-bundle.zip"];
    await expect(outputs.getByRole("group")).toHaveCount(files.length);
    for (const name of files) {
      const card = outputs.getByRole("group", { name, exact: true });
      await expect(card.getByText(name, { exact: true })).toBeVisible();
      for (const action of ["Open", "Download"])
        await expectExplainedUnavailable(
          card.getByRole("button", { name: action, exact: true }),
        );
    }
    await finish();
    // In workspace files the selected file's card opens its exact version.
    await page.goto(fixtureScreenUrl("workspace-files"));
    const card = page.getByRole("group", {
      name: "meeting-brief-v2.docx",
      exact: true,
    });
    await expectExplainedUnavailable(
      card.getByRole("button", { name: "Download", exact: true }),
    );
    const open = card.getByRole("link", { name: "Open", exact: true });
    await tabTo(page, open);
    await expectFocusEvidence(open, info);
    await press(page, "Enter");
    await expect(page).toHaveURL(fixtureScreenPath("word-document"));
  });

  test(`Meri draft Attachments are removable by keyboard in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "attach-files",
      colorScheme,
    );
    const attached = page.getByRole("list", {
      name: "Attached to this draft",
      exact: true,
    });
    await expect(attached.getByRole("listitem")).toHaveCount(1);
    await expect(attached.getByRole("listitem")).toContainText(
      "brief-source.pdf",
    );
    const remove = attached.getByRole("button", {
      name: /^Remove brief-source\.pdf/,
    });
    await tabTo(page, remove);
    await expectFocusEvidence(remove, info);
    await finish();
    await press(page, "Enter");
    await expect(attached.getByRole("listitem")).toHaveCount(0);
    await expect(page.getByText("brief-source.pdf")).toHaveCount(0);
  });

  test(`Meri WebPreview controls are named and keyboard operable in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "generated-web-preview",
      colorScheme,
    );
    const frame = page.locator("iframe");
    await expect(frame).toHaveAttribute(
      "title",
      "Isolated preview of signal-summary.html",
    );
    // The static synthetic HTML runs with an empty sandbox.
    await expect(frame).toHaveAttribute("sandbox", "");
    await expect(frame).toHaveAttribute("srcdoc", /\S/);
    const refresh = page.getByRole("button", { name: "Refresh", exact: true });
    await tabTo(page, refresh);
    await expectFocusEvidence(refresh, info);
    await press(page, "Enter");
    await expect(
      page.getByText("Preview reloaded from the same static version.", {
        exact: true,
      }),
    ).toBeVisible();
    const width = page.getByRole("button", { name: "Desktop", exact: true });
    await expect(width).toHaveAttribute("aria-pressed", "false");
    await tabTo(page, width);
    await expectFocusEvidence(width, info);
    await press(page, " ");
    const phone = page.getByRole("button", { name: "Phone", exact: true });
    await expect(phone).toHaveAttribute("aria-pressed", "true");
    await expect(phone).toBeFocused();
    await press(page, " ");
    await expect(width).toHaveAttribute("aria-pressed", "false");
    const full = page.getByRole("button", { name: "Full screen", exact: true });
    await tabTo(page, full);
    await expectFocusEvidence(full, info);
    await finish();
    await press(page, "Enter");
    // Either the browser enters full screen or the page explains why not.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.fullscreenElement !== null ||
            document.body.innerText.includes(
              "Full screen is not available in this browser.",
            ),
        ),
      )
      .toBe(true);
    await page.evaluate(() =>
      document.fullscreenElement ? document.exitFullscreen() : undefined,
    );
  });
}
