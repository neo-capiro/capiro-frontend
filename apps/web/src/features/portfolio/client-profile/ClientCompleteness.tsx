"use client";
import { useState } from "react";
import type { Client } from "@/features/portfolio/index/public";
import {
  ClientIntakeDialog,
  clientToIntake,
} from "@/features/portfolio/client-intake/public";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";

export function ClientCompleteness({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false);
  const identity = useIdentity();
  const values = clientToIntake(client);
  const fields = [
    ["Company description", Boolean(values.description.trim())],
    ["Website", Boolean(values.website.trim())],
    ["Sector", values.sectors.some((value) => value.trim())],
    ["Primary contact", Boolean(values.primaryContactName.trim())],
    ["Engagement start date", Boolean(values.engagementStartDate.trim())],
    [
      "Funding priorities",
      values.fundingPriorities.some((value) => value.trim()),
    ],
  ] as const;
  const missing = fields.filter(([, recorded]) => !recorded);
  if (!missing.length) return null;
  const canEdit =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    canAdminister(identity.data?.role);
  return (
    <aside className="status" aria-label="Profile completeness">
      <details>
        <summary>{missing.length} profile details not provided</summary>
        <ul>
          {missing.map(([label]) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <p>
          This checks saved fields only. Review recorded text for accuracy and
          completeness.
        </p>
      </details>
      <button
        className="button ghost"
        disabled={!canEdit}
        onClick={() => setEditing(true)}
      >
        Complete profile details
      </button>
      {identity.isPending || identity.isFetching ? (
        <small>Checking edit access…</small>
      ) : identity.error ? (
        <small>
          Edit access could not be confirmed. Reload the profile to check again.
        </small>
      ) : (
        !canEdit && (
          <small>Ask a profile administrator to update these details.</small>
        )
      )}
      <ClientIntakeDialog
        client={client}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => setEditing(false)}
      />
    </aside>
  );
}
