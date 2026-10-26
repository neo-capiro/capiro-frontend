import type { Page } from "@playwright/test";
import { ordinarySaveFixture } from "../workspace-ordinary-save-fixture";
import { scope } from "../../../tests/workspace-ordinary-save-fixtures";
import { deferred, notice, owner, pendingPerson } from "./fixtures";

export async function hostFixture(page: Page) {
  const ordinary = await ordinarySaveFixture(page);
  const gate = deferred();
  const state = {
    holdPeople: false,
    heldSettled: false,
    peopleInputs: [] as unknown[],
    release: gate.resolve,
  };
  await page.route("**/api/capiro/workspace.collaborators?*", async (route) => {
    state.peopleInputs.push(
      JSON.parse(new URL(route.request().url()).searchParams.get("input")!),
    );
    const held = state.holdPeople;
    if (held) await gate.promise;
    try {
      await route.fulfill({
        json: {
          collaborators: [
            { ...owner, id: `owner:${scope.draftId}` },
            pendingPerson,
          ],
        },
      });
    } catch {
      // A retired synthetic request may already be cancelled by the browser.
    } finally {
      if (held) state.heldSettled = true;
    }
  });
  await page.route("**/api/capiro/settings.tenantMembers*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/capiro/workspace.notifications?*", (route) =>
    route.fulfill({ json: { items: [notice()], unread: 1 } }),
  );
  await page.route("**/api/capiro/workspace.templates?*", (route) =>
    route.fulfill({ json: [] }),
  );
  return { ordinary, state };
}
