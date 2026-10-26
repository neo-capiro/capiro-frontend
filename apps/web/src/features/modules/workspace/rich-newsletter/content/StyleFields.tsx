"use client";
import { useState } from "react";
import {
  NEWSLETTER_SYSTEM_FONTS,
  type NewsletterBlock,
  type NewsletterStyle,
} from "@capiro/shared/newsletter";
import { Choice, Entry, NumberEntry, Toggle } from "./Fields";
import styles from "./content.module.css";

export function StyleFields({
  value,
  change,
  typography = true,
}: {
  value: NewsletterStyle;
  change: (value: NewsletterStyle) => void;
  typography?: boolean;
}) {
  const set = <K extends keyof NewsletterStyle>(
    key: K,
    next: NewsletterStyle[K],
  ) => {
    const result = { ...value };
    if (next === undefined || next === "") delete result[key];
    else result[key] = next;
    change(result);
  };
  return (
    <div className={styles.stack}>
      {typography && (
        <>
          <Choice
            label="Font"
            value={value.fontFamily ?? ""}
            values={[
              ["", "Inherit"],
              ...[
                ...new Set([
                  ...NEWSLETTER_SYSTEM_FONTS,
                  ...(value.fontFamily ? [value.fontFamily] : []),
                ]),
              ],
            ]}
            change={(font) => set("fontFamily", font)}
          />
          <NumberEntry
            label="Font size"
            value={value.fontSize}
            change={(n) => set("fontSize", n)}
          />
          <NumberEntry
            label="Letter spacing"
            value={value.letterSpacing}
            step={0.1}
            change={(n) => set("letterSpacing", n)}
          />
          <Entry
            label="Text color"
            value={value.color ?? ""}
            change={(color) => set("color", color)}
            maxLength={20}
          />
          <div className={styles.formatting} aria-label="Formatting">
            {(["bold", "italic", "underline", "strike"] as const).map((key) => (
              <Toggle
                key={key}
                label={
                  {
                    bold: "Bold",
                    italic: "Italic",
                    underline: "Underline",
                    strike: "Strikethrough",
                  }[key]
                }
                checked={Boolean(value[key])}
                change={(checked) => set(key, checked)}
              />
            ))}
          </div>
          <NumberEntry
            label="Line height"
            value={value.lineHeight}
            min={0.5}
            max={4}
            step={0.1}
            change={(n) => set("lineHeight", n)}
          />
          <NumberEntry
            label="Paragraph spacing"
            value={value.paragraphSpacing}
            change={(n) => set("paragraphSpacing", n)}
          />
          <Choice
            label="Text direction"
            value={value.direction ?? ""}
            values={[
              ["", "Inherit"],
              ["ltr", "Left to right"],
              ["rtl", "Right to left"],
            ]}
            change={(direction) =>
              set("direction", direction as NewsletterStyle["direction"])
            }
          />
        </>
      )}
      <Choice
        label="Alignment"
        value={value.align ?? ""}
        values={[["", "Inherit"], "left", "center", "right"]}
        change={(align) => set("align", align as NewsletterStyle["align"])}
      />
      <Entry
        label="Background color"
        value={value.background ?? ""}
        change={(color) => set("background", color)}
        maxLength={20}
      />
      <Choice
        label="Border style"
        value={value.borderStyle ?? ""}
        values={[
          ["", "Inherit"],
          "none",
          "solid",
          "dashed",
          "dotted",
          "double",
          "inset",
          "outset",
          "groove",
          "ridge",
        ]}
        change={(border) =>
          set("borderStyle", border as NewsletterStyle["borderStyle"])
        }
      />
      <Entry
        label="Border color"
        value={value.borderColor ?? ""}
        change={(color) => set("borderColor", color)}
        maxLength={20}
      />
      {(
        [
          ["borderWidth", "Border width"],
          ["radius", "Rounded corners"],
          ["paddingTop", "Padding top"],
          ["paddingBottom", "Padding bottom"],
          ["paddingLeft", "Padding left"],
          ["paddingRight", "Padding right"],
          ["width", "Width percent"],
          ["height", "Height"],
        ] as const
      ).map(([key, label]) => (
        <NumberEntry
          key={key}
          label={label}
          value={value[key]}
          max={key === "width" ? 100 : 1000}
          change={(n) => set(key, n)}
        />
      ))}
    </div>
  );
}

export function BlockStyles({
  block,
  update,
}: {
  block: NewsletterBlock;
  update: (value: Partial<NewsletterBlock>) => void;
}) {
  const [mobile, setMobile] = useState(false);
  const key = mobile && !block.linkedStyles ? "mobileStyle" : "style";
  return (
    <>
      <Toggle
        label="Link Desktop and Mobile styles"
        checked={block.linkedStyles}
        change={(linkedStyles) => update({ linkedStyles })}
      />
      <Choice
        label="Style device"
        value={mobile ? "Mobile" : "Desktop"}
        values={["Desktop", "Mobile"]}
        change={(next) => setMobile(next === "Mobile")}
      />
      {mobile && block.linkedStyles && (
        <p>
          Mobile uses desktop block styles while linked. Independent mobile
          values are retained.
        </p>
      )}
      <StyleFields
        value={block[key]}
        change={(value) => update({ [key]: value })}
      />
    </>
  );
}
