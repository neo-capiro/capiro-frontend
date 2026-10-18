import {
  receiveUserPreferencesResponse,
  userPreferencesPaths,
  userPreferencesMetadata,
  type UserPreferencesOwner,
  type UserPreferencesSaveRequest,
  type UserPreferencesResponse,
  type UserPreferencesErrorResponse,
} from "@capiro/meri-client/user-preferences";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";

export type PreferencesReply =
  | UserPreferencesResponse
  | UserPreferencesErrorResponse;
export interface UserPreferencesPort {
  read(signal: AbortSignal): Promise<PreferencesReply>;
  save(
    request: UserPreferencesSaveRequest,
    signal: AbortSignal,
  ): Promise<PreferencesReply>;
}
export class PreferencesAccessLost extends Error {}

/** Cookies reach only the fixed same-origin proxy; no credential is retained here. */
export function userPreferencesTransport(
  owner: UserPreferencesOwner,
  isCurrent: () => boolean,
  fetcher: typeof fetch = fetch,
): UserPreferencesPort {
  async function send(
    route: "read" | "save",
    request: UserPreferencesSaveRequest | Record<string, never>,
    signal: AbortSignal,
  ) {
    return withActionDeadline(
      [signal],
      async (receiving) => {
        if (!isCurrent()) throw new PreferencesAccessLost();
        const response = await fetcher(userPreferencesPaths[route], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal: receiving,
        });
        try {
          if (!isCurrent()) throw new PreferencesAccessLost();
          receiving.throwIfAborted();
          if (response.redirected)
            throw new Error("Redirected preferences response");
          const text = await boundedJsonText(
            response,
            receiving,
            userPreferencesMetadata.limits.responseBytes,
          );
          const admitted =
            route === "read"
              ? await receiveUserPreferencesResponse(
                  "read",
                  response.status,
                  text,
                  { owner },
                )
              : await receiveUserPreferencesResponse(
                  "save",
                  response.status,
                  text,
                  { owner, request: request as UserPreferencesSaveRequest },
                );
          receiving.throwIfAborted();
          if (!isCurrent()) throw new PreferencesAccessLost();
          return admitted;
        } catch (error) {
          // Receive an admitted withheld disposition before expiring access. A
          // local proxy's unsigned 401 still clears the private view safely.
          if (response.status === 401) throw new PreferencesAccessLost();
          throw error;
        } finally {
          if (!response.bodyUsed)
            void response.body?.cancel().catch(() => undefined);
        }
      },
      userPreferencesMetadata.limits.requestMs,
    );
  }
  return {
    read: (signal) => send("read", {}, signal),
    save: (request, signal) => send("save", request, signal),
  };
}
