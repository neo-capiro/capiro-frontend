import { createHash } from "node:crypto";
import type {
  FileAccessCommand,
  FileAccessOutcome,
} from "../../src/features/portfolio/files/file-access-command";
import type { BatchMoveCommand } from "../../src/features/portfolio/files/batch-move";
export function accessOutcome(
  command: FileAccessCommand,
  refused = false,
): FileAccessOutcome {
  return {
    schemaVersion: 1,
    tenantId: "tenant-test",
    actorUserId: "user-test",
    requestId: command.requestId,
    clientId: command.clientId,
    payloadDigest: createHash("sha256")
      .update(
        JSON.stringify(["file-access", 1, "tenant-test", "user-test", command]),
      )
      .digest("hex"),
    operation: command.operation,
    status: refused ? "refused" : "completed",
    result: refused
      ? null
      : {
          files: command.files.map((file) => ({
            id: file.id,
            previousRevision: file.expectedRevision,
            revision: file.expectedRevision + 1,
          })),
        },
    refusal: refused
      ? { code: "FILE_ACCESS_REFUSED", message: "Review current files." }
      : null,
    createdAt: "2026-10-25T00:00:00.000Z",
  };
}
export const moveOutcome = (command: BatchMoveCommand) => ({
  schemaVersion: 1,
  requestId: command.requestId,
  clientId: command.clientId,
  payloadDigest: createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex"),
  outcome: "moved",
  committedAt: "2026-10-25T00:00:00.000Z",
  files: command.files.map((file) => ({
    id: file.id,
    previousRevision: file.expectedRevision,
    revision: file.expectedRevision + 1,
    folder: command.folder,
  })),
});
