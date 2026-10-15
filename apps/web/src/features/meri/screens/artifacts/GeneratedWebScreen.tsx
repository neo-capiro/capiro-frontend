"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import ui from "../../ui/meri-ui.module.css";
import shared from "./artifacts.module.css";
import {
  ArtifactFlowActions,
  ArtifactFlowSheets,
  useArtifactSheet,
} from "../files/ArtifactFlows";
import type { ArtifactFlowView } from "../files/types";
import {
  CodeView,
  VerificationActivity,
  type VerificationLog,
} from "./CodeActivity";
import type { Heading } from "./types";
import { WebPreviewPanel } from "./WebPreviewPanel";

export type GeneratedWebTab = "preview" | "code" | "activity";
export type GeneratedWebView = {
  headings: Readonly<Record<GeneratedWebTab, Heading>>;
  fileName: string;
  /** Static synthetic HTML rendered only through an empty-sandbox iframe. */
  html: string;
  previewNote: string;
  codeLabel: string;
  code: readonly string[];
  /** Checked steps shown under the source on the Code tab (03.07). */
  codeActivity: VerificationLog;
  /** The version's verification receipt on the Activity tab (03.07A). */
  receipt: VerificationLog;
  activityNote: string;
};
const tabs = [
  { id: "preview", label: "Preview" },
  { id: "code", label: "Code" },
  { id: "activity", label: "Activity" },
] as const;

/** 03.06 Generated web preview, 03.07 Code and execution activity and 03.07A verification activity, as tabs of one artifact. */
export function GeneratedWebScreen({
  view,
  flow,
  initialTab,
  unavailable,
}: {
  view: GeneratedWebView;
  /** Revise, file and download sheets for this generated page. */
  flow: ArtifactFlowView;
  initialTab: GeneratedWebTab;
  unavailable: string;
}) {
  const sheets = useArtifactSheet();
  const [tab, setTab] = useState(initialTab);
  const heading = view.headings[tab];
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={heading.title}
        description={heading.description}
      />
      {tab === "preview" ? (
        <ArtifactFlowActions flow={flow} onOpen={sheets.open} />
      ) : null}
      <SegmentedTabs
        label="Generated artifact view"
        options={tabs}
        value={tab}
        onChange={setTab}
      />
      {tab === "preview" ? (
        <WebPreviewPanel
          fileName={view.fileName}
          html={view.html}
          note={view.previewNote}
        />
      ) : (
        <>
          {tab === "code" ? (
            <CodeView label={view.codeLabel} lines={view.code} />
          ) : null}
          <VerificationActivity
            log={tab === "code" ? view.codeActivity : view.receipt}
            note={view.activityNote}
            unavailable={unavailable}
          />
        </>
      )}
      <ArtifactFlowSheets
        flow={flow}
        sheet={sheets.sheet}
        onClose={sheets.close}
        unavailable={unavailable}
      />
    </div>
  );
}
