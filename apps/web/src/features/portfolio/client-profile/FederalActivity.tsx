"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useFacilityNexus } from "./facility-map-queries";
import type { FacilityNexus } from "./facility-map-contracts";
import { NexusSourceFreshness } from "./NexusSourceFreshness";
import { ClientProgramContext } from "./ClientProgramContext";
import styles from "./federal-profile.module.css";

export const federalMoney = (value: number | null | undefined) =>
  value == null
    ? "Unavailable"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

export function ClientAwardFacts({
  value,
}: {
  value: FacilityNexus["awarded"];
}) {
  return (
    <dl className={styles.metrics}>
      <div>
        <dt>Contract obligations</dt>
        <dd>{federalMoney(value?.contractObligations)}</dd>
      </div>
      <div>
        <dt>Grant obligations</dt>
        <dd>{federalMoney(value?.grantObligations)}</dd>
      </div>
      <div>
        <dt>Grant outlays</dt>
        <dd>{federalMoney(value?.grantOutlays)}</dd>
      </div>
    </dl>
  );
}

export function FederalActivity({
  clientId,
  enabled,
}: {
  clientId: string;
  enabled: boolean;
}) {
  const nexus = useFacilityNexus(clientId, enabled);
  const data = nexus.enabled && !nexus.error ? nexus.data : undefined;
  return (
    <div className="stack">
      <section className={styles.card} aria-label="Program funding context">
        <h3>Program funding context</h3>
        <p className="muted">
          Public program funding and client-attributable awards are separate
          facts.
        </p>
        <dl className={styles.metrics}>
          <div>
            <dt>FY obligated</dt>
            <dd>Unavailable</dd>
          </div>
          <div>
            <dt>FY request</dt>
            <dd>Unavailable</dd>
          </div>
          <div>
            <dt>Associated programs</dt>
            <dd>Unavailable</dd>
          </div>
        </dl>
        <p className="muted">
          No compatible client funding total is available here. A relevant
          public program&apos;s budget does not establish an award to this
          client or location.
        </p>
      </section>
      <ClientProgramContext clientId={clientId} enabled={enabled} />
      <section className={styles.card} aria-label="Client-attributable awards">
        <h3>Client-attributable awards</h3>
        {!nexus.enabled && (
          <p className="muted">
            A current session is required to load federal evidence.
          </p>
        )}
        <QueryState
          pending={nexus.enabled && nexus.isPending}
          error={nexus.error}
          retry={() => void nexus.refetch()}
        />
        {data && (
          <>
            <ClientAwardFacts value={data.awarded} />
            <p className="muted">
              Returned client Nexus evidence; no reporting-period completeness
              is asserted.
            </p>
            {data.linkage && (
              <p className="muted">
                Contracting identity{" "}
                {data.linkage.contractingLinked ? "linked" : "not linked"};
                assistance identity{" "}
                {data.linkage.assistanceLinked ? "linked" : "not linked"}.
              </p>
            )}
            <NexusSourceFreshness value={data} />
          </>
        )}
      </section>
    </div>
  );
}
