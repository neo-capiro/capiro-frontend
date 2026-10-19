import Link from "next/link";
import { briefCopySourceSchema } from "@/shared/capiro/operations/workspace-brief-copy";
import type { BriefScope } from "./api";
import type { BriefVersion, CurrentBrief } from "./contracts";

/** A navigation hint to a deliberate Workspace action, never a write or grant. */
export function WorkspaceCopyLink({
  scope,
  brief,
  version,
}: {
  scope: BriefScope;
  brief: CurrentBrief["brief"];
  version: BriefVersion | null | undefined;
}) {
  if (
    !brief ||
    !version ||
    brief.tenantId !== scope.tenantId ||
    brief.prospectId !== scope.prospectId
  )
    return null;
  const source = briefCopySourceSchema.safeParse({
    kind: "core_prospect_brief_version",
    prospectId: scope.prospectId,
    briefId: brief.id,
    versionId: version.id,
    versionNumber: version.versionNumber,
    sectionsHash: version.sectionsHash,
    snapshotHash: version.snapshotHash,
  });
  if (!source.success)
    return <p>Workspace copy requires a complete saved source identity.</p>;
  const query = new URLSearchParams({
    prospectId: scope.prospectId,
    briefSource: JSON.stringify(source.data),
  });
  return (
    <div className="stack">
      <Link className="button" href={`/modules/workspace?${query}`}>
        Copy to Workspace
      </Link>
      <small>
        Choose a destination for an independently editable copy of version{" "}
        {version.versionNumber}. Core stays unchanged.
      </small>
    </div>
  );
}
