import { ChevronDown, FileText, Sparkle } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";

/** ArtifactActions row: exact-version download, revision and client filing, each linking to its flow. */
export function ArtifactActionBar({
  downloadHref,
  reviseHref,
  fileHref,
  unavailable,
}: {
  downloadHref?: string | undefined;
  reviseHref?: string | undefined;
  fileHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.row} role="group" aria-label="Artifact actions">
      <LinkAction
        variant="outline"
        href={downloadHref}
        unavailable={unavailable}
      >
        <ChevronDown aria-hidden /> Download
      </LinkAction>
      <LinkAction variant="outline" href={reviseHref} unavailable={unavailable}>
        <Sparkle aria-hidden /> Revise
      </LinkAction>
      <LinkAction variant="primary" href={fileHref} unavailable={unavailable}>
        <FileText aria-hidden /> File to client
      </LinkAction>
    </div>
  );
}
