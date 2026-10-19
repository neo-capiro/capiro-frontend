import { expect, test, type Route } from "@playwright/test";
import { meeting, setup } from "./next-modules-fixtures";

for (const kind of ["notes", "debrief"] as const) {
  for (const outcome of ["success", "failure"] as const) {
    test(`${kind} ${outcome} protects the submitted draft and meeting dismissal while saving`, async ({
      page,
    }) => {
      let held: Route | undefined;
      let writes = 0;
      const saved = {
        id: "40000000-0000-4000-8000-000000000005",
        body: "Exact submitted material",
        status: "draft",
        createdAt: "2026-10-08T12:00:00Z",
      };
      let artifacts: (typeof saved)[] = [];
      await setup(page, {
        "engagement.meetings": [meeting],
        "engagement.notes": () => artifacts,
        "engagement.debriefs": () => artifacts,
      });
      const operation =
        kind === "notes"
          ? "engagement.note.create"
          : "engagement.debrief.create";
      await page.route(`**/api/capiro/${operation}`, (route) => {
        writes++;
        held = route;
      });
      await page.goto("/modules/calendar");
      await page.getByRole("button", { name: "Agenda", exact: true }).click();
      await page
        .getByRole("button", { name: meeting.subject, exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      if (kind === "debrief")
        await dialog.getByRole("tab", { name: "Debrief", exact: true }).click();
      await dialog
        .getByRole("button", {
          name: kind === "notes" ? "+ Add meeting notes" : "+ Add debrief",
          exact: true,
        })
        .click();
      const input = dialog.getByRole("textbox", {
        name: kind === "notes" ? "Meeting notes" : "Debrief",
        exact: true,
      });
      await input.fill(saved.body);
      await input.evaluate((element) => {
        const form = element.closest("form")!;
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      });
      await expect.poll(() => Boolean(held)).toBe(true);
      expect(writes).toBe(1);
      expect(held!.request().postDataJSON()).toEqual({
        params: { id: meeting.id },
        body: { body: saved.body },
      });
      await expect(input).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Save draft", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Close dialog", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("tab", { name: "Prep", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      if (outcome === "success") {
        artifacts = [saved];
        await held!.fulfill({ json: saved });
        await expect(
          dialog.getByText(saved.body, { exact: true }),
        ).toBeVisible();
        await expect(input).toHaveCount(0);
      } else {
        await held!.fulfill({
          status: 500,
          json: { message: "Save rejected" },
        });
        await expect(input).toBeEnabled();
        await expect(input).toHaveValue(saved.body);
        await expect(dialog.getByRole("alert")).toContainText("Save rejected");
      }
      expect(writes).toBe(1);
    });
  }
}
