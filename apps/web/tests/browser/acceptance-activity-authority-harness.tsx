import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { ActivityTimeline } from "@/features/portfolio/client-profile/ActivityTimeline";
import { profileKey } from "@/features/portfolio/client-profile/queries";
import { clientId } from "./fixtures";

declare global {
  interface Window {
    __acceptanceActivityAuthority?: {
      replaceIdentity: (boundary: "actor" | "tenant" | "restore") => void;
      snapshot: () => {
        pendingMutations: number;
        pendingQueries: number;
        invalidations: number;
      };
    };
  }
}

/** Only identity transitions and public cache observations are synthetic. */
export function AcceptanceActivityAuthorityHarness() {
  const cache = useQueryClient();
  const identity = useIdentity();
  useEffect(() => {
    let invalidations = 0;
    const activityKey = JSON.stringify(profileKey(clientId, "activity"));
    const unsubscribe = cache.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.action.type === "invalidate" &&
        JSON.stringify(event.query.queryKey) === activityKey
      )
        invalidations += 1;
    });
    const control = {
      replaceIdentity(boundary: "actor" | "tenant" | "restore") {
        cache.setQueryData(["identity"], {
          user: {
            id: boundary === "actor" ? "replacement-user" : "user-test",
            email: "synthetic@example.test",
          },
          tenant: {
            id: boundary === "tenant" ? "replacement-tenant" : "tenant-test",
            name: "Synthetic tenant",
          },
          role: "user_admin",
        });
      },
      snapshot: () => ({
        pendingMutations: cache.isMutating(),
        pendingQueries: cache.isFetching(),
        invalidations,
      }),
    };
    window.__acceptanceActivityAuthority = control;
    return () => {
      unsubscribe();
      if (window.__acceptanceActivityAuthority === control)
        delete window.__acceptanceActivityAuthority;
    };
  }, [cache]);
  return (
    <main className="stack" style={{ padding: 24 }}>
      <h1>Synthetic activity authority acceptance</h1>
      <output aria-label="Synthetic activity actor">
        {identity.data?.user.id}:{identity.data?.tenant?.id}
      </output>
      <ActivityTimeline clientId={clientId} />
    </main>
  );
}
