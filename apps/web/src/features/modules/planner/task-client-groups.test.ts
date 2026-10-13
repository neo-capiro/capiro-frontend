import { describe, expect, it } from "vitest";
import type {
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import { groupTasksByClient } from "./task-client-groups";
import { taskMatchesClient } from "./task-client-scope";

const clients = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
];
const projects = [
  { id: "pa", clientId: "a" },
  { id: "pb", clientId: "b" },
  { id: "firm", clientId: null },
] as PlannerProject[];
const task = (id: string, clientId: string | null, projectIds: string[] = []) =>
  ({
    id,
    clientId,
    memberships: projectIds.map((projectId) => ({ projectId })),
  }) as PlannerTask;
describe("All tasks client presentation", () => {
  it("keeps permitted rows once, in original order within their groups", () => {
    const a = task("one", "a"),
      b = task("two", "b"),
      third = task("three", "a");
    const groups = groupTasksByClient([a, b, third], projects, clients);
    expect(
      groups.map((group) => [group.label, group.tasks.map((item) => item.id)]),
    ).toEqual([
      ["Alpha", ["one", "three"]],
      ["Beta", ["two"]],
    ]);
    expect(groups[0]?.tasks[0]).toBe(a);
  });
  it("uses a unique current project client without inventing a direct link", () => {
    const item = task("one", null, ["pa", "pa"]);
    expect(groupTasksByClient([item], projects, clients)[0]).toMatchObject({
      label: "Alpha",
      clientId: "a",
    });
    expect(item.clientId).toBeNull();
    expect(taskMatchesClient(item, "a", projects)).toBe(true);
  });
  it("direct linkage wins grouping while scope preserves its existing OR membership rule", () => {
    const item = task("one", "b", ["pa"]);
    expect(groupTasksByClient([item], projects, clients)[0]?.label).toBe(
      "Beta",
    );
    expect(taskMatchesClient(item, "a", projects)).toBe(true);
    expect(taskMatchesClient(item, "b", projects)).toBe(true);
  });
  it("does not call multiple client associations firm work or choose the first", () => {
    expect(
      groupTasksByClient(
        [task("one", null, ["pa", "pb"])],
        projects,
        clients,
      )[0],
    ).toMatchObject({ label: "Multiple clients", clientId: undefined });
  });
  it("missing project authority stays unavailable, even with another known association", () => {
    for (const links of [["missing"], ["pa", "missing"]])
      expect(
        groupTasksByClient([task("one", null, links)], projects, clients)[0],
      ).toMatchObject({
        label: "Client association unavailable",
        clientId: undefined,
      });
  });
  it("unknown client names cannot invent navigation or collapse into firm work", () => {
    const groups = groupTasksByClient(
      [task("one", "unknown"), task("two", "different")],
      projects,
      clients,
    );
    expect(groups).toHaveLength(2);
    expect(
      groups.every(
        (group) => group.label === "Client unavailable" && !group.clientId,
      ),
    ).toBe(true);
  });
  it("only unlinked or known firm projects are firm work; empty page stays empty", () => {
    expect(
      groupTasksByClient(
        [task("one", null), task("two", null, ["firm"])],
        projects,
        clients,
      )[0]?.tasks,
    ).toHaveLength(2);
    expect(groupTasksByClient([], projects, clients)).toEqual([]);
  });
});
