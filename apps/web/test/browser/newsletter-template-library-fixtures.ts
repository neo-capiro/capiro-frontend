import {
  createNewsletterBlock,
  createNewsletterLayout,
  type NewsletterTemplateLibraryItem,
} from "@capiro/shared/newsletter";
import { expect, type Page, type Route } from "@playwright/test";
import { button } from "./newsletter-document-fixtures";
import { sectionFixture } from "./newsletter-section-library-fixtures";

/** Synthetic responses, with the actual public receivers, editor and request lifetime mounted. */
export async function templateFixture(page: Page) {
  const base = await sectionFixture(page);
  const design = createNewsletterLayout(1);
  design.sections[0]!.name = "Reusable full template";
  design.sections[0]!.blocks = [createNewsletterBlock("paragraph")];
  design.sections[0]!.blocks[0]!.text = "Template paragraph";
  const first: NewsletterTemplateLibraryItem = {
    id: "e5555555-5555-4555-8555-555555555555",
    name: "Monthly update",
    folder: "Updates",
    updatedAt: "2026-10-26T00:00:00.000Z",
    design,
    config: {
      company: "Template company",
      mailingAddress: "Template address",
      permissionReminder: "Template permission",
    },
  };
  const state = {
    items: [
      first,
      {
        ...structuredClone(first),
        id: "f6666666-6666-4666-8666-666666666666",
        name: "Annual review",
        folder: "Annual",
      },
    ],
    reads: 0,
    writes: [] as {
      operation: string;
      input: {
        params: { id: string };
        body?: { name: string; folder?: string };
      };
    }[],
    list: undefined as ((route: Route) => Promise<void>) | undefined,
    write: undefined as ((route: Route) => Promise<void>) | undefined,
  };
  await page.route(
    /\/api\/capiro\/workspace\.richNewsletter\.(templates\.(list|save)|library\.(update|remove))(?:\?|$)/,
    async (route) => {
      const operation = new URL(route.request().url()).pathname
        .split(".")
        .slice(-2)
        .join(".");
      if (operation === "templates.list") {
        state.reads++;
        return state.list
          ? state.list(route)
          : route.fulfill({ json: { items: state.items } });
      }
      const input = route.request().postDataJSON();
      state.writes.push({ operation, input });
      if (state.write) return state.write(route);
      if (operation === "templates.save")
        return route.fulfill({ json: { ...first, ...input.body } });
      return route.fulfill({ json: { ok: true } });
    },
  );
  return { ...base, templates: state, template: first };
}
export const catalog = (page: Page) =>
  page.getByRole("region", { name: "Saved templates" });
export async function browseTemplates(page: Page) {
  await button(page, "Saved templates").click();
  await expect(
    catalog(page).getByRole("heading", { name: "Monthly update", exact: true }),
  ).toBeVisible();
}
