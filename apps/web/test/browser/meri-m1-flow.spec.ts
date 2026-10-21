import { expect, test } from "@playwright/test";
import {
  binding,
  clientId,
  composer,
  nextBinding,
  sendButton,
  stopButton,
} from "./meri-conversation-fixtures";
import {
  firstAnswer,
  installM1Flow,
  otherClientId,
  secondAnswer,
} from "./meri-m1-flow-fixtures";

for (const viewport of [
  { width: 1440, height: 1040 },
  { width: 390, height: 844 },
]) {
  for (const recoverDraft of [false, true]) {
    test(`M1 composed synthetic ${recoverDraft ? "HELD draft recovery" : "core flow"} at ${viewport.width}px: send, reload, Stop, second turn and client isolation`, async ({
      page,
    }) => {
      test.skip(
        recoverDraft,
        "MF-07 same-tab draft recovery belongs to the separate stacked PR; this PR does not implement persistence",
      );
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      const flow = await installM1Flow(page);
      await page.goto(
        `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
      );
      await composer(page).fill("M1 original question");
      await expect(sendButton(page)).toBeEnabled();
      await composer(page).press("Enter");
      await expect(page.getByText(firstAnswer, { exact: true })).toBeVisible();
      expect(flow.initial.calls.allocate).toHaveLength(1);
      expect(flow.initial.calls.admit).toHaveLength(1);
      expect(flow.initial.calls.submit).toHaveLength(1);
      await expect(composer(page)).toHaveValue("");
      if (recoverDraft)
        await composer(page).fill("Draft retained across reload");
      await page.reload();
      await expect(page.getByText(firstAnswer, { exact: true })).toBeVisible();
      if (recoverDraft)
        await expect(composer(page)).toHaveValue(
          "Draft retained across reload",
        );
      await expect.poll(() => flow.calls.cursors).toContain("3");
      expect(flow.initial.calls.allocate).toHaveLength(1);
      expect(flow.initial.calls.submit).toHaveLength(1);
      await expect(stopButton(page)).toBeEnabled();
      await stopButton(page).click();
      await expect.poll(() => flow.calls.cancel).toBe(1);
      const stop = page.getByRole("region", {
        name: "Stop status",
        exact: true,
      });
      await expect(
        stop.getByRole("heading", { name: "Cancelling", exact: true }),
      ).toBeVisible();
      await expect(stop.getByRole("status")).toHaveText(
        "Meri is finishing the current safe step before stopping.",
      );
      const current = page.getByRole("article", {
        name: "Current turn",
        exact: true,
      });
      await expect(current.getByText("Cancelled", { exact: true })).toHaveCount(
        0,
      );
      const ready = page.getByRole("region", {
        name: "Next message status",
        exact: true,
      });
      await expect(ready).toHaveCount(0);
      expect(flow.calls.reservations).toEqual([]);
      let terminalReadbacks = 0;
      const reverified = page.waitForResponse(async (response) => {
        if (
          !response.url().endsWith("/api/conversations/transcript") ||
          !response.ok()
        )
          return false;
        const request = response.request().postDataJSON();
        const value = await response.json();
        const exactTail =
          request.conversationId === binding.conversationId &&
          request.after === 0 &&
          value.latestRun?.binding.runId === binding.runId &&
          value.latestRun.state === "cancelled" &&
          value.latestSequenceBase === 0 &&
          value.lastSequence === 4;
        // This fixture's saved-page and latest-tail requests both start at zero.
        // Both must finish revalidation before the composer may admit a next turn.
        return exactTail && ++terminalReadbacks === 2;
      });
      flow.retire();
      await expect(
        current.getByText("Cancelled", { exact: true }),
      ).toBeVisible();
      await reverified;
      await expect(
        page
          .getByRole("region", {
            name: "Saved conversation history",
            exact: true,
          })
          .getByText("Saved conversation history loaded.", { exact: true }),
      ).toBeVisible();
      await expect(
        stop.getByRole("heading", { name: "Stopped", exact: true }),
      ).toBeVisible();
      await expect(stop.getByText("Complete", { exact: true })).toBeVisible();
      await expect(stop.getByRole("status")).toHaveText(
        "Stopped. Completed steps remain recorded.",
      );
      await expect(
        ready.getByRole("heading", { name: "Ready", exact: true }),
      ).toBeVisible();
      await expect(ready.getByText("Complete", { exact: true })).toBeVisible();
      await expect(
        ready.getByText("You can send your next message.", { exact: true }),
      ).toBeVisible();
      await ready
        .getByRole("button", { name: "Write next message", exact: true })
        .click();
      await expect(composer(page)).toBeFocused();
      expect(flow.calls.reservations).toEqual([]);
      expect(flow.calls.successors).toEqual([]);
      await composer(page).fill("M1 second question");
      await expect(sendButton(page)).toBeEnabled();
      await sendButton(page).dblclick();
      await expect(page.getByText(secondAnswer, { exact: true })).toBeVisible();
      await expect(composer(page)).toHaveValue("");
      expect(flow.calls.reservations).toEqual([
        {
          conversationId: binding.conversationId,
          sourceRunId: binding.runId,
        },
      ]);
      expect(flow.calls.successors).toHaveLength(1);
      expect(flow.calls.successors[0]!.prompt).toBe("M1 second question");
      expect(flow.fixture.hints).toContainEqual({
        clientId,
        conversationId: binding.conversationId,
        runId: nextBinding.runId,
      });
      await expect(
        page
          .getByRole("article", { name: "Earlier turn 1" })
          .getByText(firstAnswer, { exact: true }),
      ).toBeVisible();
      await page
        .locator("summary")
        .filter({ hasText: "Pause and recovery" })
        .click();
      await expect(
        page.getByText(
          "Pause and checkpoint recovery are not available for this conversation yet.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: /^(Pause|Steer|Resume from checkpoint|Retry from checkpoint|Fork conversation)$/,
        }),
      ).toHaveCount(0);
      expect(flow.calls.lifecycle).toEqual([]);
      await composer(page).fill("Private draft for first client");
      await page
        .locator("summary")
        .filter({ hasText: "Verified conversation client" })
        .click();
      await page
        .getByRole("navigation", { name: "Choose Meri client" })
        .getByRole("link", { name: "Other permitted client", exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`clientId=${otherClientId}`));
      await expect(page.getByText(firstAnswer, { exact: true })).toHaveCount(0);
      await expect(page.getByText(secondAnswer, { exact: true })).toHaveCount(
        0,
      );
      await expect(composer(page)).not.toHaveValue(
        "Private draft for first client",
      );
      await expect(
        page.getByRole("heading", {
          name: "Conversation connection unavailable",
          exact: true,
        }),
      ).toBeVisible();
      expect(flow.calls.successors).toHaveLength(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(flow.fixture.unexpected).toEqual([]);
    });
  }
}
