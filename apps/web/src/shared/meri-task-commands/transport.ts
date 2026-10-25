import {
  receiveTaskCommandRequest,
  receiveTaskCommandResponse,
  taskCommandMetadata,
  type TaskCommandPrepareResponse,
  type TaskCommandExecuteResponse,
  type TaskCommandErrorResponse,
  type TaskUpdateApprovalProposal,
  type TaskCommandPrepareRequest,
} from "@capiro/meri-contracts/task-command-application";
import type { ActionContext } from "../meri-actions/session-receipt";
import { sameTaskConversation } from "../meri-actions/task-recovery";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";

type Reply<T> = { status: number; value: T | TaskCommandErrorResponse };
export interface TaskCommandTransport {
  prepare(
    input: TaskCommandPrepareRequest,
    signal: AbortSignal,
    originalContext?: ActionContext,
  ): Promise<Reply<TaskCommandPrepareResponse>>;
  execute(
    proposal: TaskUpdateApprovalProposal,
    signal: AbortSignal,
    originalContext?: ActionContext,
  ): Promise<Reply<TaskCommandExecuteResponse>>;
}
export class TaskCommandAccessUnavailable extends Error {}
export class TaskCommandNotDispatched extends Error {}

/** The public receiver captures requests and correlates every response. */
export function taskCommandTransport(
  credential: string,
  context: ActionContext,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): TaskCommandTransport {
  let token = lifetime.aborted ? "" : credential;
  lifetime.addEventListener(
    "abort",
    () => {
      token = "";
    },
    { once: true },
  );
  const bindingFor = (original: ActionContext = context) => {
    if (!sameTaskConversation(original, context))
      throw new TaskCommandNotDispatched("Task conversation changed");
    const { tenantId, actorId, conversationId, runId } = original;
    return { tenantId, actorId, conversationId, runId };
  };
  async function send<T>(
    route: "prepare" | "execute",
    text: string,
    caller: AbortSignal,
    receive: (status: number, body: string) => Promise<T>,
  ) {
    let unauthorized = false;
    try {
      return await withActionDeadline([caller, lifetime], async (signal) => {
        const response = await fetcher(taskCommandMetadata.routes[route].path, {
          method: "POST",
          body: text,
          headers: {
            "Content-Type": "application/json",
            [actionSessionHeader]: token,
          },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal,
        });
        unauthorized = response.status === 401;
        const body = await boundedJsonText(
          response,
          signal,
          taskCommandMetadata.limits.responseBytes,
        );
        signal.throwIfAborted();
        if (response.redirected) throw new Error("Redirected task response");
        const value = await receive(response.status, body);
        signal.throwIfAborted();
        return { status: response.status, value };
      });
    } catch (error) {
      if (unauthorized && !caller.aborted && !lifetime.aborted)
        throw new TaskCommandAccessUnavailable("Task access unavailable");
      throw error;
    }
  }
  return {
    async prepare(input, signal, originalContext) {
      const binding = bindingFor(originalContext);
      let request;
      try {
        request = await receiveTaskCommandRequest(
          "prepare",
          JSON.stringify(input),
        );
      } catch {
        throw new TaskCommandNotDispatched("Task input refused");
      }
      return send(
        "prepare",
        JSON.stringify(request),
        signal,
        async (status, body) => {
          try {
            return await receiveTaskCommandResponse("prepare", status, body, {
              binding,
              request,
            });
          } catch (error) {
            if (binding.runId === context.runId) throw error;
            // An absent original delivery can prepare a new proposal only in the freshly admitted run.
            return receiveTaskCommandResponse("prepare", status, body, {
              binding: bindingFor(),
              request,
            });
          }
        },
      );
    },
    async execute(proposal, signal, originalContext) {
      const binding = bindingFor(originalContext);
      let request;
      try {
        request = await receiveTaskCommandRequest(
          "execute",
          JSON.stringify({ proposal }),
        );
      } catch {
        throw new TaskCommandNotDispatched("Task proposal refused");
      }
      return send("execute", JSON.stringify(request), signal, (status, body) =>
        receiveTaskCommandResponse("execute", status, body, {
          binding,
          proposal: request.proposal,
        }),
      );
    },
  };
}
