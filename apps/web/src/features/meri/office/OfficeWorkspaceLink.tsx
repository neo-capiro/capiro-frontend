"use client";
import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@capiro/ui/button";
import { workspaceHref } from "../../modules/workspace/workspace-route";

const officeMimes = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
/** What a Workspace link needs of a version: a library row or an applied Meri proposal both supply it. */
export type OfficeTarget = Readonly<{
  versionId: string;
  mimeType?: string | undefined;
  binding: Readonly<{ conversationId: string }>;
  scopes: readonly Readonly<{ kind: string; resourceId: string }>[];
}>;
export const isOfficeTarget = (version: OfficeTarget) =>
  version.mimeType !== undefined && officeMimes.has(version.mimeType);
export const officeClientId = (version: OfficeTarget) =>
  version.scopes[0]?.kind === "client" ? version.scopes[0].resourceId : null;
/** The Workspace route that opens this version in the Office editor. */
export const officeWorkspaceHref = (version: OfficeTarget, runId?: string) =>
  workspaceHref({
    kind: "office",
    versionId: version.versionId,
    conversationId: version.binding.conversationId,
    clientId: officeClientId(version) ?? undefined,
    ...(runId ? { runId } : {}),
  });

const Enabled = createContext(false);
/** Server-decided (`readOfficeConfig`): when Office editing is off for this deployment, no link or screen renders. */
export function OfficeWorkspaceLinks({
  enabled,
  children,
}: {
  enabled: boolean;
  children?: ReactNode;
}) {
  return <Enabled.Provider value={enabled}>{children}</Enabled.Provider>;
}
export const useOfficeWorkspaceEnabled = () => useContext(Enabled);

/** Opens an Office version in the Workspace editor; nothing for other formats or when Office is off. */
export function OfficeWorkspaceLink({
  version,
  label = "Open in Workspace",
}: {
  version: OfficeTarget;
  label?: string;
}) {
  const enabled = useOfficeWorkspaceEnabled();
  if (!enabled || !isOfficeTarget(version)) return null;
  return (
    <Button variant="outline" asChild>
      <Link prefetch={false} href={officeWorkspaceHref(version)}>
        {label}
      </Link>
    </Button>
  );
}
