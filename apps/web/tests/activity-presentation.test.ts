import { describe, expect, it } from "vitest";
import { activityKindDisplay } from "@/features/portfolio/client-profile/activity-presentation";

describe("activity kind display", () => {
  it("title-cases a saved kind for display without changing its value", () => {
    expect(activityKindDisplay("email")).toBe("Email");
    expect(activityKindDisplay("outreach")).toBe("Outreach");
    expect(activityKindDisplay("document")).toBe("Document");
    expect(activityKindDisplay("commitment")).toBe("Commitment");
    expect(activityKindDisplay("")).toBe("");
  });
});
