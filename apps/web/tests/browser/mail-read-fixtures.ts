import type { Page } from "@playwright/test";
import { mailActorId, mailTenantId } from "../mail-read-fixture";
import { json } from "./fixtures";
export async function installMailReadIdentity(page: Page) {
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: { id: mailActorId, email: "test@example.test" },
      tenant: { id: mailTenantId, name: "Synthetic Mail" },
      role: "standard_user",
    }),
  );
}
