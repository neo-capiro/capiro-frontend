"use client";
import { usePathname } from "next/navigation";
import { RequireSession } from "../session/SessionContext";
import { useMeriCapabilities } from "./CapabilityContext";
import { meriCapabilityTable, type MeriCapabilityId } from "./capabilities";

/** Presentation containment only. Native routes still check configuration and current authority. */
export function MeriCapabilityRouteGuard({
  children,
}: {
  children?: React.ReactNode;
}) {
  const pathname = usePathname().replace(/\/$/, "");
  const capabilities = useMeriCapabilities();
  // Home keeps its client selector and independently gated conversation host visible.
  // Fixture and non-Meri paths are not ordinary capability consumers.
  const entry = Object.entries(meriCapabilityTable).find(
    ([, definition]) =>
      definition.ordinaryRoute?.startsWith("/meri/") &&
      definition.ordinaryRoute === pathname,
  );
  if (!entry || capabilities[entry[0] as MeriCapabilityId].status === "on")
    return children;
  const [id, definition] = entry;
  return (
    <RequireSession>
      <section aria-label={definition.label}>
        <h1>{definition.label} unavailable</h1>
        <p role="status">{capabilities[id as MeriCapabilityId].reason}</p>
      </section>
    </RequireSession>
  );
}
