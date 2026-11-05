import { describe, it, expect } from "vitest";
import { capiroOperations } from "../src/shared/capiro/registry";
import {
  outreachVisualReads,
  outreachVisualRecords,
  outreachVisualFrames,
  recordId,
} from "../test/browser/outreach-visual-data";
describe("Outreach visual fixtures use current response contracts", () => {
  for (const [key, data] of Object.entries(outreachVisualReads))
    it(key, () => {
      const operation = capiroOperations[key as keyof typeof capiroOperations];
      expect(operation.method).toBe("GET");
      expect(() => operation.response.parse(data)).not.toThrow();
    });
  it("binds saved and existing drafts to ordinary overview records, never a campaign session", () => {
    for (const name of ["saved", "existing-draft"]) {
      const frame = outreachVisualFrames.find((row) => row.name === name)!;
      const url = new URL(frame.route, "http://127.0.0.1");
      expect(url.searchParams.get("detail")).toBe("overview");
      expect(url.searchParams.has("session")).toBe(false);
      expect(url.searchParams.has("saved")).toBe(false);
      const row = outreachVisualRecords.find(
        (row) => row.id === url.searchParams.get("draft"),
      );
      expect(row?.status).toBe("draft");
      expect(row?.id).not.toBe(recordId);
      expect(
        capiroOperations["engagement.outreach.record"].response.safeParse(row),
      ).toMatchObject({ success: true });
    }
    expect(outreachVisualFrames).toHaveLength(12);
  });
  it("supplies populated library and template reads for their named screens", () => {
    expect(
      outreachVisualReads["engagement.campaign.library"].documents,
    ).not.toHaveLength(0);
    expect(
      outreachVisualReads["engagement.campaign.templates"],
    ).not.toHaveLength(0);
    expect(outreachVisualReads["directory.contacts"].contacts).not.toHaveLength(
      0,
    );
  });
});
