import { useState, type ComponentProps } from "react";
import type {
  OrdinaryDraftSave as SaveComponent,
  OrdinarySave,
} from "../src/features/modules/workspace/ordinary-save/OrdinaryDraftSave";
import { manualDraftInput } from "../src/features/modules/workspace/prospects/manual-draft";

// Presentation-only seam for pre-existing static host/export tests. Mounted
// browser witnesses exercise the real journal, CAS, association and save owner.
export function OrdinaryDraftSave({
  draft,
  onClose,
  editor: Editor,
}: ComponentProps<typeof SaveComponent>) {
  const [currentDraft, setDraft] = useState(draft);
  const [input, setInput] = useState(manualDraftInput(draft));
  const noop = async () => {};
  const save: OrdinarySave = {
    ready: true,
    pending: false,
    error: "",
    message: "",
    recoveryError: undefined,
    retryRecovery() {},
    input,
    currentDraft: currentDraft as NonNullable<OrdinarySave["currentDraft"]>,
    readback: undefined,
    retained: null,
    otherRequest: false,
    frozen: false,
    canSave: true,
    canResolve: false,
    setInput,
    save: async () => undefined,
    replay: noop,
    readCurrent: noop,
    resolve: noop,
  };
  return (
    <Editor
      draft={draft}
      onClose={onClose}
      ordinarySave={save}
      onOrdinaryBound={setDraft}
    />
  );
}
export function OrdinarySaveRecovery() {
  return null;
}
