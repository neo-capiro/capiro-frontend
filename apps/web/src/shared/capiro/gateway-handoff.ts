import { operationPath } from "./gateway-input";
import type { OperationDefinition, OperationInput } from "./contracts";

/**
 * The browser handoff for a `websocket` operation: the backend returns a single
 * ticket and the client is handed the socket URL for that ticket. Moved out of
 * `gateway.ts` unchanged so the gateway module stays inside its reviewed size;
 * it is one self-contained transformation with no transport or authority.
 */
export function browserHandoff(
  payload: unknown,
  operation: OperationDefinition,
  input: OperationInput,
  base: string,
): unknown {
  if (!operation.websocket) return payload;
  if (
    !payload ||
    typeof payload !== "object" ||
    !("ticket" in payload) ||
    typeof payload.ticket !== "string"
  )
    throw new Error("Invalid hearing ticket.");
  const socket = new URL(
    `${base}${operationPath({ ...operation, path: operation.websocket.path }, input)}`,
  );
  const sessionId = input.params?.[operation.websocket.sessionParam];
  if (sessionId === undefined) throw new Error("Invalid hearing session.");
  socket.protocol = socket.protocol === "https:" ? "wss:" : "ws:";
  socket.searchParams.set("ticket", payload.ticket);
  socket.searchParams.set("sessionId", String(sessionId));
  return { ...payload, socketUrl: socket.href };
}
