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
import { CodeView, VerificationActivity } from "./CodeActivity";
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
  activity: readonly string[];
  activityNote: string;
};
const tabs = [
  { id: "preview", label: "Preview" },
  { id: "code", label: "Code" },
  { id: "activity", label: "Activity" },
] as const;

/** 03.06 Generated web preview and 03.07 Code and execution activity, as tabs of one artifact. */
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
  const activity = (
    <VerificationActivity
      steps={view.activity}
      note={view.activityNote}
      unavailable={unavailable}
    />
  );
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
      ) : tab === "code" ? (
        <>
          <CodeView label={view.codeLabel} lines={view.code} />
          {activity}
        </>
      ) : (
        activity
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
