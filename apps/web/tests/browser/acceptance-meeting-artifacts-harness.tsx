import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MeetingArtifacts } from "@/features/portfolio/calendar/MeetingArtifacts";
import { acceptanceMeeting } from "./acceptance-meeting-artifacts-data";

/** Synthetic controls observe the real query/mutation owners, not replacement logic. */
export function AcceptanceMeetingArtifactsHarness() {
  const cache = useQueryClient();
  const parameters = new URLSearchParams(location.search);
  const kind = parameters.get("kind") === "debriefs" ? "debriefs" : "notes";
  const [clientId, setClientId] = useState<string | null>(
    parameters.has("unscoped") ? null : "client-one",
  );
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const list = () =>
      cache
        .getQueryCache()
        .findAll({ queryKey: ["meeting", "meeting-one"] })
        .find(
          (query) =>
            query.queryKey.includes(kind) && query.getObserversCount() > 0,
        );
    const controls = {
      refresh() {
        void cache.invalidateQueries({ queryKey: ["meeting", "meeting-one"] });
      },
      listState() {
        const state = list()?.state;
        return state
          ? {
              status: state.status,
              fetchStatus: state.fetchStatus,
              errorUpdatedAt: state.errorUpdatedAt,
              dataUpdatedAt: state.dataUpdatedAt,
            }
          : null;
      },
      attempt() {
        return cache.getQueryData([
          "meeting-artifact-attempt",
          "tenant-test",
          "user-test",
          "meeting-one",
          clientId,
          kind,
        ]);
      },
      replaceClient: (value: string | null) => setClientId(value),
      toggle: () => setVisible((value) => !value),
    };
    Object.assign(window, { __acceptanceMeetingArtifacts: controls });
    return () => {
      delete (window as unknown as Record<string, unknown>)
        .__acceptanceMeetingArtifacts;
    };
  }, [cache, clientId, kind]);
  return (
    <main style={{ padding: 24 }}>
      <h1>Synthetic meeting artifact acceptance</h1>
      <p>Current client: {clientId ?? "No client"}</p>
      {visible && (
        <MeetingArtifacts meeting={acceptanceMeeting(clientId)} kind={kind} />
      )}
    </main>
  );
}
