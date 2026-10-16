"use client";
import { useState } from "react";
import { ActionRow } from "./ActionRow";
import { PanelPair } from "./PanelPair";
import { ScopeTags } from "./ScopeTags";
import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import { WorkflowField, type WorkflowFieldView } from "./WorkflowField";
import type { ActionSpec } from "./types";
import tooling from "./tooling.module.css";

export type MemoryConflictView = {
  description: string;
  scope: readonly string[];
  evidence: readonly ToolingPanelView[];
  lifecycle: readonly ToolingPanelView[];
  correction: WorkflowFieldView;
  commands: readonly ActionSpec[];
  history: ToolingPanelView;
};

/**
 * 12.14 Memory conflict & lifecycle: the approved fact stays current while new
 * evidence is reviewed; the correction text is a local draft.
 */
export function MemoryConflictScreen({
  view,
  backHref,
  unavailable,
}: {
  view: MemoryConflictView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  const [correction, setCorrection] = useState(view.correction.value);
  return (
    <ToolingPage
      title="Review a memory conflict"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <ScopeTags label="Memory scope and status" tags={view.scope} />
      <PanelPair
        label="Current fact and new evidence"
        panels={view.evidence}
        body="large"
        unavailable={unavailable}
      />
      <PanelPair
        label="Memory access and lifecycle"
        panels={view.lifecycle}
        tone="muted"
        unavailable={unavailable}
      />
      <WorkflowField
        field={view.correction}
        value={correction}
        onChange={setCorrection}
      />
      <ActionRow
        label="Governed memory commands"
        actions={view.commands}
        unavailable={unavailable}
      />
      <p className={tooling.caption}>
        Confirm, correct and forget require canonical eligibility, the current
        role and current grants. A proposal or approval is separate from a
        successful command receipt.
      </p>
      <ToolingPanel panel={view.history} unavailable={unavailable} />
      <p className={tooling.caption}>
        Canonical memory is distinct from conversation history and temporary
        working notes. Resumed runs recall eligible current records again.
      </p>
    </ToolingPage>
  );
}
