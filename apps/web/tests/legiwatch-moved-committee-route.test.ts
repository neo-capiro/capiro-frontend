import { beforeEach, expect, it, vi } from "vitest";
import { useLegiWatchRoute } from "../src/features/modules/intelligence/legiwatch/use-legiwatch-route";
import { useCommitteeRoute } from "../src/features/modules/directory/committees/committee-route";

const state = vi.hoisted(() => ({
  search: "",
  effects: [] as (() => void)[],
  replace: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.search),
  usePathname: () => "/modules/intelligence",
  useRouter: () => ({ replace: state.replace, push: state.push }),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => state.effects.push(effect),
}));
beforeEach(() => {
  state.effects = [];
  state.replace.mockReset();
});

it.each([
  ["&committeeId=state%3AFL%3Afl-one", "state:FL:fl-one", "FL"],
  ["&committeeId=committee-one&jurisdiction=FL", "committee-one", "US"],
  ["", null, "US"],
  ["&jurisdiction=FL", null, "FL"],
])(
  "moves an old committee bookmark and restores its destination: %s",
  (suffix, id, jurisdiction) => {
    state.search = `view=legiwatch&lw=committees&clientId=client-hint${suffix}`;
    const route = useLegiWatchRoute();
    expect(route.movedCommitteeHref).toBeTruthy();
    expect(state.replace).not.toHaveBeenCalled();
    state.effects.forEach((effect) => effect());
    expect(state.replace).toHaveBeenCalledWith(route.movedCommitteeHref, {
      scroll: false,
    });
    const url = new URL(route.movedCommitteeHref!, "https://example.test");
    expect(url.pathname).toBe("/modules/directory");
    expect(url.searchParams.get("view")).toBe("committees");
    expect(url.searchParams.has("lw")).toBe(false);
    state.search = url.search.slice(1);
    const restored = useCommitteeRoute();
    expect(restored.committeeId).toBe(id);
    expect(restored.jurisdiction).toBe(jurisdiction);
    expect(url.searchParams.get("clientId")).toBe("client-hint");
  },
);

it("keeps retained LegiWatch routes in place", () => {
  state.search = "view=legiwatch&lw=hearings&hearingId=hearing-one";
  expect(useLegiWatchRoute().movedCommitteeHref).toBeNull();
  state.effects.forEach((effect) => effect());
  expect(state.replace).not.toHaveBeenCalled();
});
