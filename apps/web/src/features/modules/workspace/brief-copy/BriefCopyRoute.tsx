"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { briefCopySourceSchema } from "@/shared/capiro/operations/workspace-brief-copy";
import { workspaceId } from "@/shared/capiro/operations/workspace-schemas";
import { ProspectWorkspace } from "../prospects/ProspectWorkspace";
import { BriefCopyFlow } from "./BriefCopyFlow";

export function BriefCopyRoute() {
  const query = useSearchParams();
  const router = useRouter();
  const prospect = workspaceId.safeParse(query.get("prospectId"));
  const draft = workspaceId.safeParse(query.get("draftId"));
  const document = workspaceId.safeParse(query.get("copyDocumentId"));
  const raw = query.get("briefSource");
  let source;
  try {
    source =
      raw && raw.length <= 1500
        ? briefCopySourceSchema.parse(JSON.parse(raw))
        : undefined;
  } catch {
    source = undefined;
  }
  const invalid =
    !prospect.success ||
    (raw !== null && (!source || source.prospectId !== prospect.data)) ||
    (query.has("draftId") && !draft.success) ||
    (query.has("copyDocumentId") && (!document.success || !draft.success)) ||
    Boolean(source && document.success) ||
    ["prospectId", "draftId", "briefSource", "copyDocumentId"].some(
      (key) => query.getAll(key).length > 1,
    );
  if (invalid || (!source && !document.success))
    return (
      <section role="alert">
        <h1>Workspace copy unavailable</h1>
        <p>This link does not identify one exact source and destination.</p>
      </section>
    );
  if (!prospect.success) return null;
  const base = `/modules/workspace?prospectId=${encodeURIComponent(prospect.data)}`;
  if (!draft.success && source)
    return (
      <>
        <section>
          <h1>Choose a Workspace destination</h1>
          <p>
            Copy the saved Core brief version {source.versionNumber} into an
            existing prospect document. If you create a manual document first,
            copying remains a separate action.
          </p>
        </section>
        <ProspectWorkspace
          prospectId={prospect.data}
          onOpen={(id) =>
            router.push(
              `${base}&draftId=${encodeURIComponent(id)}&briefSource=${encodeURIComponent(JSON.stringify(source))}`,
            )
          }
        />
      </>
    );
  if (!draft.success) return null;
  return (
    <BriefCopyFlow
      key={query.toString()}
      prospectId={prospect.data}
      draftId={draft.data}
      source={source}
      documentId={document.success ? document.data : undefined}
      onClose={() =>
        router.push(`${base}&draftId=${encodeURIComponent(draft.data)}`)
      }
    />
  );
}
