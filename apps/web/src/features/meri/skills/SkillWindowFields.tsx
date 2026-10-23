"use client";
import { Input } from "@capiro/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@capiro/ui/select";
import type { SkillWindow } from "../../../shared/meri-conversations/skill-draft";
import { windowLabels, type WindowFields } from "./skill-window";
import styles from "./skills.module.css";

function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: readonly (readonly [string, string])[];
  onChange(value: string): void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {choices.map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

type EditorProps = {
  fields: WindowFields;
  onChange(value: WindowFields): void;
};
function TextField({
  name,
  label,
  placeholder,
  fields,
  onChange,
}: EditorProps & { name: string; label: string; placeholder?: string }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <Input
        value={fields[name] ?? ""}
        onChange={(event) =>
          onChange({ ...fields, [name]: event.target.value })
        }
        placeholder={placeholder}
      />
    </label>
  );
}
export function SkillWindowFields({
  bases,
  fields,
  onChange,
}: EditorProps & { bases: readonly string[] }) {
  return (
    <fieldset className={styles.windows}>
      <legend>Requested time window</legend>
      <Choice
        label="Window type"
        value={fields.basis ?? ""}
        choices={bases.map((value) => [
          value,
          windowLabels[value as SkillWindow["basis"]] ?? value,
        ])}
        onChange={(value) => onChange({ basis: value })}
      />
      {fields.basis && fields.basis !== "unbounded" && (
        <TextField
          name="timezone"
          label="Time zone"
          placeholder="America/New_York"
          fields={fields}
          onChange={onChange}
        />
      )}
      <CalendarFields fields={fields} onChange={onChange} />
      <TimestampFields fields={fields} onChange={onChange} />
      {fields.basis === "fiscal-year" && (
        <FiscalFields fields={fields} onChange={onChange} />
      )}
    </fieldset>
  );
}
function CalendarFields({ fields, onChange }: EditorProps) {
  if (!fields.basis?.startsWith("calendar-")) return null;
  return (
    <>
      <Choice
        label="Period"
        value={fields.offset ?? ""}
        choices={[
          ["0", "Current period"],
          ["-1", "Previous period"],
        ]}
        onChange={(value) => onChange({ ...fields, offset: value })}
      />
      {fields.basis === "calendar-week" && (
        <Choice
          label="Week starts on"
          value={fields.weekStartsOn ?? ""}
          choices={[
            ["monday", "Monday"],
            ["sunday", "Sunday"],
          ]}
          onChange={(value) => onChange({ ...fields, weekStartsOn: value })}
        />
      )}
    </>
  );
}
function TimestampFields(props: EditorProps) {
  const { basis } = props.fields;
  if (basis === "relative-duration")
    return (
      <>
        <TextField {...props} name="days" label="Number of days" />
        <TextField
          {...props}
          name="anchorAt"
          label="Anchor timestamp"
          placeholder="2026-10-23T12:00:00Z"
        />
      </>
    );
  if (basis === "explicit")
    return (
      <>
        <TextField
          {...props}
          name="startInclusive"
          label="Start timestamp (inclusive)"
          placeholder="2026-10-01T00:00:00Z"
        />
        <TextField
          {...props}
          name="endExclusive"
          label="End timestamp (exclusive)"
          placeholder="2026-11-01T00:00:00Z"
        />
      </>
    );
  return null;
}
function FiscalFields(props: EditorProps) {
  return (
    <>
      <TextField {...props} name="year" label="Fiscal year" />
      <TextField
        {...props}
        name="calendarId"
        label="Canonical fiscal calendar ID"
      />
      <Choice
        label="Budget stage"
        value={props.fields.stage ?? ""}
        choices={[
          "requested",
          "authorized",
          "appropriated",
          "obligated",
          "actual",
          "outlay",
        ].map((value) => [value, value])}
        onChange={(value) => props.onChange({ ...props.fields, stage: value })}
      />
      <TextField
        {...props}
        name="revisionId"
        label="Exact fiscal revision ID"
      />
    </>
  );
}
