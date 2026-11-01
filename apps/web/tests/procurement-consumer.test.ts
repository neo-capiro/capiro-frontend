import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  first,
  second,
  snapshot,
  populated,
} from "./fixtures/procurement-consumer";
import { procurementMoneyFlow } from "../src/shared/capiro/operations/procurement-money-flow";
import { ProcurementPanel } from "../src/features/modules/intelligence/research/ProcurementPanel";
import { AcquisitionRecords } from "../src/features/modules/intelligence/research/AcquisitionRecords";
import { useProcurementSelection } from "../src/features/modules/intelligence/research/useProcurementSelection";
import {
  procurementHref,
  procurementUsd,
  readProcurementSelection,
  sameProcurementScope,
  writeProcurementSelection,
} from "../src/features/modules/intelligence/research/procurement-selection";

const state = vi.hoisted(() => ({
  params: "",
  path: "/modules/intelligence",
  pushes: [] as string[],
  reads: [] as { key: string; input: unknown; enabled?: boolean }[],
  data: undefined as unknown,
  error: undefined as Error | undefined,
  loading: false,
  acquisitions: [] as unknown[],
}));
// React's server renderer cannot start navigation transitions. The callback is
// synchronous here; the hook's imperative guard is tested before URL commit.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useTransition: () => [false, (callback: () => void) => callback()],
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
  useSearchParams: () => new URLSearchParams(state.params),
  useRouter: () => ({ push: (url: string) => state.pushes.push(url) }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (
    key: string,
    input: unknown,
    options?: { enabled?: boolean },
  ) => {
    state.reads.push({ key, input, enabled: options?.enabled });
    return key === "defenseResearch.acquisitions"
      ? {
          data: {
            items: state.acquisitions,
            page: 1,
            total: state.acquisitions.length,
            limit: 25,
          },
          loading: false,
          reload: vi.fn(),
        }
      : {
          data: state.data,
          error: state.error,
          loading: state.loading,
          reload: vi.fn(),
        };
  },
}));

const render = (mode: "hub" | "money-flow" = "money-flow") =>
  renderToStaticMarkup(createElement(ProcurementPanel, { mode }));
function selectionHook() {
  let selection: ReturnType<typeof useProcurementSelection> | undefined;
  function Probe() {
    selection = useProcurementSelection();
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return selection!;
}
beforeEach(() => {
  state.params = new URLSearchParams({ procurementAward: first }).toString();
  state.data = procurementMoneyFlow.parse(populated());
  state.error = undefined;
  state.loading = false;
  state.reads = [];
  state.pushes = [];
  state.acquisitions = [];
  state.path = "/modules/intelligence";
});

describe("exact selected-award navigation", () => {
  it("round trips two numeric PIIDs with different agency identities and microsecond clocks", () => {
    const scope = {
      awardIdentityKeys: [first, second],
      knownAt: snapshot,
      sourceThrough: "2026-10-31T00:00:00.000001Z",
    };
    const url = new URL(
      procurementHref("hub", scope, "synthetic-client"),
      "https://example.invalid",
    );
    expect(readProcurementSelection(url.searchParams).scope).toEqual(scope);
    expect(url.searchParams.get("clientId")).toBe("synthetic-client");
    expect(procurementHref("acquisitions", scope, "")).toContain(
      "researchSegment=acquisitions",
    );
  });
  it("rejects duplicate, malformed and over-limit URL selections without truncating", () => {
    for (const keys of [
      [first, first],
      ["0007"],
      Array.from({ length: 26 }, (_, i) => first.replace("0007", String(i))),
    ]) {
      const params = writeProcurementSelection(new URLSearchParams(), {
        awardIdentityKeys: keys,
      });
      expect(readProcurementSelection(params)).toMatchObject({
        scope: null,
        error: expect.any(String),
      });
    }
  });
  it("removes one full identity while preserving search, paging and client; membership change clears snapshot", () => {
    state.params = writeProcurementSelection(
      new URLSearchParams(
        "researchQuery=ship&researchPage=2&clientId=synthetic",
      ),
      { awardIdentityKeys: [first, second], knownAt: snapshot },
    ).toString();
    selectionHook().remove(first);
    const url = new URL(state.pushes[0]!, "https://example.invalid");
    expect(url.searchParams.getAll("procurementAward")).toEqual([second]);
    expect(url.searchParams.get("procurementKnownAt")).toBeNull();
    expect(url.searchParams.get("researchPage")).toBe("2");
    expect(url.searchParams.get("researchQuery")).toBe("ship");
    expect(url.searchParams.get("clientId")).toBe("synthetic");
  });
  it("selection toggles and clear never silently replace or widen a full cohort", () => {
    const keys = Array.from({ length: 25 }, (_, i) =>
      first.replace("0007", String(i)),
    );
    state.params = writeProcurementSelection(new URLSearchParams(), {
      awardIdentityKeys: keys,
    }).toString();
    selectionHook().toggle(second);
    expect(state.pushes).toEqual([]);
    selectionHook().clear();
    expect(
      new URL(state.pushes[0]!, "https://example.invalid").searchParams.getAll(
        "procurementAward",
      ),
    ).toEqual([]);
  });
  it("compares exact scopes and pinned clocks before admitting output", () => {
    const data = populated();
    expect(sameProcurementScope({ awardIdentityKeys: [first] }, data)).toBe(
      true,
    );
    expect(sameProcurementScope({ awardIdentityKeys: [second] }, data)).toBe(
      false,
    );
    expect(
      sameProcurementScope(
        {
          awardIdentityKeys: [first],
          knownAt: snapshot.replace("123456", "123455"),
        },
        data,
      ),
    ).toBe(false);
    expect(
      sameProcurementScope(
        { awardIdentityKeys: [first], sourceThrough: snapshot },
        data,
      ),
    ).toBe(false);
  });
  it("serializes two selection mutations before navigation commits, without dropping the first", () => {
    const selection = selectionHook();
    selection.toggle(second);
    selection.remove(first);
    selection.update({ researchPage: "2", researchQuery: "ship" });
    expect(state.pushes).toHaveLength(1);
    expect(
      new URL(state.pushes[0]!, "https://example.invalid").searchParams.getAll(
        "procurementAward",
      ),
    ).toEqual([first, second]);
    state.params = new URL(
      state.pushes[0]!,
      "https://example.invalid",
    ).search.slice(1);
    selectionHook().remove(first);
    expect(
      new URL(state.pushes[1]!, "https://example.invalid").searchParams.getAll(
        "procurementAward",
      ),
    ).toEqual([second]);
  });
  it("serializes paging and client changes with award selection in either direction", () => {
    const selection = selectionHook();
    selection.update({ researchPage: "2", clientId: "synthetic-client" });
    selection.toggle(second);
    expect(state.pushes).toHaveLength(1);
    const url = new URL(state.pushes[0]!, "https://example.invalid");
    expect(url.searchParams.getAll("procurementAward")).toEqual([first]);
    expect(url.searchParams.get("researchPage")).toBe("2");
    expect(url.searchParams.get("clientId")).toBe("synthetic-client");
  });
});

describe("Money Flow and Hub mounted consumers", () => {
  it("uses the scoped POST operation with no inferred client or descendant authority", () => {
    state.params += "&clientId=synthetic-client";
    const html = render();
    expect(state.reads[0]).toEqual({
      key: "procurement.moneyFlow",
      input: { body: { awardIdentityKeys: [first] } },
      enabled: true,
    });
    expect(html).toContain("Partial source coverage");
    expect(html).toContain("-$9,007,199,254,740,993.000001");
    expect(html).toContain("Not reported");
    expect(html).toContain("Undated");
    expect(html).toContain("Unresolved identity");
    expect(html).toContain(first);
    expect(html).toContain("2026-10-31T00:00:00.000002Z");
    expect(html).toContain("synthetic-run");
    expect(html).toContain(
      "procurementKnownAt=2026-11-01T01%3A02%3A03.123456Z",
    );
  });
  it("renders Hub from its own canonical same-scope summary route, preserving the snapshot on its link", () => {
    const { groups, ...rest } = populated();
    state.data = { ...rest, groupCount: groups.length };
    const html = render("hub");
    expect(state.reads[0]?.key).toBe("procurement.hubSummary");
    expect(html).toContain("1 fiscal year, agency and vendor groups");
    expect(html).toContain("Open Money Flow for these awards");
    expect(html).toContain("researchSegment=acquisitions");
    expect(html).toContain("procurementKnownAt=");
  });
  it("does not request aggregate money when no award was selected", () => {
    state.params = "clientId=synthetic";
    const html = render("hub");
    expect(state.reads[0]?.enabled).toBe(false);
    expect(html).toContain("Choose awards in Acquisitions");
    expect(html).not.toContain("-$9");
  });
  it("keeps no-selected-action output unavailable without turning it into zero", () => {
    state.data = {
      ...populated(),
      state: "unavailable",
      totals: null,
      groups: [],
      provenance: [],
      coverage: { unqualified: "3" },
    };
    const html = render();
    expect(html).toContain("does not mean zero spending");
    expect(html).not.toContain("$0");
    expect(html).toContain("unqualified: 3");
  });
  it.each([401, 403, 404, 503])(
    "withholds stale financial data after an HTTP %s refusal",
    (status) => {
      state.error = Object.assign(new Error("Procurement read unavailable"), {
        status,
      });
      const html = render();
      expect(html).toContain('role="alert"');
      expect(html).not.toContain("-$9");
      expect(html).not.toContain("synthetic-run");
      if (status === 401) expect(html).toContain("Sign in again");
      if (status === 403) expect(html).toContain("does not have access");
    },
  );
  it("withholds stale money while refreshing or when a response belongs to another scope", () => {
    state.loading = true;
    expect(render()).not.toContain("-$9");
    state.loading = false;
    state.params = new URLSearchParams({ procurementAward: second }).toString();
    expect(render()).toContain("did not match this selection");
    expect(render()).not.toContain("-$9");
  });
  it("refuses an invalid selection without a financial read and offers clear selection on Hub", () => {
    state.params = "procurementAward=0007";
    expect(render("hub")).toContain("Clear selection");
    expect(state.reads[0]?.enabled).toBe(false);
  });
  it("mounts award selection in the existing acquisitions list; notices are never converted into awards", () => {
    state.acquisitions = [first, second, "sam|notice|synthetic"].map(
      (identityKey) => ({
        identityKey,
        title: "Synthetic record",
        sourceRecordId: identityKey,
        sourceSystem: "synthetic",
        recordKind: "record",
        status: null,
        textAvailability: "unavailable",
        amendmentCount: 0,
        openCoverageGaps: 0,
      }),
    );
    const html = renderToStaticMarkup(createElement(AcquisitionRecords));
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain("Not an award");
    expect(html).toContain("Procurement Money Flow");
  });
  it("never creates unsafe source anchors", () => {
    const data = populated();
    state.data = {
      ...data,
      provenance: [{ ...data.provenance[0], sourceUrl: "javascript:alert(1)" }],
    };
    expect(render()).not.toContain("javascript:");
  });
});

it("formats zero, signed fractional and very large decimal values without Number coercion", () => {
  expect(procurementUsd("0")).toBe("$0");
  expect(procurementUsd("-0.000001")).toBe("-$0.000001");
  expect(procurementUsd("123456789012345678901234567890.12")).toBe(
    "$123,456,789,012,345,678,901,234,567,890.12",
  );
  expect(procurementUsd(null)).toBe("Not reported");
  expect(procurementUsd("NaN")).toBe("Not available");
});
