"use client";
import { useLayoutEffect, useMemo, useState } from "react";
import {
  parseWorkspaceBlueprintVersion,
  type WorkspaceBlueprintDetail,
  type WorkspaceBlueprintVersionMetadata,
} from "@capiro/shared/workspace-template-studio";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import { createRequestLifetime } from "../../../../shared/session/request-lifetime";
import { useSelectedClient } from "../../../../shared/session/SelectedClient";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../../shared/module-ui";
import {
  adoptedBlueprint,
  blueprintPin,
  samePublishedVersion,
} from "./blueprint-adoption";
import styles from "./document-templates.module.css";

type Adoption = {
  open: boolean;
  selection?: { name: string; version: WorkspaceBlueprintVersionMetadata };
  phase:
    | "editing"
    | "checking"
    | "creating"
    | "refused"
    | "unknown"
    | "confirmed";
};
const empty: Adoption = { open: false, phase: "editing" };

function adoptionRequests(
  api: ReturnType<typeof useCapiro>,
  clientId?: string,
) {
  let busy = false;
  let attempted = false;
  return {
    ...createRequestLifetime(),
    api,
    clientId,
    busy: () => busy,
    attempted: () => attempted,
    start() {
      if (busy || attempted) return false;
      busy = true;
      return true;
    },
    dispatched() {
      attempted = true;
    },
    end() {
      busy = false;
    },
  };
}

/** A mounted create interaction; existing transport owns the one POST. Unknown
 * outcomes remain fenced while this catalog is mounted, including close/refresh. */
export function useBlueprintAdoption(
  clientId: string | undefined,
  onCreated: (id: string) => void,
) {
  const api = useCapiro();
  const create = useCapiroMutation("workspace.draft.create");
  const scope = useMemo(() => adoptionRequests(api, clientId), [api, clientId]);
  useLayoutEffect(() => scope.mount(), [scope]);
  const [stored, setStored] = useState({ scope, view: empty });
  const view = stored.scope === scope ? stored.view : empty;
  if (stored.scope !== scope) setStored({ scope, view: empty });
  const publish = (patch: Partial<Adoption>) => {
    if (!scope.signal().aborted)
      setStored((previous) => ({
        scope,
        view: {
          ...(previous.scope === scope ? previous.view : empty),
          ...patch,
        },
      }));
  };
  return {
    ...view,
    clientId,
    begin(
      blueprint: WorkspaceBlueprintDetail,
      version: WorkspaceBlueprintVersionMetadata,
    ) {
      if (scope.busy() || version.status !== "published") return;
      if (scope.attempted()) {
        publish({ open: true });
        return;
      }
      publish({
        open: true,
        phase: "editing",
        selection: { name: blueprint.name, version },
      });
    },
    close() {
      if (!scope.busy()) publish({ open: false });
    },
    async submit(title: string) {
      const selection = view.selection;
      if (
        scope.busy() ||
        scope.attempted() ||
        !selection ||
        view.phase !== "editing" ||
        !title.trim() ||
        title.trim().length > 500
      )
        return;
      if (!scope.start()) return;
      const signal = scope.signal();
      let dispatched = false;
      publish({ phase: "checking" });
      try {
        const expected = selection.version;
        const params = {
          blueprintId: expected.blueprintId,
          versionId: expected.id,
        };
        const raw = await api.request(
          "workspace.blueprints.version",
          { params },
          { signal },
        );
        const current = parseWorkspaceBlueprintVersion(raw, params);
        if (!current.ok || !samePublishedVersion(expected, current.value))
          throw new Error("Version changed");
        if (signal.aborted) return;
        scope.dispatched();
        dispatched = true;
        publish({ phase: "creating" });
        // Product defaults are not template content. This deliberately creates
        // an ordinary blank document with the explicitly selected immutable pin.
        const created = await create.run({
          body: {
            docTitle: title.trim(),
            clientId: clientId ?? null,
            blueprintPin: blueprintPin(expected),
          },
        });
        if (signal.aborted) return;
        if (!adoptedBlueprint(created, expected, clientId ?? null))
          throw new Error("Unconfirmed pin");
        const saved = await api.request(
          "workspace.draft",
          { params: { id: created.id } },
          { signal },
        );
        if (signal.aborted) return;
        if (
          saved.id !== created.id ||
          !adoptedBlueprint(saved, expected, clientId ?? null)
        )
          throw new Error("Unconfirmed saved pin");
        publish({ phase: "confirmed", open: false });
        onCreated(saved.id);
      } catch {
        if (!signal.aborted)
          publish({ phase: dispatched ? "unknown" : "refused" });
      } finally {
        scope.end();
      }
    },
  };
}
type AdoptionOwner = ReturnType<typeof useBlueprintAdoption>;

function AdoptionForm({ adoption }: { adoption: AdoptionOwner }) {
  const [title, setTitle] = useState(adoption.selection!.name);
  const selectedClient = useSelectedClient();
  const scopeName =
    selectedClient.state === "authorized-client" &&
    selectedClient.requestedId === adoption.clientId
      ? selectedClient.client.name
      : adoption.clientId
        ? "Selected client"
        : "General";
  const busy = adoption.phase === "checking" || adoption.phase === "creating";
  return (
    <form
      className={styles.adoptionForm}
      onSubmit={(event) => {
        event.preventDefault();
        void adoption.submit(title);
      }}
    >
      <p>
        {adoption.selection!.name} · Version{" "}
        {adoption.selection!.version.version}
      </p>
      <p>
        Create a blank document in {scopeName}, pinned to this version. Content
        and themes are not copied.
      </p>
      <Field label="Document title" htmlFor="blueprint-document-title">
        <TextInput
          id="blueprint-document-title"
          value={title}
          maxLength={500}
          required
          disabled={adoption.phase !== "editing"}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {busy && (
        <p role="status">
          {adoption.phase === "checking"
            ? "Checking the selected version…"
            : "Creating and checking the saved document…"}
        </p>
      )}
      {adoption.phase === "refused" && (
        <p role="alert">
          This version could not be verified for creation. Close this dialog and
          refresh the blueprint before choosing a published version.
        </p>
      )}
      <ActionButton
        primary
        type="submit"
        disabled={adoption.phase !== "editing" || !title.trim()}
      >
        Create document
      </ActionButton>
    </form>
  );
}

export function BlueprintAdoption({
  adoption,
  onDocuments,
}: {
  adoption: AdoptionOwner;
  onDocuments: () => void;
}) {
  const busy = adoption.phase === "checking" || adoption.phase === "creating";
  return (
    <Modal
      open={adoption.open}
      onOpenChange={(open) => {
        if (!open) adoption.close();
      }}
      title="Create from blueprint"
      description="Use the explicitly selected published version."
      className={styles.dialog}
      closeDisabled={busy}
      footer={
        <ActionButton disabled={busy} onClick={adoption.close}>
          Close
        </ActionButton>
      }
    >
      {adoption.phase === "unknown" ? (
        <div className={styles.adoptionForm} role="alert">
          <h3>Creation could not be confirmed</h3>
          <p>
            Check Documents before creating another. This action will not be
            retried.
          </p>
          <ActionButton onClick={onDocuments}>Check Documents</ActionButton>
        </div>
      ) : (
        adoption.selection && (
          <AdoptionForm
            key={`${adoption.selection.version.id}:${adoption.open}`}
            adoption={adoption}
          />
        )
      )}
    </Modal>
  );
}
