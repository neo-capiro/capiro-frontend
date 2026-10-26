"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { useRetainedIntent } from "../../../../shared/session/recovery/useRetainedIntent";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
} from "../../../../shared/session/recovery/journal";
import {
  templateRecovery,
  templateRecoveryScope,
  verifyTemplateActor,
  readTemplateIntent,
  resultSchema,
  type TemplateActor,
  type TemplateCommand,
  type TemplateIntent,
} from "./template-recovery";

function useCommands(actor: TemplateActor) {
  const api = useCapiro();
  const scope = templateRecoveryScope(actor);
  const [authorized, setAuthorized] = useState("");
  const retained = useRetainedIntent(
    scope,
    templateRecovery,
    async (signal, guard) => {
      await verifyTemplateActor(api, actor, signal, guard);
      const original = await readRecovery(scope, templateRecovery, guard);
      if (original) await readTemplateIntent(api, original, signal, guard);
      guard();
      setAuthorized(JSON.stringify(original));
    },
  );
  const ready =
    retained.ready && authorized === JSON.stringify(retained.record);
  const record = ready ? retained.record : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inspection, setInspection] = useState("");
  const working = useRef(false);
  function install(next: TemplateIntent) {
    retained.guard();
    setAuthorized(JSON.stringify(next));
    retained.install(next);
  }
  async function saveRecord(next: TemplateIntent) {
    await updateRecovery(
      scope,
      next.requestId,
      next,
      templateRecovery,
      retained.guard,
    );
    install(next);
  }
  async function dispatch(original: TemplateIntent) {
    const c = original.command;
    const options = { signal: retained.signal() };
    let result: unknown;
    if (c.operation === "save-draft") {
      const metadata = await api.request(
        "workspace.template.metadata",
        c.input.metadata,
        options,
      );
      retained.guard();
      if (metadata.id !== c.input.metadata.params.templateId)
        throw new Error(
          "The metadata acknowledgment belongs to another template.",
        );
      original = { ...original, metadataAcknowledged: metadata };
      await saveRecord(original);
      result = await api.request(
        "workspace.template.draft",
        c.input.draft,
        options,
      );
    } else {
      result = await api.request(c.operation, c.input, options);
    }
    retained.guard();
    const completed = templateRecovery.schema.parse({
      ...original,
      result: resultSchema(c).parse(result),
    });
    await readTemplateIntent(api, completed, retained.signal(), retained.guard);
    await saveRecord(completed);
    return completed;
  }
  async function perform(command?: TemplateCommand) {
    if (working.current || !ready || record?.result !== undefined) return;
    if (record && command) return;
    if (
      record &&
      !["workspace.template.use", "workspace.template.publish"].includes(
        record.command.operation,
      )
    )
      return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      await retained.verify();
      const original = templateRecovery.schema.parse(
        record ?? {
          requestId:
            command?.operation === "workspace.template.use"
              ? command.input.body.requestKey
              : crypto.randomUUID(),
          command: structuredClone(command),
        },
      );
      const reserved = await reserveRecovery(
        scope,
        original.requestId,
        original,
        templateRecovery,
        retained.guard,
      );
      await readTemplateIntent(
        api,
        reserved,
        retained.signal(),
        retained.guard,
      );
      install(reserved);
      if (JSON.stringify(reserved) !== JSON.stringify(original))
        throw new Error(
          "Another view retained a command. Review that original command first.",
        );
      return await dispatch(original);
    } catch (cause) {
      try {
        retained.guard();
      } catch {
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "The result is unconfirmed. The original inputs remain saved.",
      );
      // Rechecking access also hides privileged retained content on revocation.
      retained.retry();
      return;
    } finally {
      working.current = false;
      try {
        retained.guard();
        setBusy(false);
      } catch {
        /* disposed view */
      }
    }
  }
  async function inspect() {
    if (working.current || !record) return;
    working.current = true;
    setBusy(true);
    try {
      await retained.verify();
      const detail = await readTemplateIntent(
        api,
        record,
        retained.signal(),
        retained.guard,
      );
      setInspection(
        detail
          ? `Current template: ${detail.template.name}. Current draft: ${detail.versions.find((v) => v.id === detail.template.currentDraftVersionId)?.versionNumber ?? "none"}. The original command is still unconfirmed.`
          : "Current access checked. No exact completed receipt is available for this action; it remains held.",
      );
    } catch (cause) {
      retained.block(cause);
    } finally {
      working.current = false;
      try {
        retained.guard();
        setBusy(false);
      } catch {
        /* disposed */
      }
    }
  }
  async function acknowledge() {
    if (working.current || !record || record.result === undefined) return false;
    working.current = true;
    setBusy(true);
    try {
      await retained.verify();
      await readTemplateIntent(api, record, retained.signal(), retained.guard);
      await acknowledgeRecovery(scope, record.requestId, retained.guard);
      setAuthorized("null");
      retained.install(null);
      setError("");
      setInspection("");
      return true;
    } catch (cause) {
      retained.block(cause);
      return false;
    } finally {
      working.current = false;
      try {
        retained.guard();
        setBusy(false);
      } catch {
        /* disposed */
      }
    }
  }
  return {
    ready,
    record,
    busy,
    error: retained.error ?? error,
    inspection,
    blocked: !ready || busy || Boolean(record),
    submit: perform,
    recover: () => perform(),
    inspect,
    acknowledge,
    reload: retained.retry,
  };
}
const Context = createContext<ReturnType<typeof useCommands> | null>(null);
export function TemplateCommandsProvider({
  actor,
  children,
}: {
  actor: TemplateActor;
  children: ReactNode;
}) {
  const commands = useCommands(actor);
  return <Context.Provider value={commands}>{children}</Context.Provider>;
}
export function useTemplateCommands() {
  const value = useContext(Context);
  if (!value) throw new Error("Template command owner is required.");
  return value;
}
