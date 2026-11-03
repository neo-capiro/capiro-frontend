"use client";
import { useCallback, useState } from "react";
import type { ConversationSkillSelection } from "../../../shared/meri-conversations/query-journal";
import { rememberedProcedureLabel } from "./procedure-presentation";

/**
 * Presentation only, never part of the draft, the journal or the request: the name the current
 * catalog reported for one exact procedure selector.
 *
 * It is remembered against the draft owner that was current when the picker reported it, so a scope
 * or lifetime change drops it, and it is resolved against the same effective selection the picker and
 * composer show — including a saved accepted request that the session composes when a fresh draft has
 * no selection of its own.
 */
export function useProcedureName<Owner extends object>(
  owner: Owner,
  accessLost: boolean,
  selection: ConversationSkillSelection,
) {
  const [reported, setReported] = useState<{
    owner: Owner;
    identity: string;
    text: string;
  }>();
  const rememberProcedureName = useCallback(
    (identity: string, text: string) => {
      if (accessLost) return;
      setReported((current) =>
        current?.owner === owner &&
        current.identity === identity &&
        current.text === text
          ? current
          : { owner, identity, text },
      );
    },
    [owner, accessLost],
  );
  return {
    procedureLabel: accessLost
      ? undefined
      : rememberedProcedureLabel(selection, owner, reported),
    rememberProcedureName,
  };
}
