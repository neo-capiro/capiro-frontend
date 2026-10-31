"use client";
import { useState } from "react";
import { LegiWatchTabs } from "../components";
import styles from "../legiwatch.module.css";
import { InternalWorkflows } from "./InternalWorkflows";
import { KeywordRules } from "./KeywordRules";
import { RecordRules } from "./RecordRules";
import { StatuteMonitors } from "./StatuteMonitors";
export function MonitoringScreen() {
  const [view, setView] = useState("keywords");
  return (
    <div className={styles.form}>
      <LegiWatchTabs
        label="Monitoring views"
        value={view}
        onChange={setView}
        items={[
          { id: "keywords", label: "Keyword rules" },
          { id: "workflows", label: "Internal workflows" },
          { id: "record", label: "Bill record rules" },
          { id: "agenda", label: "Agenda rules" },
          { id: "statute", label: "Statute monitors" },
        ]}
      />
      {view === "keywords" ? (
        <KeywordRules />
      ) : view === "workflows" ? (
        <InternalWorkflows />
      ) : view === "statute" ? (
        <StatuteMonitors />
      ) : (
        <RecordRules
          key={view}
          family={view === "agenda" ? "agenda" : "record"}
        />
      )}
    </div>
  );
}
