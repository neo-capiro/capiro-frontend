import { useId } from "react";
import { Field, SelectInput, TextInput } from "@/shared/module-ui";
import {
  NEWSLETTER_FONT_CATALOG,
  NEWSLETTER_SYSTEM_FONTS,
  type NewsletterBrandKit,
} from "@capiro/shared/newsletter";
import styles from "./brand.module.css";
export function BrandText({
  label,
  value,
  change,
  max = 200,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  max?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <TextInput
        id={id}
        value={value}
        maxLength={max}
        onChange={(event) => change(event.target.value)}
      />
    </Field>
  );
}
export function BrandFlag({
  label,
  checked,
  change,
}: {
  label: string;
  checked: boolean;
  change: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <label className={styles.flag} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => change(event.target.checked)}
      />
    </label>
  );
}
export function BrandFont({
  label,
  value,
  kit,
  change,
}: {
  label: string;
  value: string;
  kit: NewsletterBrandKit;
  change: (value: string) => void;
}) {
  const id = useId();
  const options = [
    ...new Set([
      ...NEWSLETTER_SYSTEM_FONTS,
      ...NEWSLETTER_FONT_CATALOG.map((font) => font.family),
      ...kit.fonts.uploaded.map((font) => font.family),
      value,
    ]),
  ].map((family) => ({
    value: family,
    label:
      kit.fonts.uploaded.find((font) => font.family === family)?.name || family,
  }));
  return (
    <Field label={label} htmlFor={id}>
      <SelectInput
        id={id}
        value={value}
        options={options}
        onValueChange={change}
      />
    </Field>
  );
}
