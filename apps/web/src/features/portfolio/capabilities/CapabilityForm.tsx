"use client";
import { useState } from "react";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { TokenInput } from "@/shared/portfolio/ui/TokenInput";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Capability, CapabilityInput } from "./contracts";
import {
  CapabilityDetails,
  CapabilityIdentityFields,
  CapabilityReadiness,
} from "./CapabilityFields";
import styles from "./capability-editor.module.css";

export function CapabilityForm({
  capability,
  choices,
  disabled,
  saving,
  pending,
  error,
  onSave,
  onRemove,
  onCancel,
}: {
  capability?: Capability;
  choices?: readonly Capability[];
  disabled: boolean;
  saving: boolean;
  pending: boolean;
  error?: Error | null;
  onSave: (body: CapabilityInput) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [tags, setTags] = useState(capability?.tags ?? []);
  const [pes, setPes] = useState(
    capability?.peNumbers.length
      ? capability.peNumbers
      : capability?.peNumber
        ? [capability.peNumber]
        : [],
  );
  const [keywords, setKeywords] = useState(capability?.keywords ?? []);
  const [trl, setTrl] = useState(capability?.trl ?? null);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSave({
          name: String(form.get("name")).trim(),
          type: String(form.get("type")),
          sector: String(form.get("sector")) || null,
          description: String(form.get("description")),
          tags,
          issueCodes: capability?.issueCodes ?? [],
          trl,
          mrl: form.get("mrl") ? Number(form.get("mrl")) : null,
          peNumbers: pes,
          keywords,
          notes: String(form.get("notes") ?? ""),
        });
      }}
    >
      <fieldset className={styles.fields} disabled={disabled}>
        {capability ? (
          <div className={styles.badges}>
            <span className={styles.typeBadge}>{capability.type}</span>
            {capability.sector && (
              <span className={styles.sectorBadge}>{capability.sector}</span>
            )}
            <button
              type="button"
              className={styles.remove}
              aria-label="Remove capability"
              onClick={onRemove}
            >
              Delete
            </button>
          </div>
        ) : (
          <>
            <p className={styles.caption}>
              Name it and save. PE numbers, match keywords, and documents open
              next, on the saved record.
            </p>
            <CapabilityIdentityFields choices={choices} />
            <p className={styles.caption}>
              Drives downstream agency and policy matching.
            </p>
          </>
        )}
        {capability && <CapabilityReadiness trl={trl} onChange={setTrl} />}
        <TokenInput
          label="Tags"
          layout="inline"
          value={tags}
          onChange={setTags}
          placeholder="Pick or add tags"
        />
        {!capability && <CapabilityReadiness trl={trl} onChange={setTrl} />}
        {capability && (
          <>
            <TokenInput
              label="PE numbers"
              layout="inline"
              value={pes}
              onChange={setPes}
              placeholder="e.g. 0604201A, add and press Enter"
            />
            <TokenInput
              label="Match keywords"
              layout="inline"
              value={keywords}
              onChange={setKeywords}
              placeholder="Keywords that match PE text"
            />
          </>
        )}
        <div className={styles.saveError}>
          <QueryState error={error} />
        </div>
        <TextareaField
          label="Description"
          name="description"
          defaultValue={capability?.description ?? ""}
          maxLength={20000}
          placeholder="Describe this capability…"
        />
        {capability && (
          <TextareaField
            label="Notes"
            name="notes"
            defaultValue={capability.notes ?? ""}
            maxLength={20000}
            placeholder="Internal notes…"
          />
        )}
        <CapabilityDetails capability={capability} />
      </fieldset>
      <footer className={styles.footer}>
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="button primary" disabled={disabled}>
          {saving
            ? "Saving…"
            : capability
              ? "Save capability"
              : "Add capability"}
        </button>
      </footer>
    </form>
  );
}
