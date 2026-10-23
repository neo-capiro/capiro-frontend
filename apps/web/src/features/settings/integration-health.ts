import type { z } from "zod";
import type {
  integrationSchema,
  integrationSyncResponseSchema,
} from "../../shared/capiro/operations/settings-schemas";

export type IntegrationConnection = z.infer<typeof integrationSchema>;
export type OAuthOutcome = {
  provider: "microsoft_365" | "google_workspace";
  kind: "connected" | "denied" | "cancelled" | "admin-consent" | "error";
  connectionId?: string;
};
export const oauthResultKeys = [
  "provider",
  "connected",
  "connectionId",
  "error",
  "error_description",
  "admin_consent",
  "code",
  "state",
  "tenant",
];

/** Callback query values are untrusted hints, never connection receipts or display text. */
export function parseOAuthOutcome(query: URLSearchParams): OAuthOutcome | null {
  const provider = query.get("provider");
  if (provider !== "microsoft_365" && provider !== "google_workspace")
    return null;
  if (oauthResultKeys.some((key) => query.getAll(key).length > 1))
    return { provider, kind: "error" };
  const error = query.get("error");
  if (error)
    return {
      provider,
      kind:
        error === "access_denied"
          ? "denied"
          : error === "cancelled" || error === "user_cancelled"
            ? "cancelled"
            : "error",
    };
  if (query.has("admin_consent"))
    return {
      provider,
      kind: query.get("admin_consent") === "true" ? "admin-consent" : "denied",
    };
  const connectionId = query.get("connectionId");
  return query.get("connected") === "1" &&
    connectionId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      connectionId,
    )
    ? { provider, kind: "connected", connectionId }
    : { provider, kind: "error" };
}

export function oauthOutcomeMessage(
  outcome: OAuthOutcome,
  owned: IntegrationConnection[] | undefined,
) {
  if (outcome.kind === "connected") {
    if (!owned)
      return "Checking the returned account against your current connections…";
    const found = owned.find(
      (row) =>
        row.id === outcome.connectionId && row.provider === outcome.provider,
    );
    return found?.status === "connected"
      ? "The current connection list confirms this account is connected. Mail import coverage is reported separately."
      : "The returned account could not be confirmed as connected. Reload connections or reconnect; no success is assumed from the callback.";
  }
  return {
    denied:
      "Provider consent was denied. Your account has not been confirmed as connected.",
    cancelled:
      "Provider sign-in was cancelled. No connection success has been confirmed.",
    "admin-consent":
      "Administrator consent returned. Sign in as the mailbox owner to connect an account; administrator consent alone is not a mailbox connection.",
    error:
      "Provider sign-in could not be confirmed. Reload connections before reconnecting. Provider error details are not displayed.",
  }[outcome.kind];
}

export function syncOutcomeMessage(
  result: z.infer<typeof integrationSyncResponseSchema>,
) {
  const mail = Object.values(result.mail ?? {});
  const stats = [result.calendar, ...mail].filter((entry) => !!entry);
  if (stats.some((entry) => entry.failed > 0))
    return "This sync returned failed records. Review the connection and retry transient failures; complete mail coverage is not confirmed.";
  if (!mail.length)
    return "The sync returned no mail result. Calendar progress does not confirm mail import; review the connection before retrying.";
  if (stats.some((entry) => entry.hasMore))
    return "This sync processed a bounded batch. More records remain to import; complete mail coverage is not confirmed.";
  return "The returned sync batch finished without reported record failures. This is not a receipt for complete mailbox history.";
}

export function canRetrySync(connection: IntegrationConnection) {
  return (
    connection.provider !== "imap_caldav" &&
    ["connected", "error"].includes(connection.status)
  );
}
