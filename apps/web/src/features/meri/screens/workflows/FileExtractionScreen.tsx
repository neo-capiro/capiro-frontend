import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { PanelPair } from "./PanelPair";
import type { ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import tooling from "./tooling.module.css";

export type FileExtractionView = {
  files: readonly ToolingPanelView[];
  citation: string;
  actions: readonly ActionSpec[];
};

/** 12.16 Exact file extraction coverage: the read bounds of each exact file version. */
export function FileExtractionScreen({
  view,
  backHref,
  unavailable,
}: {
  view: FileExtractionView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="File extraction details"
      description="Illustrative uploaded files · Exact input versions · Partial content"
      backHref={backHref}
      unavailable={unavailable}
    >
      <Notice title="Use only content that was actually extracted">
        File discovery is not full-file reading. Continue unread sections before
        an exhaustive conclusion. Images, embedded binaries and unsupported
        content are not silently converted into evidence.
      </Notice>
      <PanelPair
        label="Extracted files"
        panels={view.files}
        body="large"
        unavailable={unavailable}
      />
      <p className={tooling.caption}>{view.citation}</p>
      <ActionRow
        label="Extraction detail actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
