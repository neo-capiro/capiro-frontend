import { Suspense, type ReactNode } from "react";
import { CapiroBoundary } from "../capiro/CapiroBoundary";
import { publicCapiroConfig, readCapiroConfig } from "../capiro/config";
import { ModuleShell } from "./ModuleShell";
import type { ModuleSlug } from "./module-catalog";

/** Server configuration and session boundary are shared by all connected screens. */
export function ConnectedModule({
  children,
  active,
  settings = false,
}: {
  children: ReactNode;
  active?: ModuleSlug | "hub";
  settings?: boolean;
}) {
  const config = publicCapiroConfig(readCapiroConfig(process.env));
  return (
    <ModuleShell active={active} settings={settings}>
      <CapiroBoundary config={config}>
        <Suspense fallback={<p role="status">Loading view…</p>}>
          {children}
        </Suspense>
      </CapiroBoundary>
    </ModuleShell>
  );
}
