import type { z } from "zod";
import type { integrationSchema } from "../../../shared/capiro/operations/settings-schemas";
import { SettingsNotice } from "../components";

type Connection = z.infer<typeof integrationSchema>;
const time = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString()
    : "Not recorded";

export function IntegrationHealth({ connection }: { connection: Connection }) {
  const coverage = connection.mailCoverage;
  return (
    <div>
      <p>
        Mail coverage: {coverage ? coverage.sourceStatus : "not reported"}.{" "}
        {coverage?.backfillComplete
          ? "Configured backfill completed."
          : "Complete backfill has not been confirmed."}{" "}
        {coverage?.hasMore ? "More mail remains to import." : ""}
      </p>
      {(["mail", "calendar"] as const).map((resource) => {
        const health = connection.health?.[resource];
        return (
          <p key={resource}>
            {resource === "mail" ? "Mail" : "Calendar"}:{" "}
            {health?.outcome ?? "no batch result recorded"}. Last complete
            batch: {time(health?.lastCompleteAt)}.
            {health?.failed
              ? ` ${health.failed} records failed or were held.`
              : ""}
          </p>
        );
      })}
      <p>
        Next scheduled sync: {time(connection.nextSyncAt)}. A scheduled time
        does not confirm that the worker is running. History is limited to the
        provider’s configured folders and import window.
      </p>
      {connection.subscriptions && connection.provider === "microsoft_365" && (
        <div>
          <p>
            Realtime notifications:{" "}
            {connection.subscriptions.configured
              ? "configured"
              : "not confirmed"}
            . Last notification:{" "}
            {time(connection.subscriptions.lastNotificationAt)}.
          </p>
          {connection.subscriptions.lastLifecycleEvent && (
            <p>
              Latest lifecycle event:{" "}
              {connection.subscriptions.lastLifecycleEvent}.
            </p>
          )}
          {connection.subscriptions.resources.map((resource) => (
            <p key={resource.resource}>
              {resource.resource === "me/messages" ? "Mail" : "Calendar"}:
              expires {time(resource.expiresAt)}; last renewal{" "}
              {time(resource.lastRenewedAt)}.
              {resource.needsReauthorization
                ? " Reauthorization required."
                : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function IntegrationPermissions({
  connection,
}: {
  connection: Connection;
}) {
  const permissions = connection.permissions;
  return (
    <div>
      <h3>Requested permissions</h3>
      <ul>
        {(permissions?.requestedScopes ?? connection.scopes).map((scope) => (
          <li key={scope}>{scope}</li>
        ))}
      </ul>
      <h3>Verified provider grants</h3>
      {permissions?.grantedScopes ? (
        <>
          <ul>
            {permissions.grantedScopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
          <p>
            Last verified: {time(permissions.lastVerifiedAt)}. Permissions may
            have changed at the provider since that verification.
          </p>
        </>
      ) : (
        <SettingsNotice title="Current grants have not been verified">
          Stored scope names can reflect requested permissions. Reconnect to
          verify this account’s grants.
        </SettingsNotice>
      )}
      <p>
        A grant does not establish runtime availability. Sync health is reported
        separately; mail sending is outside this screen.
      </p>
    </div>
  );
}
