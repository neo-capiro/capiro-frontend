import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect, it, vi} from "vitest";
import {MemoryFiles} from "../src/features/settings/memory/MemoryFiles";
import {memoryFilesOperations} from "../src/shared/capiro/operations/memory-files";
const query = vi.hoisted(() => vi.fn());
vi.mock("../src/shared/capiro/queries", () => ({useCapiroQuery: query}));
const sections = [{key: "mission", heading: "Mission & mandate", owner: "human", body: "Recorded mission", prompt: "Why the firm exists", example: ""}, {key: "positioning", heading: "Positioning", owner: "human", body: "Recorded position", prompt: "", example: ""}];
function setup(error = false) {
  query.mockImplementation((key: string) => ({reload: vi.fn(), loading: false, error: error && key.endsWith("sections") ? new Error("Access denied") : undefined, data: key.endsWith("catalog") ? [{type: "firm-soul", scope: "firm", label: "Firm Soul", blurb: "Identity", sections}] : error ? undefined : {
    type: "firm-soul", slug: "firm", exists: true, visibility: "tenant", updatedAt: "2026-01-01T00:00:00Z", sections, pendingReview: {status: "pending_review"},
  }}));
}
it("reads canonical mission and positioning and preserves the explicit write hold", () => {
  setup();
  const html = renderToStaticMarkup(createElement(MemoryFiles));
  expect(html).toContain("Who we are");
  expect(html).toContain("Recorded mission");
  expect(html).toContain("Recorded position");
  expect(html).toContain("Active content remains unchanged");
  expect(html).toContain("Editing and submission unavailable");
  expect(Object.values(memoryFilesOperations).every(operation => operation.method === "GET")).toBe(true);
});
it("an inaccessible file is unavailable rather than an empty saved file", () => {
  setup(true);
  const html = renderToStaticMarkup(createElement(MemoryFiles));
  expect(html).not.toContain("Recorded mission");
  expect(html).not.toContain("No content recorded");
  expect(html).not.toContain("This file has not been created");
});
