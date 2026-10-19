import { describe, expect, it } from "vitest";
import { outreachRecord } from "./operations/engagement";

const record = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Synthetic rich newsletter",
  type: "outbound_campaign",
  status: "draft",
  subject: "Policy update",
  body: null,
};
const stageId = "20000000-0000-4000-8000-000000000001";
describe("existing rich newsletter response routing", () => {
  it("preserves reserved routing fields and strips unrelated metadata", () => {
    expect(
      outreachRecord.parse({
        ...record,
        metadata: {
          newsletterStageId: stageId,
          newsletterRevision: 2,
          secret: "drop",
        },
        unknown: "drop",
      }),
    ).toEqual({
      ...record,
      metadata: { newsletterStageId: stageId, newsletterRevision: 2 },
    });
  });
  it.each([undefined, null, {}])("retains ordinary metadata %j", (metadata) => {
    expect(outreachRecord.safeParse({ ...record, metadata }).success).toBe(
      true,
    );
  });
  it.each([
    null,
    "",
    "wrong",
    1,
    "20000000-0000-7000-8000-000000000001",
    "20000000-0000-4000-0000-000000000001",
  ])("refuses malformed stage marker %j", (newsletterStageId) => {
    expect(
      outreachRecord.safeParse({ ...record, metadata: { newsletterStageId } })
        .success,
    ).toBe(false);
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2", null])(
    "refuses malformed revision %j",
    (newsletterRevision) => {
      expect(
        outreachRecord.safeParse({
          ...record,
          metadata: { newsletterRevision },
        }).success,
      ).toBe(false);
    },
  );
  it.each([1, 2, 3, 4, 5])("accepts producer UUID version %i", (version) => {
    expect(
      outreachRecord.safeParse({
        ...record,
        metadata: {
          newsletterStageId: `20000000-0000-${version}000-8000-000000000001`,
        },
      }).success,
    ).toBe(true);
  });
});
