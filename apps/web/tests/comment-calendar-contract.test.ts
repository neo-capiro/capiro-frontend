import { expect, it, vi } from "vitest";
import { loadCommentDeadlinePages } from "../src/shared/federal-register/comment-deadlines";
import { commentPage, commentRecord } from "./comment-calendar-fixtures";

it.each([
  ["2026-02-30", "2026-03-31"],
  ["2026-04-01", "2026-03-31"],
  ["2026-01-01", "2028-01-01"],
  ["2026-03-01T00:00:00Z", "2026-03-31"],
])(
  "rejects invalid or unsupported range%s/%s before transport",
  async (from, to) => {
    const read = vi.fn(async () => commentPage());
    await expect(loadCommentDeadlinePages(read, from, to)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  },
);

it("accepts a one-day inclusive range and the native maximum366-day difference", async () => {
  for (const [from, to] of [
    ["2026-03-08", "2026-03-08"],
    ["2026-01-01", "2027-01-02"],
  ] as const) {
    const read = vi.fn(async () =>
      commentPage([commentRecord("2026-12345", from)], from, to),
    );
    expect(
      (await loadCommentDeadlinePages(read, from, to)).records[0]!.date,
    ).toBe(from);
    expect(read).toHaveBeenCalledOnce();
  }
});

it("does not claim a shared immutable snapshot when total changes between valid candidate pages", async () => {
  const result = await loadCommentDeadlinePages(
    async ({ page }) => ({
      ...commentPage([], undefined, undefined, page),
      pagination: {
        totalCandidates: page === 1 ? 101 : 100,
        returned: 0,
        excludedOnPage: page === 1 ? 100 : 0,
        hasMoreCandidates: page === 1,
      },
    }),
    "2026-03-01",
    "2026-03-31",
  );
  expect(result.warnings.join(" ")).toContain("not one immutable snapshot");
  expect(result.records).toEqual([]);
});

it("rejects repeated document identity after an intervening cache correction instead of choosing a first match", async () => {
  await expect(
    loadCommentDeadlinePages(
      async ({ page }) => ({
        ...commentPage([commentRecord()], undefined, undefined, page),
        pagination: {
          totalCandidates: 101,
          returned: 1,
          excludedOnPage: page === 1 ? 99 : 0,
          hasMoreCandidates: page === 1,
        },
      }),
      "2026-03-01",
      "2026-03-31",
    ),
  ).rejects.toThrow(/repeated/);
});

it("does not call a reader when the scope is already aborted", async () => {
  const read = vi.fn(async () => commentPage());
  const controller = new AbortController();
  controller.abort();
  await expect(
    loadCommentDeadlinePages(
      read,
      "2026-03-01",
      "2026-03-31",
      controller.signal,
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(read).not.toHaveBeenCalled();
});
