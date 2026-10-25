import { describe, expect, it } from "vitest";
import { artifactCommand } from "../src/features/portfolio/calendar/artifacts/api";
import { parseMeetingCommand } from "../src/features/portfolio/calendar/commands/input";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const revision = "2026-10-24T12:00:00.000Z";
const meeting = {
  id: id(1),
  client: { id: id(2), name: "Synthetic" },
  updatedAt: revision,
};
for (const kind of ["notes", "debriefs"] as const)
  describe(`${kind} command lifecycle`, () => {
    const prefix = kind === "notes" ? "note" : "debrief";
    for (const action of [
      "create",
      "update",
      "approve",
      "share",
      "unshare",
    ] as const)
      it(`binds reviewed ${action}`, () => {
        const change =
          action === "create" || action === "update"
            ? {
                action: "save" as const,
                body: "Original draft",
                confidential: true,
                ...(action === "update" ? { id: id(3), revision } : {}),
              }
            : { action, id: id(3), revision };
        const mapped = artifactCommand(meeting, kind, change);
        const parsed = parseMeetingCommand({
          schemaVersion: 1,
          requestId: id(4),
          ...mapped,
        });
        expect(parsed).toMatchObject({
          meetingId: meeting.id,
          expectedClientId: meeting.client.id,
          expectedRevision: revision,
          operation:
            action === "share" || action === "unshare"
              ? action
              : `${prefix}-${action}`,
        });
        if (action === "share" || action === "unshare")
          expect(parsed.artifacts).toEqual([
            { type: prefix, id: id(3), revision },
          ]);
        else
          expect(parsed.artifact).toMatchObject(
            action === "approve"
              ? { id: id(3), revision, body: null, confidential: null }
              : {
                  id: action === "update" ? id(3) : null,
                  revision: action === "update" ? revision : null,
                  body: "Original draft",
                  confidential: true,
                },
          );
      });
    it("does not invent a missing reviewed revision", () => {
      expect(() =>
        parseMeetingCommand({
          schemaVersion: 1,
          requestId: id(4),
          ...artifactCommand(meeting, kind, { action: "approve", id: id(3) }),
        }),
      ).toThrow();
    });
  });
