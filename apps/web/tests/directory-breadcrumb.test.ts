import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ModuleBreadcrumb } from "../src/shared/shell/ModuleBreadcrumb";
import { DirectoryScreen } from "../src/features/modules/directory/DirectoryScreen";
import { moduleCatalog } from "../src/shared/shell/module-catalog";

const route = vi.hoisted(() => ({
  search: "",
  selectedTab: "",
  selectedLabel: "",
  switchModule: null as ((value: string) => void) | null,
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(route.search),
  usePathname: () => "/modules/directory",
  useRouter: () => ({ push: route.push }),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: "authorized-client",
    client: { id: "30000000-0000-4000-8000-000000000001" },
  }),
}));
vi.mock("../src/shared/shell/ScopedLink", () => ({
  ScopedLink: ({ children }: { children: ReactNode }) =>
    createElement("a", null, children),
}));
vi.mock("../src/shared/module-ui", () => ({
  ActionButton: () => null,
  PageHeader: () => null,
  Tabs: ({
    value,
    items,
  }: {
    value: string;
    items: readonly { id: string; label: string }[];
  }) => {
    route.selectedTab = value;
    route.selectedLabel = items.find((item) => item.id === value)?.label ?? "";
    return null;
  },
  SelectInput: ({
    onValueChange,
  }: {
    onValueChange: (value: string) => void;
  }) => {
    route.switchModule = onValueChange;
    return createElement("button", null, "Switch module");
  },
}));
vi.mock("../src/features/modules/directory/CongressionalContacts", () => ({
  CongressionalContacts: () => null,
}));
vi.mock("../src/features/modules/directory/CommitteeDirectory", () => ({
  CommitteeDirectory: () => null,
}));
vi.mock("../src/features/modules/directory/PersonnelDirectory", () => ({
  PersonnelDirectory: () => null,
}));
vi.mock("../src/features/modules/directory/StateDirectory", () => ({
  StateDirectory: () => null,
}));

beforeEach(() => {
  route.search = "";
  route.selectedTab = "";
  route.selectedLabel = "";
  route.switchModule = null;
  route.push.mockReset();
});

it.each(["", "view=", "view=unknown"])(
  "shows the same default Directory view in the tab and breadcrumb for %s",
  (search) => {
    route.search = search;
    renderToStaticMarkup(createElement(DirectoryScreen));
    const html = renderToStaticMarkup(
      createElement(ModuleBreadcrumb, { active: "directory" }),
    );
    expect(route.selectedTab).toBe("congressional-staff");
    expect(route.selectedLabel).toBe("Congressional Staff");
    expect(html).toContain("<span>Congressional Staff</span>");
    expect(route.push).not.toHaveBeenCalled();
  },
);

it.each([
  ["congressional-staff", "Congressional Staff"],
  ["committee-staff", "Committee Staff"],
  ["department-of-war", "Department of War"],
  ["state-legislators", "State Legislators"],
  ["state-committees", "State Committees"],
])(
  "matches the rendered view for %s without changing hub shortcuts",
  (view, label) => {
    route.search = `view=${view}`;
    renderToStaticMarkup(createElement(DirectoryScreen));
    const html = renderToStaticMarkup(
      createElement(ModuleBreadcrumb, { active: "directory" }),
    );
    expect(route.selectedTab).toBe(view);
    expect(route.selectedLabel).toBe(label);
    expect(html).toContain(`<span>${label}</span>`);
    expect(
      moduleCatalog
        .find((module) => module.slug === "directory")
        ?.chips.map((chip) => chip.label),
    ).toEqual(["Congress", "Committees", "DoW", "States"]);
  },
);

it("preserves the selected client when switching modules", () => {
  renderToStaticMarkup(
    createElement(ModuleBreadcrumb, { active: "directory" }),
  );
  route.switchModule!("workspace");
  expect(route.push).toHaveBeenCalledWith(
    "/modules/workspace?clientId=30000000-0000-4000-8000-000000000001",
  );
  route.switchModule!("unsupported");
  expect(route.push).toHaveBeenCalledTimes(1);
});

it("preserves other modules' catalog and hidden-breadcrumb behavior", () => {
  route.search = "view=district-nexus";
  expect(
    renderToStaticMarkup(
      createElement(ModuleBreadcrumb, { active: "intelligence" }),
    ),
  ).toContain("<span>District Nexus</span>");
  route.search = "view=legiwatch";
  expect(
    renderToStaticMarkup(
      createElement(ModuleBreadcrumb, { active: "intelligence" }),
    ),
  ).toBe("");
  route.search = "";
  expect(
    renderToStaticMarkup(
      createElement(ModuleBreadcrumb, { active: "workspace" }),
    ),
  ).not.toContain("Congressional Staff");
});
