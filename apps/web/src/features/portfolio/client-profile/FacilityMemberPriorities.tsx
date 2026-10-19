"use client";
import type { ProfileDistrictPriority } from "./profile-evidence-contracts";
import { federalMoney } from "./FederalActivity";
import {
  ProfileEvidenceState,
  ProfileReturnedRows,
  profileTime,
} from "./ProfileEvidenceState";
import styles from "./facility-profile.module.css";

type EvidenceStatus = Parameters<typeof ProfileEvidenceState>[0]["query"];

type FundingRequest =
  ProfileDistrictPriority["priorityIntelligence"]["cpfCds"]["districtRequests"][number];
function FundingRequests({
  rows,
  client,
}: {
  rows: FundingRequest[];
  client: boolean;
}) {
  const attributed = client
    ? rows.filter((row) => row.clientAttribution !== null)
    : rows;
  if (!attributed.length)
    return (
      <p className="muted">
        No {client ? "client-attributed" : "public district"} requests returned.
      </p>
    );
  return (
    <ProfileReturnedRows
      rows={attributed}
      rowKey={(row) => row.requestId}
      render={(row) => (
        <>
          <strong>{row.projectTitle}</strong>
          <p>
            {row.requesterName} · {row.chamber.toUpperCase()}{" "}
            {row.requestType.toUpperCase()} · FY {row.fiscalYear}
          </p>
          <p>
            Requested {federalMoney(row.requestedAmountUsd)} · Final{" "}
            {federalMoney(row.finalAmountUsd)}
          </p>
          <p className="muted">
            Stage: {row.amountStageRaw} · Account:{" "}
            {row.appropriationsAccountRaw ?? "Unavailable"}
          </p>
          <p className="muted">
            Recipient: {row.recipientName}. Geography:{" "}
            {row.geography.basis.replaceAll("_", " ")},{" "}
            {row.districtKey ?? "no district attribution"}.
            {row.clientAttribution
              ? ` Client attribution: ${row.clientAttribution.method.replaceAll("_", " ")}.`
              : " No client attribution returned."}
            {` Source request ${row.requestId}; ${row.sourceOccurrenceCount} source occurrences.`}
          </p>
        </>
      )}
    />
  );
}

export function FacilityMemberPriorities({
  id,
  status,
  data,
}: {
  id: string;
  status: EvidenceStatus;
  data: ProfileDistrictPriority | undefined;
}) {
  const signals = data?.priorityIntelligence;
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.card}
      aria-label="Member priorities"
    >
      <h3>Member priorities</h3>
      <ProfileEvidenceState query={status} />
      {signals && (
        <>
          <p className="muted">
            CPF/CDS source availability: {signals.cpfCds.availability.status}.
            {signals.cpfCds.availability.reason &&
              ` ${signals.cpfCds.availability.reason.replaceAll("_", " ")}.`}
            {` Last ingest observation ${profileTime(signals.cpfCds.availability.lastIngestRunAt)}.`}
            Availability does not establish complete current coverage.
          </p>
          <h4>Client-attributed requests</h4>
          {signals.cpfCds.clientRequests.some(
            (row) => row.clientAttribution === null,
          ) && (
            <p className="muted">
              Some returned entries lack explicit client attribution and are not
              listed as client-attributed requests.
            </p>
          )}
          <FundingRequests rows={signals.cpfCds.clientRequests} client />
          <h4>Public district requests</h4>
          <FundingRequests
            rows={signals.cpfCds.districtRequests}
            client={false}
          />
          {signals.cpfCds.warnings.map((text, index) => (
            <p className="muted" key={index}>
              {text}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
