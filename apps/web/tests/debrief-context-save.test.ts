import { describe, expect, it } from "vitest";
import { artifactCommand } from "../src/features/portfolio/calendar/artifacts/api";
import { parseMeetingCommand } from "../src/features/portfolio/calendar/commands/input";
import type { ArtifactChange } from "../src/features/portfolio/calendar/artifacts/contracts";

const meeting = {
  id: "00000000-0000-4000-8000-000000000005",
  client: {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Synthetic Client",
  },
  updatedAt: "2026-10-31T12:00:00.000Z",
};
const contextSummary = {
  version: "d2-debrief-context-v1",
  boundTokens: 8000,
  totalTokens: 1234,
  sourceTruncated: false,
  sections: [
    { name: "source", tokens: 900, state: "kept" },
    { name: "prep", tokens: 120, state: "shortened" },
  ],
};
/** Exactly what prepareMeetingCommand adds before the body is validated/sent. */
const wire = (command: Record<string, unknown>) => ({
  ...command,
  schemaVersion: 1,
  requestId: "00000000-0000-4000-8000-000000000003",
});
const save = (generatedFrom?: unknown): ArtifactChange => ({
  action: "save",
  body: "Composed body",
  confidential: false,
  ...(generatedFrom === undefined ? {} : { generatedFrom }),
});

describe("D2 audited context reaches the saved debrief command", () => {
  it("carries generatedFrom equal to the draft's contextSummary on a debrief create", () => {
    const command = artifactCommand(meeting, "debriefs", save(contextSummary));

    expect(command.operation).toBe("debrief-create");
    expect(
      (command.artifact as unknown as Record<string, unknown>).generatedFrom,
    ).toEqual(contextSummary);
    // The command body is the same one the server validates.
    expect(() => parseMeetingCommand(wire(command))).not.toThrow();
  });

  it("omits the field entirely for a note save", () => {
    const command = artifactCommand(meeting, "notes", save(contextSummary));

    expect(command.operation).toBe("note-create");
    // Present on the change, absent from the wire body: notes must not carry it.
    expect(command.artifact).not.toHaveProperty("generatedFrom");
    expect(JSON.stringify(command)).not.toContain("d2-debrief-context-v1");
  });

  it("omits the field when the draft had no context summary", () => {
    const command = artifactCommand(meeting, "debriefs", save());

    expect(command.artifact).not.toHaveProperty("generatedFrom");
    expect(() => parseMeetingCommand(wire(command))).not.toThrow();
  });

  it("omits the field on a debrief update, which does not persist it", () => {
    const command = artifactCommand(meeting, "debriefs", {
      ...save(contextSummary),
      id: "00000000-0000-4000-8000-000000000009",
      revision: "2026-10-31T12:00:00.000Z",
    });

    expect(command.operation).toBe("debrief-update");
    expect(command.artifact).not.toHaveProperty("generatedFrom");
  });

  it("refuses the field on any non-debrief-create command (client mirror of Core)", () => {
    const note = artifactCommand(meeting, "notes", save(contextSummary));
    const forged = {
      ...wire(note),
      artifact: {
        ...(note.artifact as Record<string, unknown>),
        generatedFrom: contextSummary,
      },
    };
    expect(() => parseMeetingCommand(forged)).toThrow(
      /Review the meeting command/,
    );
  });
});
