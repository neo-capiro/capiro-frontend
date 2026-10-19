"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  monitorConfig,
  newsMonitor,
} from "../../../../../shared/capiro/operations/legiwatch-evidence-schemas";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import type { EvidenceScope } from "./EvidenceActions";

export type NewsMonitor = z.infer<typeof newsMonitor>;
export type MonitorConfig = z.infer<typeof monitorConfig>;
export function useNewsMonitor(
  monitor: NewsMonitor,
  scope: EvidenceScope,
  onSaved: () => void,
) {
  const [config, setConfig] = useState<MonitorConfig>({
    ...(monitor.config.folderId ? { folderId: monitor.config.folderId } : {}),
    ...(monitor.config.clientId ? { clientId: monitor.config.clientId } : {}),
    ...(monitor.config.sessionKey
      ? { sessionKey: monitor.config.sessionKey }
      : {}),
    ...(scope.folderId ? scope : {}),
    name: monitor.config.name ?? "",
    query: monitor.config.query ?? monitor.source?.raw ?? "",
    provider: monitor.config.provider ?? "newscatcher",
    fields: monitor.config.fields ?? "available_text",
    sources: monitor.config.sources ?? [],
    scopeAccepted: false,
  });
  const [state, setState] = useState<"active" | "paused" | "excluded">(
    monitor.state === "active" || monitor.state === "excluded"
      ? monitor.state
      : "paused",
  );
  const save = useCapiroMutation("legiwatch.evidence.monitor.configure"),
    scan = useCapiroMutation("legiwatch.evidence.monitor.scan");
  const update = (patch: Partial<MonitorConfig>) =>
    setConfig((current) => ({
      ...current,
      ...patch,
      scopeAccepted: patch.scopeAccepted ?? false,
    }));
  const submit = async () => {
    try {
      await save.run({
        params: { id: monitor.id },
        body: { expectedVersion: monitor.version, state, config },
      });
      onSaved();
    } catch {
      /* Preserve edits for review or retry. */
    }
  };
  const runScan = async () => {
    try {
      await scan.run({ params: { id: monitor.id } });
      onSaved();
    } catch {
      /* Preserve retained monitor state. */
    }
  };
  return { config, state, setState, update, save, scan, submit, runScan };
}
