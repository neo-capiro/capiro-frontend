import { describe, expect, it } from "vitest";
import type { WorkspaceBlueprintListItem } from "@capiro/shared/workspace-template-studio";
import {
  blueprintChoiceLabel,
  blueprintDisplayName,
} from "../src/features/modules/workspace/document-templates/blueprint-display";
import {
  portfolioSourceLabel,
  identityBasisLabel,
} from "../src/shared/portfolio/domain/display";
import {
  folderListSchema,
  folderNameSchema,
} from "../src/features/portfolio/files/folders";
import { catalog } from "./document-blueprint-fixtures";
describe("readable workflow display", () => {
  it("uses meaningful template slugs when saved names are untitled and shows version state without claiming draft publication", () => {
    const row: WorkspaceBlueprintListItem = {
      ...catalog()[0]!,
      scope: "capiro",
      name: "Untitled blueprint",
    };
    expect(blueprintDisplayName(row)).toBe("Synthetic brief");
    expect(blueprintChoiceLabel(row, 0)).toBe(
      "Synthetic brief · Brief · Capiro · v3 draft",
    );
    expect(blueprintChoiceLabel({ ...row, slug: "untitled" }, 1)).toContain(
      "Unnamed Brief template 2",
    );
  });
  it("keeps native source identities behind readable labels", () => {
    expect(
      portfolioSourceLabel("capability:60000000-0000-4000-8000-000000000001"),
    ).toBe("Capability document");
    expect(portfolioSourceLabel("sam_opportunity")).toBe("SAM.gov opportunity");
    expect(identityBasisLabel("exact_uei")).toBe(
      "Exact Unique Entity ID match",
    );
  });
  it("accepts durable empty folders and validates names before creating them", () => {
    expect(folderListSchema.parse([{ folder: "Hearings", count: 0 }])).toEqual([
      { folder: "Hearings", count: 0 },
    ]);
    expect(folderNameSchema.parse(" Hearings ")).toBe("Hearings");
    expect(folderNameSchema.safeParse(" ").success).toBe(false);
    expect(folderNameSchema.safeParse("a".repeat(121)).success).toBe(false);
  });
});
