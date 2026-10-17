import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { DirectoryScreen } from "./DirectoryScreen";

const route = vi.hoisted(() => ({
  search: "",
  selected: "",
  onView: null as ((view: string) => void) | null,
  pushed: [] as string[],
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/modules/directory",
  useSearchParams: () => new URLSearchParams(route.search),
  useRouter: () => ({
    push: (href: string) => route.pushed.push(href),
  }),
}));
vi.mock("../../../shared/module-ui", () => ({
  ActionButton: () => createElement("button"),
  PageHeader: () => createElement("h1", null, "Directory"),
  Tabs: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (id: string) => void;
  }) => {
    route.selected = value;
    route.onView = onChange;
    return createElement("nav");
  },
}));
// The route test observes only the selection boundary, not child queries.
vi.mock("./CommitteeDirectory", () => ({
  CommitteeDirectory: () => createElement("section"),
}));
vi.mock("./CongressionalContacts", () => ({
  CongressionalContacts: () => createElement("section"),
}));
vi.mock("./PersonnelDirectory", () => ({
  PersonnelDirectory: () => createElement("section"),
}));
vi.mock("./StateDirectory", () => ({
  StateDirectory: () => createElement("section"),
}));

beforeEach(() => {
  route.search = "clientId=30000000-0000-4000-8000-000000000001&filter=kept";
  route.selected = "";
  route.onView = null;
  route.pushed = [];
});

it("writes a Directory tab to the URL while preserving other scope hints", () => {
  renderToStaticMarkup(createElement(DirectoryScreen));
  expect(route.selected).toBe("congressional-staff");
  route.onView?.("department-of-war");
  expect(route.pushed).toEqual([
    "/modules/directory?clientId=30000000-0000-4000-8000-000000000001&filter=kept&view=department-of-war",
  ]);
});

it("derives the selected tab from restored and changed URLs", () => {
  route.search = "view=department-of-war";
  renderToStaticMarkup(createElement(DirectoryScreen));
  expect(route.selected).toBe("department-of-war");
  route.search = "view=committee-staff";
  renderToStaticMarkup(createElement(DirectoryScreen));
  expect(route.selected).toBe("committee-staff");
  route.search = "view=unknown";
  renderToStaticMarkup(createElement(DirectoryScreen));
  expect(route.selected).toBe("congressional-staff");
});

it("restores the DoW detail layout for a valid selected ID", () => {
  route.search =
    "view=department-of-war&personnelId=00000000-0000-4000-8000-000000000001";
  const html = renderToStaticMarkup(createElement(DirectoryScreen));
  expect(html).not.toContain("<h1>Directory</h1>");
  expect(html).not.toContain("<nav");
});

it("keeps navigation available for malformed or duplicate detail IDs", () => {
  for (const suffix of [
    "personnelId=invalid",
    "personnelId=00000000-0000-4000-8000-000000000001&personnelId=00000000-0000-4000-8000-000000000001",
  ]) {
    route.search = `view=department-of-war&${suffix}`;
    const html = renderToStaticMarkup(createElement(DirectoryScreen));
    expect(html).toContain("<h1>Directory</h1>");
    route.onView?.("committee-staff");
    expect(route.pushed.at(-1)).toBe("/modules/directory?view=committee-staff");
  }
});
