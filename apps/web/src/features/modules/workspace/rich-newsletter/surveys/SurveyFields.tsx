import { useId } from "react";
import { Field, SelectInput, TextArea, TextInput } from "@/shared/module-ui";

export function SurveyText({
  label,
  value,
  change,
  max,
  multiline = false,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  max: number;
  multiline?: boolean;
}) {
  const id = useId();
  const props = {
    id,
    value,
    maxLength: max,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => change(event.target.value),
  };
  return (
    <Field label={label} htmlFor={id}>
      {multiline ? <TextArea {...props} rows={2} /> : <TextInput {...props} />}
    </Field>
  );
}
export function SurveyChoice({
  label,
  value,
  change,
  options,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <SelectInput
        id={id}
        value={value}
        onValueChange={change}
        options={options.map(([value, label]) => ({ value, label }))}
      />
    </Field>
  );
}
export function SurveyFlag({
  label,
  value,
  change,
}: {
  label: string;
  value: boolean;
  change: (value: boolean) => void;
}) {
  return (
    <SurveyChoice
      label={label}
      value={value ? "yes" : "no"}
      change={(next) => change(next === "yes")}
      options={[
        ["no", "No"],
        ["yes", "Yes"],
      ]}
    />
  );
}
