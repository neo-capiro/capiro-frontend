import type { OfficeSnapshot } from "@capiro/meri-contracts/office-application";

function wait(signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 250);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** CODE may acknowledge before WOPI commits. Only current Core reads confirm
 * Save; no Save request is repeated and no read failure is retried. */
export async function confirmOfficeSave(options: {
  before: OfficeSnapshot;
  read: (signal: AbortSignal) => Promise<OfficeSnapshot>;
  modified: () => boolean;
  signal: AbortSignal;
}): Promise<OfficeSnapshot> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), 5_000);
  const signal = AbortSignal.any([options.signal, deadline.signal]);
  try {
    for (;;) {
      signal.throwIfAborted();
      const saved = await options.read(signal);
      signal.throwIfAborted();
      if (
        saved.editor.editorId !== options.before.editor.editorId ||
        saved.editor.epoch !== options.before.editor.epoch ||
        saved.draft.sequence < options.before.draft.sequence
      )
        throw new Error("Editor or saved revision changed");
      if (
        saved.draft.sequence > 0 &&
        saved.draft.sha256 &&
        (!options.modified() ||
          saved.draft.sequence > options.before.draft.sequence)
      )
        return saved;
      await wait(signal);
    }
  } finally {
    clearTimeout(timer);
  }
}
