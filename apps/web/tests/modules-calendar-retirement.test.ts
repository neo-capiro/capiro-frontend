import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ModulePage from "../src/app/modules/[module]/page";
import { ModuleNavigation } from "../src/shared/shell/ModuleNavigation";
import {
  moduleCatalog,
  moduleHref,
  type ModuleSlug,
} from "../src/shared/shell/module-catalog";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("../src/shared/shell/ConnectedModule", () => ({
  ConnectedModule: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../src/features/modules/ModuleScreen", () => ({
  ModuleScreen: ({ module }: { module: string }) =>
    createElement("p", null, module),
}));
vi.mock("../src/shared/shell/ModuleAsset", () => ({ ModuleAsset: () => null }));
vi.mock("../src/shared/shell/ScopedLink", () => ({
  ScopedLink: (props: ComponentProps<"a">) => createElement("a", props),
}));

// The retired module must also leave the public route type, not just the menu.
// @ts-expect-error Calendar is reached through /calendar or the client calendar.
const removedModule: ModuleSlug = "calendar";
void removedModule;

describe("Modules Calendar retirement", () => {
  it("omits Calendar from the shared module menu/card catalog while retaining Planner's calendar view", () => {
    expect(moduleCatalog.map((item) => item.slug)).not.toContain("calendar");
    expect(
      moduleCatalog.find((item) => item.slug === "planner")?.chips,
    ).toContainEqual({ label: "Calendar", view: "calendar" });
    const html = renderToStaticMarkup(createElement(ModuleNavigation));
    expect(html).not.toContain("/modules/calendar");
    for (const item of moduleCatalog)
      expect(html).toContain(moduleHref(item.slug));
  });
  it("uses the existing not-found branch for the retired URL", async () => {
    await expect(
      ModulePage({ params: Promise.resolve({ module: "calendar" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
  it.each([
    "planner",
    "engagement",
    "workspace",
    "strategies",
    "directory",
    "intelligence",
    "research-portfolios",
  ])("keeps the %s module route available", async (module) => {
    const html = renderToStaticMarkup(
      await ModulePage({ params: Promise.resolve({ module }) }),
    );
    expect(html).toContain(module);
  });
});
