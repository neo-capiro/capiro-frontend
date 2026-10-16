"use client";
import { useId, useState } from "react";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import { ScopeTags } from "./ScopeTags";
import { ToolingPage } from "./ToolingPage";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type WorkflowRequestView = {
  workflow: string;
  context: readonly string[];
  prompt: string;
  requiredSources: string;
  attached: readonly string[];
  editInputsHref?: string | undefined;
  cancelHref?: string | undefined;
  sourceAccessHref?: string | undefined;
};

/** Request composer: the prompt is a local draft; Run is a trusted action and stays disabled. */
function RequestComposer({
  view,
  unavailable,
}: {
  view: WorkflowRequestView;
  unavailable: string;
}) {
  const [prompt, setPrompt] = useState(view.prompt);
  const promptId = useId();
  return (
    <section className={styles.composer} aria-labelledby="request-workflow">
      <h2 id="request-workflow" className={styles.titleL}>
        {view.workflow}
      </h2>
      <div className={`${tooling.small} ${tooling.muted}`}>
        {view.context.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className={styles.promptBox}>
        <label htmlFor={promptId} className="sr-only">
          Request prompt
        </label>
        <textarea
          id={promptId}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
        />
        <ScopeTags label="Workflow" tags={["Workflow attached"]} />
        <div className={ui.row}>
          <LinkAction variant="ghost" unavailable={unavailable}>
            Attach
          </LinkAction>
          <LinkAction
            variant="outline"
            href={view.editInputsHref}
            unavailable={unavailable}
          >
            Edit workflow inputs
          </LinkAction>
        </div>
      </div>
      <div className={ui.row}>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Run workflow
        </button>
        <LinkAction
          variant="ghost"
          href={view.cancelHref}
          unavailable={unavailable}
        >
          Cancel
        </LinkAction>
      </div>
      <p className={tooling.caption}>
        Meri resolves the current workflow revision and validates the subject,
        dates, permitted sources and completion requirements before accepting
        work.
      </p>
    </section>
  );
}

/** 12.07 Workflow request & context: the selected workflow and its typed context stay attached. */
export function WorkflowRequestScreen({
  view,
  backHref,
  unavailable,
}: {
  view: WorkflowRequestView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Review your request"
      description="The selected workflow and its typed context remain attached as you edit the prompt."
      backHref={backHref}
      unavailable={unavailable}
    >
      <div className={styles.split} data-ratio="wide">
        <RequestComposer view={view} unavailable={unavailable} />
        <section
          className={`${tooling.box} ${styles.requestAside}`}
          data-tone="muted"
          aria-label="Required sources and completion"
        >
          <h2 className={tooling.boxTitle}>Required sources</h2>
          <p className={tooling.small}>{view.requiredSources}</p>
          <h2 className={tooling.boxTitle}>What remains attached</h2>
          <ul className={`${tooling.small} ${styles.plainList}`}>
            {view.attached.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <LinkAction
            variant="outline"
            href={view.sourceAccessHref}
            unavailable={unavailable}
          >
            Review source access
          </LinkAction>
          <p className={tooling.caption}>
            A missing source is disclosed. Meri asks for clarification when the
            selected identity or date cannot be resolved.
          </p>
        </section>
      </div>
    </ToolingPage>
  );
}
