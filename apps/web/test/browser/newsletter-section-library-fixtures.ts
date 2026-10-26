import {
  createNewsletterBlock,
  type NewsletterSectionLibraryItem,
} from "@capiro/shared/newsletter";
import { expect, type Page, type Route } from "@playwright/test";
import {
  documentFixture,
  enterEditor,
  adoptDocument,
  button,
} from "./newsletter-document-fixtures";

/** Existing document authority fixture; only the two new library resources are synthetic. */
export async function sectionFixture(page: Page) {
  const base = await documentFixture(page);
  const section = base.control.current.design.sections[0]!;
  section.name = "Stored introduction";
  section.blocks = [createNewsletterBlock("paragraph")];
  section.blocks[0]!.text = "Stored paragraph";
  base.control.current.design.sections = [section];
  const first: NewsletterSectionLibraryItem = {
    id: "a1111111-1111-4111-8111-111111111111",
    name: "Saved introduction",
    folder: "Updates",
    updatedAt: "2026-10-26T00:00:00.000Z",
    section: { ...structuredClone(section), name: "Reusable introduction" },
  };
  const state = {
    items: [
      first,
      {
        ...structuredClone(first),
        id: "c3333333-3333-4333-8333-333333333333",
        name: "Annual summary",
        folder: "Annual",
      },
    ],
    reads: 0,
    writes: [] as {
      params: { id: string };
      body: { name: string; folder?: string; sectionId: string };
    }[],
    list: undefined as ((route: Route) => Promise<void>) | undefined,
    save: undefined as ((route: Route) => Promise<void>) | undefined,
  };
  await page.route(
    /\/api\/capiro\/workspace\.richNewsletter\.sections\.(list|save)(?:\?|$)/,
    async (route) => {
      if (route.request().method() === "GET") {
        state.reads++;
        return state.list
          ? state.list(route)
          : route.fulfill({ json: { items: state.items } });
      }
      const input = route.request().postDataJSON();
      state.writes.push(input);
      return state.save
        ? state.save(route)
        : route.fulfill({
            json: {
              ...first,
              name: input.body.name,
              folder: input.body.folder ?? "",
            },
          });
    },
  );
  return { ...base, library: state, first };
}
export async function sectionReady(page: Page, url?: string) {
  await enterEditor(page, url);
  await expect(button(page, "Create saved document")).toBeEnabled();
  await adoptDocument(page);
}
export const saveSection = (page: Page) =>
  button(page, "Save section Stored introduction");
export const sectionsPanel = (page: Page) =>
  page.getByRole("complementary", { name: "Saved sections" });
export async function browseSections(page: Page) {
  await button(page, "Saved sections").click();
  await expect(
    sectionsPanel(page).getByRole("heading", {
      name: "Saved introduction",
      exact: true,
    }),
  ).toBeVisible();
}
