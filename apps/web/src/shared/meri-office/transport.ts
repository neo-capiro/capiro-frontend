import {
  OFFICE_SCHEMA,
  receiveOfficeRequest,
  receiveOfficeResponse,
  type OfficeRoute,
  type OfficeRequestMap,
  type OfficeResponseMap,
  type OfficeFailure,
} from "@capiro/meri-contracts/office-application";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";

export type OfficeInput<R extends OfficeRoute> = Omit<
  OfficeRequestMap[R],
  "schema"
>;
export interface OfficeTransport {
  pending(): boolean;
  dispose(): void;
  request<R extends OfficeRoute>(
    route: R,
    input: OfficeInput<R>,
    signal: AbortSignal,
  ): Promise<{
    status: number;
    value: OfficeResponseMap[R] | OfficeFailure;
  }>;
}

/** The canonical session owns this transport's lifetime. Credentials and launch
 * fields remain in memory; receiving validation conveys no authority. */
export function createOfficeTransport({
  credential,
  lifetime,
  isCurrent,
  onAccessLost,
  fetcher = fetch,
}: {
  credential: string;
  lifetime: AbortSignal;
  isCurrent: () => boolean;
  onAccessLost: () => void;
  fetcher?: typeof fetch;
}): OfficeTransport {
  const local = new AbortController();
  let currentCredential = credential,
    pending = 0;
  const dispose = () => {
    currentCredential = "";
    local.abort();
    lifetime.removeEventListener("abort", dispose);
  };
  if (lifetime.aborted) dispose();
  else lifetime.addEventListener("abort", dispose, { once: true });
  const current = () => {
    if (!isCurrent()) {
      dispose();
      throw new Error("Office context changed");
    }
  };
  return {
    pending: () => pending > 0,
    dispose,
    async request(route, input, caller) {
      current();
      const request = receiveOfficeRequest(
        route,
        new TextEncoder().encode(
          JSON.stringify({ schema: OFFICE_SCHEMA, ...input }),
        ),
      );
      pending++;
      try {
        return await withActionDeadline(
          [caller, lifetime, local.signal],
          async (signal) => {
            current();
            const response = await fetcher(`/api/meri/office/${route}`, {
              method: "POST",
              body: JSON.stringify(request),
              headers: {
                "Content-Type": "application/json",
                [actionSessionHeader]: currentCredential,
              },
              credentials: "same-origin",
              cache: "no-store",
              redirect: "error",
              signal,
            });
            try {
              signal.throwIfAborted();
              current();
              if (response.status === 401 || response.status === 403)
                onAccessLost();
              const value = await receiveOfficeResponse(
                route,
                response.status,
                await boundedJsonBytes(response, signal, 2 * 1024 * 1024),
                request,
              );
              signal.throwIfAborted();
              current();
              return { status: response.status, value };
            } finally {
              void response.body?.cancel().catch(() => undefined);
            }
          },
        );
      } finally {
        pending--;
      }
    },
  };
}
