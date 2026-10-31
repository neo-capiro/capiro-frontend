"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  assertProfileActor,
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import { profileReadKey } from "./profile-keys";
import { ProfileReturnedRows, profileTime } from "./ProfileEvidenceState";
import {
  currentCommitteeAssignments,
  facilityCommitteeSnapshotSchema,
  validCommitteeBioguide,
  type FacilityCommitteeSnapshot,
} from "./facility-committee-contracts";

type Props = {
  clientId: string;
  member: { bioguideId: string; fullName: string };
  enabled: boolean;
};

export function FacilityCommittees(props: Props) {
  const actor = useProfileActor();
  return (
    <CurrentMemberCommittees
      key={JSON.stringify([
        profileActorKey(actor),
        props.clientId,
        props.member.bioguideId.toUpperCase(),
        props.enabled,
      ])}
      {...props}
      actor={actor}
    />
  );
}

function CurrentMemberCommittees({
  clientId,
  member,
  enabled,
  actor,
}: Props & { actor?: ProfileActor }) {
  const [requested, setRequested] = useState(false);
  const api = useApi();
  const cache = useQueryClient();
  const available =
    enabled &&
    Boolean(clientId.trim()) &&
    validCommitteeBioguide(member.bioguideId);
  const active = available && requested && Boolean(actor);
  const query = useQuery({
    queryKey: [
      ...profileReadKey(clientId, "facility-committees", actor),
      member.bioguideId.toUpperCase(),
    ],
    enabled: active,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      if (!actor || !available)
        throw new Error("Current member scope and session are required.");
      assertProfileActor(cache, actor);
      const snapshot = await api.request(
        "core",
        `directory/members/${encodeURIComponent(member.bioguideId)}`,
        facilityCommitteeSnapshotSchema(member.bioguideId),
        { method: "GET", signal },
      );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return snapshot;
    },
  });
  const snapshot =
    active && query.isSuccess && !query.error && !query.isFetching
      ? query.data
      : undefined;
  return (
    <section
      className="card stack"
      aria-label={`Committee context for ${member.fullName}`}
    >
      <h4>Committee context — {member.fullName}</h4>
      <p className="muted">
        Directory evidence is separate from elected representation. Directory
        may cache data for 30 minutes and can serve a stale snapshot. No
        freshness lease or exhaustive coverage is provided.
      </p>
      {!available ? (
        <p className="muted">
          A current client scope and valid Bioguide identity are required to
          load this snapshot.
        </p>
      ) : !actor ? (
        <p className="muted">
          A current session is required to load committee context.
        </p>
      ) : (
        <button
          className="button"
          disabled={query.isFetching}
          onClick={() => {
            if (requested) {
              if (!query.isFetching) void query.refetch();
            } else setRequested(true);
          }}
        >
          {requested
            ? `Reload committee snapshot · ${member.fullName}`
            : `Load committee snapshot · ${member.fullName}`}
        </button>
      )}
      {active && (
        <>
          {query.error && (
            <p role="status">
              Committee snapshot unavailable. Other facility evidence is
              unchanged.
            </p>
          )}
          <QueryState
            pending={query.isFetching}
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
          {snapshot && <FacilityCommitteeSnapshotView snapshot={snapshot} />}
        </>
      )}
    </section>
  );
}

export function FacilityCommitteeSnapshotView({
  snapshot,
}: {
  snapshot: FacilityCommitteeSnapshot;
}) {
  const rows = currentCommitteeAssignments(snapshot);
  return (
    <>
      <p className="muted">
        Directory snapshot {snapshot.source.snapshotId} · Source updated{" "}
        {profileTime(snapshot.source.lastUpdatedAt)}.
      </p>
      <p className="muted">
        Returned canonical member {snapshot.id}. Associations below have no end
        date in this snapshot; that is not a live freshness guarantee.
      </p>
      {rows.length ? (
        <ProfileReturnedRows
          rows={rows}
          rowKey={(row, index) =>
            `${row.committeeId}:${row.startedAt}:${index}`
          }
          render={(row) => (
            <>
              <strong>
                {row.committeeName || "Committee name unavailable"}
              </strong>
              <p>
                {row.position ?? "Position unavailable"} · Status{" "}
                {row.status ?? "unavailable"}
              </p>
              <p className="muted">
                Started {profileTime(row.startedAt)} · End date not supplied ·
                Source updated {profileTime(row.sourceUpdatedAt)}
              </p>
              <p className="muted">
                Committee {row.committeeId} · Party {row.party ?? "unavailable"}{" "}
                · Rank {row.rank ?? "unavailable"}
              </p>
            </>
          )}
        />
      ) : (
        <p className="muted">
          No current committee assignments were returned in this snapshot. This
          does not establish that the member has none.
        </p>
      )}
    </>
  );
}
