import type { z } from "zod";
import type {
  integrationSchema,
  integrationSyncResponseSchema,
} from "../../../shared/capiro/operations/settings-schemas";

type Connection = z.infer<typeof integrationSchema>;
type SyncResult = z.infer<typeof integrationSyncResponseSchema>;
export type OAuthOutcome = {
  provider: "microsoft_365" | "google_workspace";
  kind:
    | "connected"
    | "access_denied"
    | "cancelled"
    | "admin_consent"
    | "failed";
  connectionId?: string;
};
export type OutcomeNotice = { title: string; message: string; error?: boolean };
const callbackKeys = [
  "provider",
  "connectionId",
  "connected",
  "error",
  "admin_consent",
  "error_description",
  "code",
  "state",
  "tenant",
];

/** Query parameters are hints only; no provider text or credentials reach the UI. */
export function consumeOAuthOutcome(url: URL): OAuthOutcome | null {
  const query = new URLSearchParams(url.search);
  if (!query.has("provider")) return null;
  for (const key of callbackKeys) url.searchParams.delete(key);
  const provider = query.get("provider");
  if (provider !== "microsoft_365" && provider !== "google_workspace")
    return null;
  const failed: OAuthOutcome = { provider, kind: "failed" };
  if (callbackKeys.some((key) => query.getAll(key).length > 1)) return failed;
  const outcomes = ["connected", "error", "admin_consent"].filter((key) =>
    query.has(key),
  );
  if (outcomes.length !== 1) return failed;
  if (query.has("error")) {
    const error = query.get("error");
    return {
      provider,
      kind:
        error === "access_denied" || error === "cancelled" ? error : "failed",
    };
  }
  if (provider === "microsoft_365" && query.get("admin_consent") === "1")
    return { provider, kind: "admin_consent" };
  const connectionId = query.get("connectionId") ?? "";
  if (
    query.get("connected") !== "1" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      connectionId,
    )
  )
    return failed;
  return { provider, kind: "connected", connectionId };
}

/** Only an exact current owned connection read may confirm connection state. */
export function oauthOutcomeNotice(
  outcome: OAuthOutcome,
  connections: Connection[],
): OutcomeNotice {
  if (outcome.kind === "connected") {
    const row = connections.find(
      (connection) =>
        connection.id === outcome.connectionId &&
        connection.provider === outcome.provider,
    );
    if (row?.status === "connected")
      return {
        title: "Account is connected",
        message:
          "The current account connection is confirmed. Mail import and permissions are reported separately.",
      };
    return {
      title: "Connection could not be confirmed",
      error: true,
      message: row
        ? "This account still needs attention. Review its connection status before reconnecting."
        : "No matching account was returned for your current sign-in. Reload integrations to check again.",
    };
  }
  if (outcome.kind === "admin_consent")
    return {
      title: "Administrator consent returned",
      message:
        "Administrator consent alone does not connect a mailbox. Use Connect account to sign in with your own Microsoft 365 work or school account.",
    };
  if (outcome.kind === "cancelled")
    return {
      title: "Sign-in cancelled",
      message:
        "No new connection was confirmed. You can try connecting again when ready.",
    };
  if (outcome.kind === "access_denied")
    return {
      title: "Permission was not granted",
      error: true,
      message:
        "Review the requested permissions or ask your administrator about consent, then connect again.",
    };
  return {
    title: "Connection was not confirmed",
    error: true,
    message:
      "The provider sign-in could not be completed. Review the current account status and try connecting again.",
  };
}

export function syncOutcomeMessage(result: SyncResult): string {
  if (
    Object.values(result.health ?? {}).some(
      (resource) => resource.outcome === "failed",
    )
  )
    return "Some resources could not sync. Review mail and calendar health, then retry sync.";
  if (
    Object.values(result.health ?? {}).some(
      (resource) => resource.outcome === "partial",
    )
  )
    return "Sync made progress, but some records remain pending, failed or held. Review mail and calendar health before treating coverage as complete.";
  const mail = Object.values(result.mail ?? {});
  const stats = [...(result.calendar ? [result.calendar] : []), ...mail];
  if (stats.some((value) => value.failed > 0 || (value.held ?? 0) > 0))
    return "Sync returned failed records or held records. Mail coverage is incomplete; review the account and retry sync.";
  if (!result.calendar || !mail.length)
    return "Sync returned only part of the requested results. Mail and calendar completion could not both be confirmed; retry sync.";
  if (stats.some((value) => value.hasMore))
    return "Sync made progress. More records remain to import; coverage is incomplete.";
  return "This sync batch completed. Imported mail remains limited to the provider’s configured folders and history window.";
}

export function canRetrySync(connection: Connection): boolean {
  return (
    connection.provider !== "imap_caldav" &&
    ["connected", "error"].includes(connection.status)
  );
}
