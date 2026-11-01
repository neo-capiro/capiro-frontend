import type { OutreachCampaignState } from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import { ActionButton, Panel } from "../../../../shared/module-ui";
import { campaignProblem, recipientProblem } from "./campaign-model";
import styles from "./outreach-workflow.module.css";

/** Shows the captured input without claiming that sources have been resolved. */
export function CampaignGenerationBrief({
  state,
  disabled,
  onStep,
}: {
  state: OutreachCampaignState;
  disabled: boolean;
  onStep: (step: number) => void;
}) {
  const problem = campaignProblem(state);
  const repairStep = !state.title.trim() ? 2 : recipientProblem(state) ? 3 : 4;
  return (
    <Panel
      title="Your generation brief"
      description="Check what will guide your drafts. Selected sources are checked again before generation."
    >
      <div className={styles.brief}>
        <div>
          <h3>Purpose</h3>
          <p className={styles.briefPurpose}>
            {state.mainIdea.trim() ||
              state.decisions?.goal.trim() ||
              "Add a main idea to guide the message."}
          </p>
          {state.decisions && (
            <details>
              <summary>Carried campaign plan</summary>
              <dl className={styles.briefFacts}>
                {(
                  [
                    ["Goal", state.decisions.goal],
                    ["Objective", state.decisions.objective],
                    ["Topic", state.decisions.topic],
                    ["Why now", state.decisions.whyNow],
                    ["Angle", state.decisions.campaignAngle],
                  ] as const
                )
                  .filter(([, value]) => value.trim())
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            </details>
          )}
        </div>
        <dl className={styles.briefFacts}>
          <div>
            <dt>Writing style</dt>
            <dd>
              {state.tone} · {state.length} length
            </dd>
          </div>
          <div>
            <dt>Context</dt>
            <dd>
              {state.contextItems.length} selected sources or notes ·{" "}
              {state.contextSelections?.length ?? 0} carried sources
            </dd>
          </div>
          <div>
            <dt>Writing samples</dt>
            <dd>{state.styleSamples.length} selected</dd>
          </div>
          <div>
            <dt>Template</dt>
            <dd>{state.templateId ? "Selected template" : "From scratch"}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.actions}>
        <ActionButton disabled={disabled} onClick={() => onStep(4)}>
          Edit purpose
        </ActionButton>
        <ActionButton disabled={disabled} onClick={() => onStep(5)}>
          Review context
        </ActionButton>
      </div>
      {problem && (
        <div className={styles.readiness} role="status">
          <p>{problem}</p>
          <ActionButton disabled={disabled} onClick={() => onStep(repairStep)}>
            Complete required details
          </ActionButton>
        </div>
      )}
    </Panel>
  );
}
