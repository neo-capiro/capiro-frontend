import { describe, expect, it } from "vitest";
import {
  newsletterDestination,
  newsletterRecordKind,
} from "./newsletter-route";
const id = "20000000-0000-4000-8000-000000000001";
const record = {
  id,
  title: "Synthetic",
  type: "outbound_campaign",
  status: "draft",
  body: null,
  subject: null,
};
describe("rich newsletter destinations", () => {
  it("preserves ordinary routes", () => {
    expect(newsletterDestination(new URLSearchParams(`session=${id}`))).toEqual(
      { kind: "none" },
    );
  });
  it.each(["newsletter", "newsletterStage"])("keeps %s IDs distinct", (key) => {
    expect(newsletterDestination(new URLSearchParams(`${key}=${id}`))).toEqual({
      kind: key === "newsletter" ? "record" : "stage",
      id,
    });
  });
  it.each([
    `newsletter=`,
    `newsletter=bad`,
    `newsletter=${id}&newsletter=${id}`,
    `newsletterStage=${id}&newsletterStage=${id}`,
    `newsletter=${id}&newsletterStage=${id}`,
    ...[
      "session",
      "draft",
      "create",
      "objectiveId",
      "objectiveVersion",
      "directoryContactId",
    ].map((key) => `newsletter=${id}&${key}=${id}`),
    `newsletter=${id}&view=meetings`,
  ])("refuses ambiguous/invalid destination %s", (query) => {
    expect(newsletterDestination(new URLSearchParams(query))).toEqual({
      kind: "invalid",
    });
  });
  it("requires the producer kind and never treats a marker as authority", () => {
    expect(newsletterRecordKind(record)).toBe("ordinary");
    expect(
      newsletterRecordKind({ ...record, metadata: { newsletterRevision: 2 } }),
    ).toBe("ordinary");
    expect(
      newsletterRecordKind({ ...record, metadata: { newsletterStageId: id } }),
    ).toBe("candidate");
    expect(
      newsletterRecordKind({
        ...record,
        type: "follow_up",
        metadata: { newsletterStageId: id },
      }),
    ).toBe("invalid");
  });
});
