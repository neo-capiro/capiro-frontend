import type { Ref } from "react";
import { ChevronDown, FileText, Sparkle, Users } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";

/**
 * ArtifactActions row: exact-version download, revision and client filing, each linking
 * to its flow, and Share where the screen offers the sharing dialog.
 */
export function ArtifactActionBar({
  downloadHref,
  reviseHref,
  fileHref,
  onShare,
  shareRef,
  unavailable,
}: {
  downloadHref?: string | undefined;
  reviseHref?: string | undefined;
  fileHref?: string | undefined;
  /** Opens the sharing dialog over the document (04.08B); Share is shown only with it. */
  onShare?: (() => void) | undefined;
  shareRef?: Ref<HTMLButtonElement> | undefined;
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
      {onShare ? (
        <button
          ref={shareRef}
          type="button"
          className={ui.outline}
          aria-haspopup="dialog"
          onClick={onShare}
        >
          <Users aria-hidden /> Share
        </button>
      ) : null}
      <LinkAction variant="primary" href={fileHref} unavailable={unavailable}>
        <FileText aria-hidden /> File to client
      </LinkAction>
    </div>
  );
}
