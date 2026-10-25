import { readFileSync } from "node:fs";
import type { TaskUpdateRaw } from "@capiro/meri-client/task-commands";
import { receiveSessionReceipt } from "../src/shared/meri-actions/session-receipt";
import type {
  ActionAttempt,
  ActionAttemptJournal,
} from "../src/shared/meri-actions/attempt-journal";
import { TaskUpdateWorkflow } from "../src/shared/meri-task-commands/workflow-adapter";
import { taskCommandTransport } from "../src/shared/meri-task-commands/transport";

export function taskWire(name: string): {
  route: string;
  httpStatus: number;
  request: unknown;
  response: unknown;
} {
  return JSON.parse(
    readFileSync(
      new URL(`./fixtures/meri-task-commands/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}
export const taskContext = JSON.parse(
  readFileSync(
    new URL("./fixtures/meri-task-commands/context.json", import.meta.url),
    "utf8",
  ),
);
export const taskNow = taskContext.syntheticNow as number;
export const taskInput: TaskUpdateRaw = Object.freeze({
  taskId: "00000000-0000-4000-8000-000000000021",
  title: "Updated",
  status: "open",
});
export const taskSession = () =>
  receiveSessionReceipt(
    JSON.stringify({
      credential: `action_session_${"a".repeat(43)}`,
      expiresAtMs: taskNow + 60_000,
      context: {
        tenantId: taskContext.tenantId,
        actorId: taskContext.actorId,
        conversationId: taskContext.conversationId,
        runId: taskContext.runId,
        selectedClientId: taskContext.selectedClientId,
      },
    }),
    taskNow,
  );
export function taskCell(): ActionAttemptJournal {
  let value: ActionAttempt = { status: "idle" };
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
  };
}
export function taskWorkflow(
  fetcher: typeof fetch,
  journal = taskCell(),
  now = () => taskNow,
  isCurrent = () => true,
  session = taskSession(),
) {
  const lifetime = new AbortController(),
    lost: boolean[] = [];
  const port = new TaskUpdateWorkflow({
    session,
    transport: taskCommandTransport(
      session.credential,
      session.context,
      lifetime.signal,
      fetcher,
    ),
    journal,
    onAccessLost: () => lost.push(true),
    isCurrent,
    now,
  });
  return { port, journal, lifetime, lost };
}
export function taskResponse(name: string) {
  const wire = taskWire(name);
  return Response.json(wire.response, { status: wire.httpStatus });
}
