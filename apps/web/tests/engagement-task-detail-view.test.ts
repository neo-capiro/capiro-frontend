import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("../src/shared/capiro/queries", () => ({ useCapiroQuery: query }));
import { EngagementTaskDetail } from "../src/features/modules/workspace/EngagementTaskDetail";
const id = "10000000-0000-4000-8000-000000000001";
const clientId = "10000000-0000-4000-8000-000000000002";
const row = {
  id,
  clientId,
  client: { id: clientId, name: "Synthetic client" },
  title: "Current edited title",
  status: "done",
  dueDate: null,
  updatedAt: "2026-10-26T00:00:00.000Z",
};
beforeEach(() => {
  query.mockReset();
  query.mockReturnValue({ data: row, loading: false, reload: vi.fn() });
});
const render = (taskId = id, scope: string | undefined = clientId) =>
  renderToStaticMarkup(
    createElement(EngagementTaskDetail, { taskId, clientId: scope }),
  );
it("renders the exact current task using the Core read", () => {
  expect(render()).toContain("Current edited title");
  expect(query).toHaveBeenCalledWith(
    "engagement.task",
    { params: { id }, query: { clientId } },
    { enabled: true },
  );
});
it.each(["id", "clientId"])(
  "withholds a current reply for a different %s",
  (field) => {
    query.mockReturnValue({
      data: { ...row, [field]: "10000000-0000-4000-8000-000000000099" },
      loading: false,
    });
    const html = render();
    expect(html).not.toContain(row.title);
    expect(html).not.toContain(row.client.name);
    expect(html).toContain("unavailable in the selected scope");
  },
);
it.each(["loading", "denied"])("withholds stale content while %s", (state) => {
  query.mockReturnValue({
    data: row,
    loading: state === "loading",
    error: state === "denied" ? new Error("Task not found") : undefined,
  });
  expect(render()).not.toContain(row.title);
});
it("does not enable a malformed task read", () => {
  expect(render("invalid")).toContain("task link is invalid");
  expect(query.mock.calls[0]![2]).toEqual({ enabled: false });
});
