import type { ReactNode } from "react";
import { MeriCapabilitiesProvider } from "../../src/shared/meri-resources/CapabilityContext";
import { resolveMeriCapabilities } from "../../src/shared/meri-resources/capabilities";
import { useSearchParams } from "./navigation";

/** Explicit synthetic navigation profile. Native server flags are covered by the API parity tests. */
export function SyntheticMeriCapabilities({
  children,
}: {
  children: ReactNode;
}) {
  const search = useSearchParams();
  const allOff = search.get("capabilities-off") === "1";
  const value = resolveMeriCapabilities(
    allOff
      ? {}
      : {
          conversations: true,
          newConversation: true,
          files: true,
          actions: true,
          taskUpdates: true,
          conversationApprovals: true,
          approvals: search.get("navigation-audit") === "1",
          routines: search.get("navigation-audit") === "1",
          runs: search.get("navigation-audit") === "1",
          dataAccess: search.get("navigation-audit") === "1",
          memory:
            sessionStorage.getItem("memory-owner-review-enabled") === "true",
          preferences: true,
        },
  );
  return (
    <MeriCapabilitiesProvider value={value}>
      {children}
    </MeriCapabilitiesProvider>
  );
}
