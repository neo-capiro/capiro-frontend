"use client";
import { useState } from "react";
import { StatusPanel } from "../../../../../shared/module-ui";
import { LegiWatchTabs } from "../components";
import {
  EvidenceScopePicker,
  useEvidenceScope,
} from "../sources/EvidenceScope";
import styles from "../legiwatch.module.css";
import { FloridaLaw } from "./FloridaLaw";
import { ResearchCoverage } from "./ResearchCoverage";
import { ResearchSearch } from "./ResearchSearch";

const views = [
  { id: "text", label: "Legislative text" },
  { id: "law", label: "Florida law" },
  { id: "rules", label: "Rules & deadlines" },
  { id: "coverage", label: "Source coverage" },
];
export function ResearchScreen() {
  const [folderId, setFolderId] = useState(""),
    [view, setView] = useState("text");
  const state = useEvidenceScope(folderId);
  return (
    <div className={styles.form} data-figma-node="923:180744">
      <EvidenceScopePicker
        value={folderId}
        onChange={setFolderId}
        state={state}
      />
      <LegiWatchTabs
        value={view}
        items={views}
        onChange={setView}
        label="Research evidence views"
      />
      {folderId && !state.selected ? (
        <StatusPanel
          loading={state.folders.loading}
          error={state.folders.error ?? "The selected folder is unavailable."}
        />
      ) : (
        <div key={`${folderId}:${view}`}>
          {view === "text" && <ResearchSearch scope={state.scope} />}
          {(view === "law" || view === "rules") && (
            <FloridaLaw
              scope={state.scope}
              rules={view === "rules"}
              canEdit={state.selected?.canEdit === true}
            />
          )}
          {view === "coverage" && <ResearchCoverage scope={state.scope} />}
        </div>
      )}
    </div>
  );
}
