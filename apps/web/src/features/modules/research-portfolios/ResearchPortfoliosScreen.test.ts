import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { ResearchPortfoliosScreen } from "./ResearchPortfoliosScreen";

const route = vi.hoisted(() => ({
  search: "",
  pushed: [] as string[],
  reloads: 0,
  queryCursors: [] as (string | undefined)[],
  pagination: null as null | {
    filterKey: string;
    cursor?: string;
    history: (string | undefined)[];
  },
}));

// Render the screen's element tree without mounting its unrelated child queries.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      type Page = NonNullable<typeof route.pagination>;
      const current = (route.pagination ?? initial) as Page;
      return [
        current,
        (next: Page | ((previous: Page) => Page)) => {
          route.pagination =
            typeof next === "function"
              ? next(route.pagination ?? current)
              : next;
        },
      ];
    },
    useRef: (initial: unknown) => ({ current: initial }),
    useEffect: (effect: () => void) => effect(),
  };
});
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(route.search),
  useRouter: () => ({ push: (href: string) => route.pushed.push(href) }),
}));
vi.mock("../../../shared/capiro/queries", () => ({
  useCapiroQuery: (_key: string, input: { query: { cursor?: string } }) => {
    route.queryCursors.push(input.query.cursor);
    return {
      data: {
        items: [
          {
            id: "portfolio-1",
            name: "Synthetic portfolio",
            myRole: "owner",
            mode: "manual",
            lifecycle: "active",
          },
        ],
      },
      loading: false,
      reload: () => route.reloads++,
    };
  },
}));
vi.mock("../../../shared/module-ui", () => ({
  ActionButton: "action-button",
  Badge: "badge",
  PageHeader: "page-header",
  StatusPanel: "status-panel",
}));
vi.mock("./ResearchCreate", () => ({
  ResearchCreateAction: "research-create",
}));
vi.mock("./ResearchDetail", () => ({
  ResearchPortfolioDetail: "research-detail",
}));

type Element = ReactElement<Record<string, unknown>>;
function findElement(
  node: ReactNode,
  type: string,
  matches: (element: Element) => boolean = () => true,
): Element | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type, matches);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  if (node.type === type && matches(node as Element)) return node as Element;
  return findElement(
    (node.props as { children?: ReactNode }).children,
    type,
    matches,
  );
}

beforeEach(() => {
  route.search = "clientId=selected-client&source=hub&view=members";
  route.pushed = [];
  route.reloads = 0;
  route.queryCursors = [];
  route.pagination = null;
});

it("opens a list card with the current tab and selected-client query intact", () => {
  const screen = ResearchPortfoliosScreen();
  const card = findElement(screen, "button");
  expect(card).toBeDefined();
  (card?.props.onClick as () => void)();
  expect(route.pushed).toEqual([
    "/modules/research-portfolios?clientId=selected-client&source=hub&portfolioId=portfolio-1&view=members",
  ]);
});

it("opens the confirmed created portfolio and refreshes the list", () => {
  const screen = ResearchPortfoliosScreen();
  const header = findElement(screen, "page-header");
  const create = findElement(
    header?.props.actions as ReactNode,
    "research-create",
  );
  expect(create).toBeDefined();
  (create?.props.onCreated as (id: string) => void)("portfolio-2");
  expect(route.reloads).toBe(1);
  expect(route.pushed).toEqual([
    "/modules/research-portfolios?clientId=selected-client&source=hub&portfolioId=portfolio-2&view=members",
  ]);
});

it("derives detail selection from each URL and preserves it across tab and back actions", () => {
  route.search += "&portfolioId=portfolio-1";
  const detail = findElement(ResearchPortfoliosScreen(), "research-detail");
  expect(detail?.props).toMatchObject({ id: "portfolio-1", view: "members" });
  (detail?.props.onView as (view: string) => void)("analytics");
  expect(route.pushed[0]).toBe(
    "/modules/research-portfolios?clientId=selected-client&source=hub&portfolioId=portfolio-1&view=analytics",
  );

  route.search = route.pushed[0]!.split("?")[1]!;
  const restored = findElement(ResearchPortfoliosScreen(), "research-detail");
  expect(restored?.props.view).toBe("analytics");
  (restored?.props.onBack as () => void)();
  expect(route.pushed[1]).toBe(
    "/modules/research-portfolios?clientId=selected-client&source=hub&view=analytics",
  );

  route.search = "portfolioId=portfolio-1&view=members";
  expect(
    findElement(ResearchPortfoliosScreen(), "research-detail")?.props.view,
  ).toBe("members");
});

it("restores list filters from the URL and writes changes without dropping scope hints", () => {
  route.search += "&role=viewer&mode=hybrid&lifecycle=all";
  const screen = ResearchPortfoliosScreen();
  const role = findElement(
    screen,
    "select",
    (element) => element.props["aria-label"] === "Portfolio role",
  );
  const mode = findElement(
    screen,
    "select",
    (element) => element.props["aria-label"] === "Portfolio mode",
  );
  const lifecycle = findElement(
    screen,
    "select",
    (element) => element.props["aria-label"] === "Portfolio status",
  );
  expect([
    role?.props.value,
    mode?.props.value,
    lifecycle?.props.value,
  ]).toEqual(["viewer", "hybrid", "all"]);
  expect(findElement(screen, "button")).toBeUndefined();
  (role?.props.onChange as (event: { target: { value: string } }) => void)({
    target: { value: "owner" },
  });
  expect(route.pushed).toEqual([
    "/modules/research-portfolios?clientId=selected-client&source=hub&view=members&role=owner&mode=hybrid&lifecycle=all",
  ]);

  route.search = "clientId=selected-client&source=hub&role=owner";
  const restored = ResearchPortfoliosScreen();
  expect(findElement(restored, "button")).toBeDefined();
  expect(
    findElement(
      restored,
      "select",
      (element) => element.props["aria-label"] === "Portfolio role",
    )?.props.value,
  ).toBe("owner");
});

it("resets local opaque pagination when a restored URL changes filters", () => {
  route.pagination = {
    filterKey: "::active",
    cursor: "opaque-second-page",
    history: [undefined],
  };
  route.search =
    "clientId=selected-client&role=owner&cursor=untrusted-url-value";
  ResearchPortfoliosScreen();
  expect(route.queryCursors).toEqual([undefined]);
  expect(route.pagination).toEqual({
    filterKey: "owner::active",
    cursor: undefined,
    history: [],
  });

  route.search = "clientId=selected-client";
  ResearchPortfoliosScreen();
  expect(route.queryCursors).toEqual([undefined, undefined]);
  expect(route.pagination).toEqual({
    filterKey: "::active",
    cursor: undefined,
    history: [],
  });
});
