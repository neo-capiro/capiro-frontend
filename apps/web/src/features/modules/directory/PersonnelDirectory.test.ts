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
  detailBack: null as (() => void) | null,
  query: null as Record<string, unknown> | null,
  hooks: [] as unknown[],
  hookIndex: 0,
}));

vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    useState: <T>(initial: T) => {
      const index = route.hookIndex++;
      if (!(index in route.hooks)) route.hooks[index] = initial;
      return [
        route.hooks[index] as T,
        (next: T | ((value: T) => T)) => {
          route.hooks[index] =
            typeof next === "function"
              ? (next as (value: T) => T)(route.hooks[index] as T)
              : next;
        },
      ] as const;
    },
  };
});

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
      loading: false,
      error: undefined,
      reload: vi.fn(),
      data: {
        data: [
          {
            id: "00000000-0000-4000-8000-000000000001",
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
            publicProfileUrl: null,
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
    const rendered = columns
      .find((column) => column.key === "name")!
      .render(rows[0]);
    route.rowClick = findButton(rendered);
    return createElement("div", null, rendered);
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
  PersonnelProfile: ({ onBack }: { onBack: () => void }) => {
    route.detailBack = onBack;
    return createElement("div", null, "Selected profile");
  },
}));

function render(onDetailChange = vi.fn()) {
  route.hookIndex = 0;
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
  route.hooks = [];
  route.hookIndex = 0;
  route.rowClick = null;
  route.detailBack = null;
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

it("opens only a returned list row, then returns to the same filters", () => {
  const detailChange = vi.fn();
  render(detailChange);
  expect(route.rowClick).toBeTypeOf("function");
  route.rowClick?.();
  expect(detailChange).toHaveBeenCalledWith(true);
  expect(render(detailChange)).toContain("Selected profile");
  route.detailBack?.();
  expect(detailChange).toHaveBeenLastCalledWith(false);
  expect(render(detailChange)).not.toContain("Selected profile");
  expect(route.query).toMatchObject({
    q: "policy",
    service: "Army",
    pe_aligned: "aligned",
    page: 2,
  });
});

it("does not keep a selected profile visible after browser Back changes list scope", () => {
  const detailChange = vi.fn();
  render(detailChange);
  route.rowClick?.();
  expect(render(detailChange)).toContain("Selected profile");
  route.search =
    "view=department-of-war&clientId=client-1&personnelQ=previous&personnelService=Army&personnelAligned=aligned&personnelPage=2";
  expect(render(detailChange)).not.toContain("Selected profile");
  expect(route.query).toMatchObject({ q: "previous", page: 2 });
});
