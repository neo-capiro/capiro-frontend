import { z } from "zod";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  readRecovery,
  readRecoveryDisposition,
  reserveRecovery,
  updateRecovery,
  acknowledgeRecovery,
  retireFileAccessRefusalRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  fileAccessCommandSchema,
  fileAccessDigest,
  fileAccessOutcomeSchema,
  type FileAccessAttempt,
} from "./file-access-command";

export function fileAccessRecovery(
  clientId: string,
  actor: ClientWriter,
  guard: () => void,
) {
  const scope = JSON.stringify([
    "file-access-v1",
    actor.tenantId,
    actor.userId,
    clientId,
  ]);
  const schema = z
    .strictObject({
      command: fileAccessCommandSchema,
      digest: z.string().regex(/^[a-f0-9]{64}$/),
      outcome: z.unknown().optional(),
    })
    .refine(
      (value) =>
        value.outcome === undefined ||
        fileAccessOutcomeSchema(value, actor).safeParse(value.outcome).success,
    );
  const contract = {
    schema,
    requestId: (value: z.infer<typeof schema>) => value.command.requestId,
    validateUpdate(
      previous: z.infer<typeof schema>,
      next: z.infer<typeof schema>,
    ) {
      if (
        JSON.stringify(previous.command) !== JSON.stringify(next.command) ||
        previous.digest !== next.digest ||
        (previous.outcome !== undefined &&
          JSON.stringify(previous.outcome) !== JSON.stringify(next.outcome))
      )
        throw new Error(
          "The original file access command and outcome cannot change.",
        );
    },
  };
  const durable = ({ command, digest, outcome }: FileAccessAttempt) => ({
    command,
    digest,
    ...(outcome === undefined ? {} : { outcome }),
  });
  async function load(): Promise<FileAccessAttempt | null> {
    const saved = await readRecovery(scope, contract, guard);
    if (!saved) return null;
    if (
      saved.command.clientId !== clientId ||
      saved.digest !== (await fileAccessDigest(saved.command, actor))
    )
      throw new Error("Saved access command belongs to another context.");
    guard();
    return {
      command: saved.command,
      digest: saved.digest,
      status: "unknown",
      ...(saved.outcome === undefined
        ? {}
        : {
            outcome: fileAccessOutcomeSchema(saved, actor).parse(saved.outcome),
          }),
    };
  }
  return {
    load,
    async reserve(value: FileAccessAttempt) {
      const saved = await reserveRecovery(
        scope,
        value.command.requestId,
        durable(value),
        contract,
        guard,
      );
      if (saved.command.requestId !== value.command.requestId)
        throw new Error("Recover the saved access change first.");
      return value;
    },
    // Preserve a validated late response in its original scope only; current UI authority is separate.
    received: (value: FileAccessAttempt) =>
      updateRecovery(
        scope,
        value.command.requestId,
        durable(value),
        contract,
        () => {},
      ),
    acknowledge: (requestId: string) =>
      acknowledgeRecovery(scope, requestId, guard),
    retire: (value: FileAccessAttempt) =>
      retireFileAccessRefusalRecovery(
        scope,
        value.command.requestId,
        fileAccessOutcomeSchema(value, actor).parse(value.outcome),
        guard,
      ),
    async settled(requestId: string) {
      const disposition = await readRecoveryDisposition(
        scope,
        requestId,
        () => {},
      );
      return (
        disposition?.state === "acknowledged" ||
        (disposition?.state === "refused" &&
          disposition.code === "FILE_ACCESS_REFUSED")
      );
    },
    lock: <T>(action: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, action),
  };
}
