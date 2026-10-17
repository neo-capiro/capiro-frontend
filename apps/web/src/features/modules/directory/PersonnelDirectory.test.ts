import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { PersonnelDirectory } from "./PersonnelDirectory";

const route = vi.hoisted(() => ({
  search: "",
  pushed: [] as string[],
  replaced: [] as string[],
  inputValue: "",
  inputChange: null as ((event: { target: { value: string } }) => void) | null,
  page: 0,
  pageChange: null as ((page: number) => void) | null,
  rowClick: null as (() => void) | null,
  previewOpen: null as (() => void) | null,
  detailBack: null as (() => void) | null,
  profileUrl: null as string | null,
  rowId: "00000000-0000-4000-8000-000000000001",
  listError: undefined as Error | undefined,
  listLoading: false,
  query: null as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/modules/directory",
  useSearchParams: () => new URLSearchParams(route.search),
  useRouter: () => ({
    push: (href: string) => route.pushed.push(href),
    replace: (href: string) => route.replaced.push(href),
  }),
}));

vi.mock("../../../shared/capiro/queries", () => ({
  useCapiroQuery: (_key: string, input: { query: Record<string, unknown> }) => {
    route.query = input.query;
    return {
      loading: route.listLoading,
      error: route.listError,
      reload: vi.fn(),
      data: {
        data: [
          {
            id: route.rowId,
            fullName: "Casey Bennett",
            title: "Program Analyst",
            role: null,
            organization: "Acquisition office",
            service: "Army",
            pePrimary: null,
            peSecondary: [],
            status: "active",
            sourceCount: 1,
            email: null,
            publicProfileUrl: route.profileUrl,
          },
        ],
        total: 26,
      },
    };
  },
}));

function findButton(node: ReactNode): (() => void) | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const click = findButton(child);
      if (click) return click;
    }
    return null;
  }
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node))
    return null;
  if (node.type === "button") return node.props.onClick ?? null;
  return findButton(node.props.children);
}

vi.mock("../../../shared/module-ui", () => ({
  ActionButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => createElement("button", { onClick }, children),
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
  DataTable: ({
    rows,
    columns,
  }: {
    rows: unknown[];
    columns: { key: string; render: (row: unknown) => ReactNode }[];
  }) => {
    const name = columns
      .find((column) => column.key === "name")!
      .render(rows[0]);
    const contact = columns
      .find((column) => column.key === "contact")!
      .render(rows[0]);
    route.rowClick = findButton(name);
    return createElement("div", null, name, contact);
  },
  Panel: ({ children }: { children: ReactNode }) =>
    createElement("section", null, children),
  StatusPanel: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  TextInput: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (event: { target: { value: string } }) => void;
  }) => {
    route.inputValue = value;
    route.inputChange = onChange;
    return createElement("input", { value, readOnly: true });
  },
}));

vi.mock("./DirectoryPagination", () => ({
  DirectoryPagination: ({
    page,
    onPage,
  }: {
    page: number;
    onPage: (page: number) => void;
  }) => {
    route.page = page;
    route.pageChange = onPage;
    return createElement("div");
  },
}));
vi.mock("./PersonnelProfile", () => ({
  PersonnelProfile: ({ id, onBack }: { id: string; onBack: () => void }) => {
    route.detailBack = onBack;
    return createElement("div", null, `Selected profile ${id}`);
  },
}));
vi.mock("./PersonnelPreview", () => ({
  PersonnelPreview: ({
    person,
    onOpen,
  }: {
    person?: { fullName: string };
    onOpen: () => void;
  }) => {
    route.previewOpen = person ? onOpen : null;
    return createElement(
      "div",
      null,
      person ? `Selected preview ${person.fullName}` : "Select a person",
    );
  },
}));

function render(onDetailChange = vi.fn()) {
  return renderToStaticMarkup(
    createElement(PersonnelDirectory, { onDetailChange }),
  );
}

beforeEach(() => {
  route.search =
    "view=department-of-war&clientId=client-1&personnelQ=policy&personnelService=Army&personnelAligned=aligned&personnelPage=2";
  route.pushed = [];
  route.replaced = [];
  route.query = null;
  route.rowClick = null;
  route.previewOpen = null;
  route.detailBack = null;
  route.profileUrl = null;
  route.rowId = "00000000-0000-4000-8000-000000000001";
  route.listError = undefined;
  route.listLoading = false;
});

it("restores bounded Personnel filters and preserves other URL hints on edits", () => {
  render();
  expect(route.query).toMatchObject({
    q: "policy",
    service: "Army",
    pe_aligned: "aligned",
    page: 2,
  });
  expect(route.inputValue).toBe("policy");
  expect(route.page).toBe(2);

  route.inputChange?.({ target: { value: "space" } });
  expect(route.replaced[0]).toBe(
    "/modules/directory?view=department-of-war&clientId=client-1&personnelQ=space&personnelService=Army&personnelAligned=aligned",
  );
  route.pageChange?.(3);
  expect(route.pushed[0]).toContain("clientId=client-1");
  expect(route.pushed[0]).toContain("personnelPage=3");

  route.search =
    "view=department-of-war&personnelQ=" +
    "x".repeat(501) +
    "&personnelService=unknown&personnelAligned=invalid&personnelPage=0";
  render();
  expect(route.query).toMatchObject({
    q: "",
    service: undefined,
    pe_aligned: undefined,
    page: 1,
  });
});

it("selects a current row before opening its profile and restores both URL states", () => {
  const detailChange = vi.fn();
  render(detailChange);
  expect(route.rowClick).toBeTypeOf("function");
  route.rowClick?.();
  expect(route.pushed).toEqual([
    "/modules/directory?view=department-of-war&clientId=client-1&personnelQ=policy&personnelService=Army&personnelAligned=aligned&personnelPage=2&personnelPreviewId=00000000-0000-4000-8000-000000000001",
  ]);
  const previewUrl = route.pushed[0]!;
  route.search = previewUrl.split("?")[1]!;
  expect(render(detailChange)).toContain("Selected preview Casey Bennett");
  expect(render(detailChange)).not.toContain("Selected profile");
  route.previewOpen?.();
  expect(detailChange).toHaveBeenCalledWith(true);
  const profileUrl = route.pushed[1]!;
  expect(profileUrl).toContain(
    "personnelPreviewId=00000000-0000-4000-8000-000000000001",
  );
  expect(profileUrl).toContain(
    "personnelId=00000000-0000-4000-8000-000000000001",
  );
  route.search = profileUrl.split("?")[1]!;
  expect(render(detailChange)).toContain("Selected profile");
  // A new render with no local selection state models a reloaded page.
  expect(render(detailChange)).toContain("Selected profile");
  route.search = previewUrl.split("?")[1]!;
  expect(render(detailChange)).not.toContain("Selected profile");
  expect(render(detailChange)).toContain("Selected preview Casey Bennett");
  route.search = profileUrl.split("?")[1]!;
  expect(render(detailChange)).toContain("Selected profile");
  route.detailBack?.();
  expect(detailChange).toHaveBeenLastCalledWith(false);
  expect(route.replaced.at(-1)).toBe(previewUrl);
  route.search = route.replaced.at(-1)!.split("?")[1]!;
  expect(render(detailChange)).not.toContain("Selected profile");
  expect(render(detailChange)).toContain("Selected preview Casey Bennett");
  expect(route.query).toMatchObject({
    q: "policy",
    service: "Army",
    pe_aligned: "aligned",
    page: 2,
  });
});

it("clears detail selection when a filter changes", () => {
  const selectedRoute =
    route.search +
    "&personnelPreviewId=00000000-0000-4000-8000-000000000001&personnelId=00000000-0000-4000-8000-000000000001";
  route.search = selectedRoute;
  expect(render()).toContain("Selected profile");
  route.inputChange?.({ target: { value: "previous" } });
  expect(route.replaced.at(-1)).not.toContain("personnelId");
  expect(route.replaced.at(-1)).not.toContain("personnelPreviewId");
  route.search = route.replaced.at(-1)!.split("?")[1]!;
  expect(render()).not.toContain("Selected profile");

  route.search = selectedRoute;
  render();
  route.pageChange?.(3);
  expect(route.pushed.at(-1)).toContain("personnelPage=3");
  expect(route.pushed.at(-1)).not.toContain("personnelId");
  expect(route.pushed.at(-1)).not.toContain("personnelPreviewId");
});

it("restores only a valid preview from the current list scope", () => {
  const base = route.search;
  const id = "00000000-0000-4000-8000-000000000001";
  route.search = `${base}&personnelPreviewId=${id}`;
  expect(render()).toContain("Selected preview Casey Bennett");
  for (const suffix of [
    "personnelPreviewId=not-a-uuid",
    `personnelPreviewId=${id}&personnelPreviewId=${id}`,
    "personnelPreviewId=00000000-0000-4000-8000-000000000002",
  ]) {
    route.search = `${base}&${suffix}`;
    expect(render()).not.toContain("Selected preview");
  }
  route.search = `${base}&personnelPreviewId=${id}`;
  route.rowId = "00000000-0000-4000-8000-000000000002";
  expect(render()).not.toContain("Selected preview");
  route.rowId = id;
  route.listError = new Error("Current list unavailable");
  expect(render()).not.toContain("Selected preview");
  route.listError = undefined;
  route.listLoading = true;
  expect(render()).not.toContain("Selected preview");
  route.listLoading = false;
  expect(render()).toContain("Selected preview Casey Bennett");
});

it("lets a verified detail ID take precedence over a conflicting preview hint", () => {
  route.search +=
    "&personnelId=00000000-0000-4000-8000-000000000001&personnelPreviewId=00000000-0000-4000-8000-000000000002";
  expect(render()).toContain("Selected profile");
  route.detailBack?.();
  expect(route.replaced.at(-1)).toContain(
    "personnelPreviewId=00000000-0000-4000-8000-000000000001",
  );
  expect(route.replaced.at(-1)).not.toContain("personnelId=");
});

it("fails closed for malformed, duplicate, or no-longer-returned detail ids", () => {
  const base = route.search;
  for (const suffix of [
    "&personnelId=not-a-uuid",
    "&personnelId=00000000-0000-4000-8000-000000000001&personnelId=00000000-0000-4000-8000-000000000001",
    "&personnelId=00000000-0000-4000-8000-000000000002",
  ]) {
    route.search = base + suffix;
    expect(render()).not.toContain("Selected profile");
  }
  route.search = base + "&personnelId=00000000-0000-4000-8000-000000000001";
  route.rowId = "00000000-0000-4000-8000-000000000002";
  expect(render()).not.toContain("Selected profile");
  route.rowId = "00000000-0000-4000-8000-000000000001";
  route.listError = new Error("Current list unavailable");
  expect(render()).not.toContain("Selected profile");
  route.listError = undefined;
  route.listLoading = true;
  expect(render()).not.toContain("Selected profile");
  route.listLoading = false;
  expect(render()).toContain("Selected profile");
});

it("does not open a list row with an unusable Core ID", () => {
  route.rowId = "not-a-uuid";
  const detailChange = vi.fn();
  render(detailChange);
  route.rowClick?.();
  expect(route.pushed).toEqual([]);
  expect(detailChange).not.toHaveBeenCalledWith(true);
});

it("does not retain the profile when browser history switches list scope", () => {
  route.search += "&personnelId=00000000-0000-4000-8000-000000000001";
  expect(render()).toContain("Selected profile");
  route.search =
    "view=department-of-war&clientId=client-1&personnelQ=previous&personnelService=Army&personnelAligned=aligned&personnelPage=2";
  expect(render()).not.toContain("Selected profile");
  expect(route.query).toMatchObject({ q: "previous", page: 2 });
});

it.each([
  "javascript:alert(1)",
  "not-a-url",
  "http://",
  "https://user:secret@example.org/profile",
])("does not offer an invalid public profile URL as a link: %s", (url) => {
  route.profileUrl = url;
  const html = render();
  expect(html).toContain("Not available");
  expect(html).not.toContain("Public profile");
  expect(html).not.toContain("<a ");
});

it("opens a validated public profile URL", () => {
  route.profileUrl = "https://example.org/profile";
  const html = render();
  expect(html).toContain('href="https://example.org/profile"');
  expect(html).toContain("Public profile");
});
