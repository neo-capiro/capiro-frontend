"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  editorialConfig,
  editorialRow,
} from "../../../../../shared/capiro/operations/legiwatch-editorial";
export type EditorialRow = z.infer<typeof editorialRow>;
export type EditorialConfig = z.infer<typeof editorialConfig>;
export function useEditorialDraft(row: EditorialRow) {
  const saved = row.config;
  const [config, setConfig] = useState<EditorialConfig>({
    folderId: saved.folderId ?? "",
    ...(saved.clientId ? { clientId: saved.clientId } : {}),
    ...(saved.sessionKey ? { sessionKey: saved.sessionKey } : {}),
    template: saved.template ?? "daily_legislative_brief",
    subject: saved.subject ?? row.source.family.displayName,
    includedKinds: ["research"],
    schedule: saved.schedule ?? {
      timezone: "America/New_York",
      hour: 8,
      minute: 0,
      weekdays: [1, 2, 3, 4, 5],
      noChange: "draft",
      sourceGap: "hold",
      mode: "prepare",
    },
    recipientSelection: [],
    prepareEnabled: saved.prepareEnabled ?? false,
    sendEnabled: saved.sendEnabled ?? false,
    dictionaryScopeAccepted: saved.dictionaryScopeAccepted ?? false,
    acceptAvailableFields: saved.acceptAvailableFields ?? false,
  });
  const [changed, setChanged] = useState(false);
  const patch = (value: Partial<EditorialConfig>) => {
    setChanged(true);
    setConfig((current) => ({ ...current, ...value }));
  };
  return { config, changed, patch };
}
