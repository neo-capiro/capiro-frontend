import { describe, expect, it } from "vitest";
import { engagementOperations } from "./engagement";
import { plannerOperations } from "./planner";
const id = "51000000-0000-4000-8000-000000000001";
describe("Planner and engagement wire boundaries", () => {
  it("requires current versions for explicitly versioned financial and staffing writes", () => {
    expect(
      plannerOperations["planner.project.budget.update"].request.safeParse({
        params: { id },
        body: { data: { budgetMinutes: 600 } },
      }).success,
    ).toBe(false);
    expect(
      plannerOperations["planner.capacity.allocation.save"].request.safeParse({
        body: { planId: id, changes: [{ id, projectId: id }] },
      }).success,
    ).toBe(false);
  });
  it("rejects authority fields and unreviewed resource configuration", () => {
    expect(
      plannerOperations["planner.resource.update"].request.safeParse({
        params: { id },
        body: { version: 1, data: { tenantId: id } },
      }).success,
    ).toBe(false);
    expect(
      plannerOperations["planner.task.create"].request.safeParse({
        body: { data: { name: "Review", actorId: id } },
      }).success,
    ).toBe(false);
  });
  it("preserves exact fixed service ownership and blocks traversal in task identifiers", () => {
    expect(plannerOperations["planner.task.attachments"].service).toBe(
      "strategy",
    );
    expect(engagementOperations["engagement.meetings"].service).toBe("core");
    expect(
      plannerOperations["planner.task.attachments"].request.safeParse({
        params: { taskId: "../bootstrap" },
      }).success,
    ).toBe(false);
  });
  it("rejects invalid calendar dates and gates timesheet actions on a revision", () => {
    expect(
      plannerOperations["planner.task.create"].request.safeParse({
        body: { data: { name: "Review", dueOn: "2026-02-30" } },
      }).success,
    ).toBe(false);
    expect(
      plannerOperations["planner.timesheet.status"].request.safeParse({
        body: {
          week: "2026-10-05",
          userId: "user_test",
          version: 0,
          action: "submit",
          notes: "",
        },
      }).success,
    ).toBe(false);
  });
  it("bounds multipart files to the actual Planner service limit", () => {
    const operation = plannerOperations["planner.task.attachment.upload"];
    expect(operation.encoding).toBe("multipart");
    expect(operation.multipart?.files).toEqual([
      { field: "file", minCount: 1, maxCount: 1, maxBytes: 25 * 1024 * 1024 },
    ]);
    expect(
      plannerOperations["planner.form.upload"].multipart?.files[0]?.maxCount,
    ).toBe(10);
  });
});

// Campaign writes now live in the canonical request-bound owner; shared V3 reads remain.
describe("canonical Outreach operation retirement", () => {
  it("removes both obsolete session writers without removing shared reads", () => {
    expect("engagement.session.create" in engagementOperations).toBe(false);
    expect("engagement.session.commands" in engagementOperations).toBe(false);
    expect(engagementOperations["engagement.session"].method).toBe("GET");
    expect(engagementOperations["engagement.sessions"].method).toBe("GET");
  });
});
