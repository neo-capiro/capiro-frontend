import {
  receiveSkillSelection,
  withoutDocumentRevision,
  type ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import type { ComposerChip } from "../MeriComposer";
import { skillSelectionLabel } from "./SkillSelectionPicker";

type Change = (selection: ConversationSkillSelection) => void;

/** Apply a removal through the shared request receiver so an invalid pair is never carried. */
function remove(
  selection: ConversationSkillSelection,
  drop: (next: ConversationSkillSelection) => void,
  onChange: Change,
) {
  const next = { ...selection };
  drop(next);
  try {
    onChange(receiveSkillSelection(next));
  } catch {
    // The receiver refused the remainder; keep the current selection rather than an unvalidated one.
  }
}

/**
 * The unsent choices the next message will carry, as compact removable chips. Clearing the skill
 * also clears its time window (the window needs a skill) and keeps an additive work definition or
 * website workflow, exactly as the picker's own clear does.
 */
export function composerChips(
  selection: ConversationSkillSelection,
  onChange: Change,
): readonly ComposerChip[] {
  const chips: ComposerChip[] = [];
  if (selection.skill)
    chips.push({
      key: "skill",
      label: skillSelectionLabel(selection),
      onRemove: () =>
        remove(
          selection,
          (next) => {
            delete next.skill;
            delete next.windowRequest;
          },
          onChange,
        ),
    });
  if (selection.siteWorkflow)
    chips.push({
      key: "siteWorkflow",
      label: `Website · ${selection.siteWorkflow.workflowId}`,
      onRemove: () =>
        remove(selection, (next) => delete next.siteWorkflow, onChange),
    });
  if (selection.work)
    chips.push({
      key: "work",
      label: `Work · ${selection.work.jobKind}`,
      onRemove: () => remove(selection, (next) => delete next.work, onChange),
    });
  if (selection.procedure)
    chips.push({
      key: "procedure",
      label: `Procedure · ${
        selection.procedure.source === "firm"
          ? selection.procedure.recordId
          : selection.procedure.id
      }`,
      onRemove: () =>
        remove(selection, (next) => delete next.procedure, onChange),
    });
  if (selection.documentRevision)
    chips.push({
      key: "documentRevision",
      label: `Revision · ${selection.documentRevision.versionId.slice(0, 8)}`,
      onRemove: () => onChange(withoutDocumentRevision(selection)),
    });
  return chips;
}
