"use client";
import { useState } from "react";
import {
  parseWorkspaceBlueprintDetail,
  parseWorkspaceBlueprintContentVersion,
  parseWorkspaceBlueprintDefinition,
} from "@capiro/shared/workspace-template-studio";
import { useCapiroQuery } from "@/shared/capiro/queries";
import type { ProspectDraftCreate } from "@/shared/capiro/operations/workspace-prospects";
import {
  ActionButton,
  Field,
  SelectInput,
  StatusPanel,
  Modal,
} from "@/shared/module-ui";
import { BlueprintDefinitionRead } from "../document-templates/BlueprintDefinitionRead";
import { blueprintPin } from "../document-templates/blueprint-adoption";
import {
  blueprintChoiceLabel,
  blueprintDisplayName,
} from "../document-templates/blueprint-display";
import styles from "./template-picker.module.css";

type Pin = ProspectDraftCreate["blueprintPin"];
export function ProspectTemplatePicker({
  pin,
  disabled,
  onChange,
}: {
  pin: Pin;
  disabled: boolean;
  onChange: (pin: Pin) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  return (
    <section aria-label="Proposal template selection">
      <p>
        {pin
          ? `${selectedName || "Selected published template"} · version ${pin.version}`
          : "No template selected. Create a blank manual draft or choose a published template."}
      </p>
      <ActionButton
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close template chooser" : "Choose proposal template"}
      </ActionButton>
      {pin && (
        <ActionButton disabled={disabled} onClick={() => onChange(undefined)}>
          Clear template selection
        </ActionButton>
      )}
      <Modal
        open={open && !disabled}
        onOpenChange={setOpen}
        title="Choose proposal template"
        className={styles.dialog}
        footer={
          <ActionButton onClick={() => setOpen(false)}>Cancel</ActionButton>
        }
      >
        {open && !disabled && (
          <TemplateCatalog
            onChoose={(value, name) => {
              onChange(value);
              setSelectedName(name);
              setOpen(false);
            }}
          />
        )}
      </Modal>
    </section>
  );
}

function TemplateCatalog({
  onChoose,
}: {
  onChoose: (pin: Pin, name: string) => void;
}) {
  const query = useCapiroQuery("workspace.blueprints.list", {});
  const [id, setId] = useState("");
  const listed = query.data?.some((row) => row.id === id);
  return (
    <div className={styles.catalog}>
      <p>Preview the published template before choosing it.</p>
      <details>
        <summary>About template catalogs</summary>
        <p>
          Choose a document blueprint, then review a published version below.
          The profile’s Browse templates catalog includes other Workspace
          products and is separate from this selectable catalog.
        </p>
      </details>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.length ? (
          <Field label="Proposal template" htmlFor="prospect-template">
            <SelectInput
              id="prospect-template"
              value={listed ? id : ""}
              onValueChange={setId}
              placeholder="Choose a template"
              options={query.data.map((row, ordinal) => ({
                value: row.id,
                label: blueprintChoiceLabel(row, ordinal),
              }))}
            />
          </Field>
        ) : (
          <p>No templates are available.</p>
        )}
        {listed && !query.error && !query.loading && (
          <TemplateVersions
            key={id}
            id={id}
            onChoose={(pin) =>
              onChoose(
                pin,
                blueprintDisplayName(query.data!.find((row) => row.id === id)!),
              )
            }
          />
        )}
      </StatusPanel>
    </div>
  );
}

function TemplateVersions({
  id,
  onChoose,
}: {
  id: string;
  onChoose: (pin: Pin) => void;
}) {
  const query = useCapiroQuery("workspace.blueprints.detail", {
    params: { blueprintId: id },
  });
  const parsed =
    query.data === undefined
      ? undefined
      : parseWorkspaceBlueprintDetail(query.data, { blueprintId: id });
  const detail = parsed?.ok ? parsed.value : undefined;
  const [versionId, setVersion] = useState("");
  const versions =
    detail?.versions.filter((row) => row.status === "published") ?? [];
  const selected = versions.find((row) => row.id === versionId);
  return (
    <StatusPanel
      loading={query.loading}
      error={
        query.error ??
        (parsed && !parsed.ok
          ? new Error("Template details could not be verified.")
          : undefined)
      }
      onRetry={query.reload}
    >
      {detail && (
        <>
          <h3>{blueprintDisplayName(detail)}</h3>
          <p>
            {detail.product}
            {detail.description ? ` · ${detail.description}` : ""}
          </p>
          {versions.length ? (
            <Field
              label="Published template version"
              htmlFor="prospect-template-version"
            >
              <SelectInput
                id="prospect-template-version"
                value={selected ? versionId : ""}
                onValueChange={setVersion}
                placeholder="Choose a published version"
                options={versions.map((row) => ({
                  value: row.id,
                  label: `Version ${row.version}`,
                }))}
              />
            </Field>
          ) : (
            <p>
              This template has no published version available for new
              proposals.
            </p>
          )}
          {selected && !query.error && !query.loading && (
            <TemplatePreview
              key={selected.id}
              id={id}
              versionId={selected.id}
              onChoose={onChoose}
            />
          )}
        </>
      )}
    </StatusPanel>
  );
}

function TemplatePreview({
  id,
  versionId,
  onChoose,
}: {
  id: string;
  versionId: string;
  onChoose: (pin: Pin) => void;
}) {
  const query = useCapiroQuery("workspace.blueprints.version", {
    params: { blueprintId: id, versionId },
  });
  const parsed =
    query.data === undefined
      ? undefined
      : parseWorkspaceBlueprintContentVersion(query.data, {
          blueprintId: id,
          versionId,
        });
  const version = parsed?.ok ? parsed.value : undefined;
  const definition = version
    ? parseWorkspaceBlueprintDefinition(version.definition)
    : undefined;
  const available = version?.status === "published" && definition?.ok;
  return (
    <StatusPanel
      loading={query.loading}
      error={
        query.error ??
        (parsed && (!parsed.ok || !available)
          ? new Error(
              "This published template version is unavailable. Refresh or choose another version.",
            )
          : undefined)
      }
      onRetry={query.reload}
    >
      {available && !query.error && !query.loading && (
        <>
          <p>
            Read-only preview. Creation starts empty sections and retains this
            exact template version. Generation and publication are separate
            actions.
          </p>
          <BlueprintDefinitionRead value={definition.value} />
          <ActionButton onClick={() => onChoose(blueprintPin(version))}>
            Use template version {version.version}
          </ActionButton>
        </>
      )}
    </StatusPanel>
  );
}
