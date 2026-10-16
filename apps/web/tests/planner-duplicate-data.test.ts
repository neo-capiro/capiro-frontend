import { expect, it } from "vitest";
import {
  plannerTask,
  project,
  taskData,
} from "../src/shared/capiro/operations/planner-schemas";
import { nextTask } from "../test/browser/next-modules-fixtures";
import { duplicateTaskSeed } from "../src/features/modules/planner/task-editor-data";

const projectId = "52000000-0000-4000-8000-000000000001";
const sectionId = "53000000-0000-4000-8000-000000000001";
const editable = project.parse({
  id: projectId,
  name: "Editable project",
  description: "",
  color: "#123456",
  privacy: "team",
  defaultView: "list",
  sections: [{ id: sectionId, name: "Current section" }],
  fields: [],
  members: [],
  startOn: null,
  dueOn: null,
  health: "on_track",
  clientId: null,
  ownerId: "test-user",
  version: 1,
  archived: false,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  access: "editor",
});

it("creates a schema-valid Copy of title at the source title limit without changing the source", () => {
  const source = plannerTask.parse({ ...nextTask, name: "A".repeat(500) });
  const seed = duplicateTaskSeed(source, []);
  expect(seed.name).toBe(`Copy of ${"A".repeat(492)}`);
  expect(taskData.partial().safeParse(seed).success).toBe(true);
  expect(source.name).toBe("A".repeat(500));
  expect(Object.keys(seed).sort()).toEqual([
    "clientId",
    "description",
    "memberships",
    "name",
    "priority",
  ]);
});

it("copies only currently editable project memberships and canonical available sections", () => {
  const source = plannerTask.parse({
    ...nextTask,
    memberships: [{ projectId, sectionId, position: 42 }],
  });
  expect(duplicateTaskSeed(source, [editable]).memberships).toEqual([
    { projectId, sectionId, position: 0 },
  ]);
  for (const unavailable of [
    { ...editable, archived: true },
    { ...editable, access: "viewer" as const },
    { ...editable, access: "commenter" as const },
  ])
    expect(duplicateTaskSeed(source, [unavailable]).memberships).toEqual([]);
  expect(duplicateTaskSeed(source, []).memberships).toEqual([]);
  expect(
    duplicateTaskSeed(source, [{ ...editable, sections: [] }]).memberships,
  ).toEqual([{ projectId, sectionId: null, position: 0 }]);
  expect(source.memberships[0]?.position).toBe(42);
});
