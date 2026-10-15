import { ChevronDown, FileText, Sparkle } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";

/** ArtifactActions row: exact-version download, revision and client filing. */
export function ArtifactActionBar({
  reviseHref,
  unavailable,
}: {
  reviseHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.row} role="group" aria-label="Artifact actions">
      <button type="button" className={ui.outline} disabled title={unavailable}>
        <ChevronDown aria-hidden /> Download
      </button>
      <LinkAction variant="outline" href={reviseHref} unavailable={unavailable}>
        <Sparkle aria-hidden /> Revise
      </LinkAction>
      <button type="button" className={ui.primary} disabled title={unavailable}>
        <FileText aria-hidden /> File to client
      </button>
    </div>
  );
}
