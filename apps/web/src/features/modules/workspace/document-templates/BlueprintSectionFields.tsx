"use client";
import Image from "next/image";
import { useId } from "react";
import type { BlueprintSection } from "@capiro/shared/workspace-template-studio";
import {
  ActionButton,
  Field,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "./studio-authoring.module.css";

export function StudioText({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      {multiline ? (
        <TextArea
          id={id}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <TextInput
          id={id}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}
export function StudioNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <TextInput
        id={id}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </Field>
  );
}
export function StudioToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      className={styles.toggle}
      onClick={() => onChange(!value)}
    >
      <Image
        src={`/figma/document-blueprints/switch-${value ? "on" : "off"}.svg`}
        alt=""
        width={34}
        height={20}
        unoptimized
      />
      {label}
    </button>
  );
}
export function StudioLines({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <StudioText
      label={`${label} (one per line)`}
      value={value.join("\n")}
      multiline
      onChange={(text) => onChange(text === "" ? [] : text.split("\n"))}
    />
  );
}

function SectionFields({
  section,
  onChange,
}: {
  section: BlueprintSection;
  onChange: (value: BlueprintSection) => void;
}) {
  const set = <K extends keyof BlueprintSection>(
    key: K,
    value: BlueprintSection[K],
  ) => onChange({ ...section, [key]: value });
  return (
    <div className={styles.fields}>
      <StudioText
        label="Section identifier"
        value={section.id}
        onChange={(value) => set("id", value)}
      />
      <StudioText
        label="Section title"
        value={section.title}
        onChange={(value) => set("title", value)}
      />
      <StudioText
        label="Purpose"
        value={section.purpose}
        onChange={(value) => set("purpose", value)}
        multiline
      />
      <StudioText
        label="Authoring instructions"
        value={section.instructions}
        onChange={(value) => set("instructions", value)}
        multiline
      />
      <div className={styles.fieldRow}>
        <StudioNumber
          label="Minimum target words"
          value={section.targetWords.min}
          onChange={(min) =>
            set("targetWords", { ...section.targetWords, min })
          }
        />
        <StudioNumber
          label="Maximum target words"
          value={section.targetWords.max}
          onChange={(max) =>
            set("targetWords", { ...section.targetWords, max })
          }
        />
      </div>
      <div className={styles.actions}>
        <StudioToggle
          label="Removable in document"
          value={section.removable}
          onChange={(value) => set("removable", value)}
        />
        <StudioToggle
          label="Reorderable in document"
          value={section.reorderable}
          onChange={(value) => set("reorderable", value)}
        />
        <StudioToggle
          label="Locked by default"
          value={section.lockedByDefault}
          onChange={(value) => set("lockedByDefault", value)}
        />
      </div>
      <StudioLines
        label="Section evidence rules"
        value={section.evidenceRules}
        onChange={(value) => set("evidenceRules", value)}
      />
    </div>
  );
}

export function BlueprintSectionFields({
  sections,
  onChange,
}: {
  sections: BlueprintSection[];
  onChange: (value: BlueprintSection[]) => void;
}) {
  const update = (index: number, value: BlueprintSection) =>
    onChange(sections.map((row, at) => (at === index ? value : row)));
  const move = (index: number, offset: number) => {
    const next = [...sections];
    [next[index], next[index + offset]] = [next[index + offset]!, next[index]!];
    onChange(next);
  };
  return (
    <section
      className={styles.sectionList}
      data-design-node="1064:261224"
      aria-label="Blueprint sections"
    >
      <header>
        <h3>Blueprint sections</h3>
        <ActionButton
          onClick={() =>
            onChange([
              ...sections,
              {
                id: `section-${crypto.randomUUID()}`,
                title: "New section",
                purpose: "",
                instructions: "",
                required: true,
                removable: false,
                reorderable: true,
                lockedByDefault: false,
                targetWords: { min: 0, max: 500 },
                evidenceRules: [],
              },
            ])
          }
        >
          + Add section
        </ActionButton>
      </header>
      {sections.map((section, index) => (
        <div className={styles.section} key={index}>
          <div className={styles.sectionHeading}>
            <strong>{section.title || "Untitled section"}</strong>
            <StudioToggle
              label={`Required: ${section.title || `section ${index + 1}`}`}
              value={section.required}
              onChange={(required) => update(index, { ...section, required })}
            />
          </div>
          <details>
            <summary>Edit section {index + 1}</summary>
            <SectionFields
              section={section}
              onChange={(value) => update(index, value)}
            />
          </details>
          <div className={styles.actions}>
            <ActionButton
              aria-label={`Move section ${index + 1} up`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              Move up
            </ActionButton>
            <ActionButton
              aria-label={`Move section ${index + 1} down`}
              disabled={index === sections.length - 1}
              onClick={() => move(index, 1)}
            >
              Move down
            </ActionButton>
            <ActionButton
              aria-label={`Remove section ${index + 1}`}
              onClick={() => onChange(sections.filter((_, at) => at !== index))}
            >
              Remove section
            </ActionButton>
          </div>
        </div>
      ))}
      {!sections.length && (
        <p className={styles.empty}>
          Add the sections this blueprint requires.
        </p>
      )}
    </section>
  );
}
