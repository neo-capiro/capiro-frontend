import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ObjectivesPage } from "@/features/portfolio/objectives/ObjectivesPage";
import { clientId } from "./fixtures";

/** Test-only cache transitions; all Objective components and writers are real. */
export function ObjectiveSessionHarness() {
  const cache = useQueryClient();
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const actor = () =>
      cache.setQueryData(["identity"], {
        user: { id: "another-user", email: "another@example.test" },
        tenant: { id: "another-tenant", name: "Another synthetic tenant" },
        role: "standard_user",
      });
    const role = () =>
      cache.setQueryData(["identity"], {
        user: { id: "user-test", email: "test@example.test" },
        tenant: { id: "tenant-test", name: "Synthetic tenant" },
        role: "client_portal_user",
      });
    const invalidated = () =>
      void cache.invalidateQueries({
        queryKey: ["identity"],
        refetchType: "none",
      });
    const unmount = () => setShown(false);
    const events = {
      "objective-session-actor-change": actor,
      "objective-session-role-change": role,
      "objective-session-invalidate": invalidated,
      "objective-session-unmount": unmount,
    };
    for (const [name, handler] of Object.entries(events))
      window.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of Object.entries(events))
        window.removeEventListener(name, handler);
    };
  }, [cache]);
  return shown ? (
    <ObjectivesPage clientId={clientId} />
  ) : (
    <p>Objective editor unmounted</p>
  );
}
