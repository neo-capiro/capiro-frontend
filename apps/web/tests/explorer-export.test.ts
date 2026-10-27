import { describe, expect, it } from "vitest";
import {
  collectExplorerExport,
  explorerCsv,
} from "../src/features/modules/intelligence/explorer-export";

describe("Explorer export completeness", () => {
  it("collects every current page without substituting the visible page", async () => {
    const pages: number[] = [];
    const rows = await collectExplorerExport(3, async (page) => {
      pages.push(page);
      return {
        total: 3,
        rows: page === 1 ? [{ id: "a" }, { id: "b" }] : [{ id: "c" }],
      };
    });
    expect(pages).toEqual([1, 2]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });
  it("refuses duplicates, count changes and empty premature pages", async () => {
    for (const result of [
      { total: 2, rows: [{ id: "a" }, { id: "a" }] },
      { total: 1, rows: [{ id: "a" }] },
      { total: 2, rows: [] },
    ])
      await expect(
        collectExplorerExport(2, async () => result),
      ).rejects.toThrow("results changed");
  });
  it("refuses over-limit exports before requesting any data", async () => {
    await expect(
      collectExplorerExport(10001, async () => {
        throw new Error("must not read");
      }),
    ).rejects.toThrow("Narrow the filters");
  });
  it("escapes quotes, preserves large integer strings and neutralizes spreadsheet formulas", () => {
    const csv = explorerCsv([
      {
        id: "a",
        title: '=HYPERLINK("bad")',
        amount: "9007199254740993123",
        summary: "line1\nline2",
      },
    ]);
    expect(csv).toContain('"9007199254740993123"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"line1\nline2"');
  });
});
