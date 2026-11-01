import { describe, expect, it } from "vitest";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { readSavedDebriefContext } from "../src/features/portfolio/calendar/debrief/saved-context";
import { artifactCommand } from "../src/features/portfolio/calendar/artifacts/api";

const binding = {
  id: "d1",
  meetingId: "m1",
  clientId: "c1",
  revision: "2026-11-01T00:00:00.000Z",
};
const summary = {
  version: "d2-debrief-context-v1",
  boundTokens: 8000,
  totalTokens: 123,
  sourceTruncated: false,
  sections: [{ name: "source", tokens: 123, state: "kept" }],
};
const api = (payload: unknown) =>
  ({
    request: async (
      _service: string,
      path: string,
      schema: { parse: (value: unknown) => unknown },
    ) => {
      expect(path).toBe("engagement/meetings/m1/debriefs/d1/context");
      return schema.parse(payload);
    },
  }) as ApiClient;

describe("saved debrief context readback", () => {
  it("retains the exact summary transported by the create command after JSON readback", async () => {
    const command = artifactCommand(
      {
        id: "m1",
        client: { id: "c1", name: "Synthetic" },
        updatedAt: binding.revision,
      },
      "debriefs",
      {
        action: "save",
        body: "Draft",
        confidential: false,
        generatedFrom: summary,
      },
    );
    const saved = JSON.parse(JSON.stringify(command.artifact?.generatedFrom));
    expect(
      (
        await readSavedDebriefContext(
          api({ ...binding, generatedFrom: saved }),
          binding,
        )
      ).generatedFrom,
    ).toEqual(summary);
  });
  it("accepts a legacy debrief with explicitly absent context", async () => {
    expect(
      (
        await readSavedDebriefContext(
          api({ ...binding, generatedFrom: null }),
          binding,
        )
      ).generatedFrom,
    ).toBeNull();
  });
  it.each(["id", "meetingId", "clientId", "revision"])(
    "rejects stale or mismatched %s",
    async (field) => {
      await expect(
        readSavedDebriefContext(
          api({ ...binding, [field]: "other", generatedFrom: summary }),
          binding,
        ),
      ).rejects.toThrow();
    },
  );
  it.each([
    undefined,
    { ...summary, raw: "private" },
    { ...summary, totalTokens: -1 },
    { ...summary, sections: Array(21).fill(summary.sections[0]) },
  ])("rejects missing/malformed context", async (generatedFrom) => {
    await expect(
      readSavedDebriefContext(api({ ...binding, generatedFrom }), binding),
    ).rejects.toThrow();
  });
});
