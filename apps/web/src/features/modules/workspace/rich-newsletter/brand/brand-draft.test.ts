import { expect, it } from "vitest";
import {
  createNewsletterLayout,
  defaultNewsletterBrandKit,
  defaultNewsletterConfig,
} from "@capiro/shared/newsletter";
import { applyBrand, editBrand, fontIsSelected } from "./brand-draft";

it("applies canonical brand defaults as one isolated design change without replacing campaign identity or provenance", () => {
  const kit = defaultNewsletterBrandKit();
  kit.fonts.heading = "Georgia";
  kit.fonts.body = "Verdana";
  const draft = {
    name: "Unsaved name",
    design: createNewsletterLayout(1),
    config: {
      ...defaultNewsletterConfig(),
      subject: "Unsaved subject",
      clientId: "client-synthetic",
    },
  };
  Object.assign(draft.design, { source: { owner: "retained" } });
  const before = structuredClone(draft),
    result = applyBrand(draft, kit);
  expect(result.name).toBe(draft.name);
  expect(result.config).toBe(draft.config);
  expect(result.design.styles.text.h1.fontFamily).toBe("Georgia");
  expect(result.design.styles.mobileText.p.fontFamily).toBe("Verdana");
  expect(result.design).toHaveProperty("source", { owner: "retained" });
  expect(draft).toEqual(before);
  expect(result.design.sections.map((s) => s.id)).toEqual(
    draft.design.sections.map((s) => s.id),
  );
});
it("local kit edits do not mutate saved defaults and selected button fonts prevent removal", () => {
  const kit = defaultNewsletterBrandKit();
  const changed = editBrand(kit, (next) => {
    next.colors.primary.push("#123456");
    next.buttons[0]!.fontFamily = "Synthetic Font";
  });
  expect(kit.colors.primary).not.toContain("#123456");
  expect(fontIsSelected(changed, "Synthetic Font")).toBe(true);
  expect(fontIsSelected(kit, "Synthetic Font")).toBe(false);
});
