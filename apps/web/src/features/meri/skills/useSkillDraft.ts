"use client";
import { useState, useSyncExternalStore } from "react";
import type { SkillCatalogEntry } from "@capiro/meri-contracts/skill-catalog";
import {
  receiveSkillDraft,
  selectSkillDraft,
  skillDraftJournal,
  type SkillDraft,
} from "../../../shared/meri-conversations/skill-draft";
import {
  requireMeriTabStorage,
  type TabScope,
} from "../../../shared/meri-conversations/tab-journal";
import {
  requestedWindow,
  windowFields,
  type WindowFields,
} from "./skill-window";

type DraftState = Readonly<{
  draft?: SkillDraft;
  error?: string;
  ready: boolean;
}>;
const initial: DraftState = Object.freeze({ ready: false });

/** Subscribe after hydration. Retain one journal generation for the entire keyed scope lifetime. */
function draftStore(scope: TabScope | undefined) {
  let state = initial,
    started = false;
  let journal: ReturnType<typeof skillDraftJournal> | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: DraftState) => {
    state = value;
    listeners.forEach((notify) => notify());
  };
  const initialize = () => {
    started = true;
    if (!scope) return;
    try {
      const storage = requireMeriTabStorage();
      if (!storage) return;
      journal = skillDraftJournal(scope, storage);
      const draft = journal.read();
      publish({ ...(draft ? { draft } : {}), ready: true });
    } catch {
      publish({
        error:
          "This tab could not safely recover the skill draft. No skill was selected.",
        ready: false,
      });
    }
  };
  return {
    snapshot: () => state,
    subscribe(notify: () => void) {
      listeners.add(notify);
      if (!started) initialize();
      return () => {
        listeners.delete(notify);
      };
    },
    error(message: string) {
      publish({ ...state, error: message });
    },
    write(draft: SkillDraft) {
      if (!journal || !listeners.size || !state.ready) return;
      try {
        journal.write(draft);
        publish({ draft, ready: true });
      } catch {
        publish({
          ...state,
          error: "This tab could not keep the skill draft. Nothing was sent.",
          ready: false,
        });
      }
    },
  };
}

/** Parent key retires the store on actor, tenant, client or conversation replacement. */
export function useSkillDraft(scope: TabScope | undefined) {
  const [store] = useState(() => draftStore(scope));
  const state = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    () => initial,
  );
  const [edited, setFields] = useState<WindowFields>();
  const fields = edited ?? windowFields(state.draft?.windowRequest ?? null);
  return {
    ...state,
    fields,
    setFields,
    select(entry: SkillCatalogEntry) {
      store.write(selectSkillDraft(entry));
      setFields({});
    },
    keepWindow() {
      if (!state.draft) return;
      try {
        store.write(
          receiveSkillDraft({
            ...state.draft,
            windowRequest: requestedWindow(fields),
          }),
        );
      } catch {
        store.error(
          "Complete the requested window using the exact time zone, timestamps or fiscal revision. Nothing was sent.",
        );
      }
    },
  };
}
