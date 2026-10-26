"use client";
import { useState } from "react";
import type {
  NewsletterDesign,
  NewsletterSection,
  NewsletterStyle,
} from "@capiro/shared/newsletter";
import { Choice, Entry, NumberEntry, Toggle } from "./Fields";
import { StyleFields } from "./StyleFields";
import styles from "./content.module.css";

export function SectionSettings({
  section,
  change,
}: {
  section: NewsletterSection;
  change: (section: NewsletterSection) => void;
}) {
  return (
    <section className={styles.panel} aria-label="Section settings">
      <h2>Section settings</h2>
      <Entry
        label="Section name"
        value={section.name}
        maxLength={100}
        change={(name) => change({ ...section, name })}
      />
      <StyleFields
        typography={false}
        value={section.style}
        change={(style) => change({ ...section, style })}
      />
      <p>
        Changes remain local until you save the newsletter. Source-client and
        font references stay attached to this section.
      </p>
    </section>
  );
}
export function DesignStyles({
  design,
  change,
}: {
  design: NewsletterDesign;
  change: (styles: NewsletterDesign["styles"]) => void;
}) {
  const [category, setCategory] = useState("background");
  const [mobile, setMobile] = useState(false);
  const [textStyle, setTextStyle] = useState<"p" | "h1" | "h2" | "h3" | "h4">(
    "p",
  );
  const value = design.styles;
  const set = (update: Partial<typeof value>) =>
    change({ ...value, ...update });
  const useMobile = mobile && !value.linkedStyles;
  const textKey = useMobile ? "mobileText" : "text";
  const blockKey =
    category === "button"
      ? useMobile
        ? "mobileButton"
        : "button"
      : category === "divider"
        ? useMobile
          ? "mobileDivider"
          : "divider"
        : category === "image"
          ? useMobile
            ? "mobileImage"
            : "image"
          : category === "logo"
            ? useMobile
              ? "mobileLogo"
              : "logo"
            : "link";
  const style =
    category === "text" ? value[textKey][textStyle] : value[blockKey];
  const setStyle = (next: NewsletterStyle) =>
    category === "text"
      ? set({ [textKey]: { ...value[textKey], [textStyle]: next } })
      : set({ [blockKey]: next });
  return (
    <section className={styles.panel} aria-label="Email styles">
      <h2>Email styles</h2>
      <Choice
        label="Style category"
        value={category}
        values={[
          "background",
          "text",
          "link",
          "button",
          "divider",
          "image",
          "logo",
        ]}
        change={setCategory}
      />
      {category === "background" ? (
        <>
          <Entry
            label="Email background"
            value={value.background}
            maxLength={7}
            change={(background) => set({ background })}
          />
          <Entry
            label="Content background"
            value={value.content}
            maxLength={7}
            change={(content) => set({ content })}
          />
          <Entry
            label="Background image URL"
            value={value.backgroundImage}
            change={(backgroundImage) => set({ backgroundImage })}
          />
          <NumberEntry
            label="Content width"
            value={value.width}
            min={320}
            max={1200}
            change={(width) => {
              if (width !== undefined) set({ width });
            }}
          />
          <NumberEntry
            label="Mobile left/right padding"
            value={value.mobilePadding}
            max={100}
            change={(mobilePadding) => {
              if (mobilePadding !== undefined) set({ mobilePadding });
            }}
          />
        </>
      ) : (
        <>
          {category !== "link" && (
            <>
              <Toggle
                label="Link Desktop and Mobile styles"
                checked={value.linkedStyles}
                change={(linkedStyles) => set({ linkedStyles })}
              />
              <Choice
                label="Style device"
                value={mobile ? "Mobile" : "Desktop"}
                values={["Desktop", "Mobile"]}
                change={(next) => setMobile(next === "Mobile")}
              />
              {mobile && value.linkedStyles && (
                <p>
                  Mobile uses desktop email styles while linked. Independent
                  mobile values are retained.
                </p>
              )}
            </>
          )}
          {category === "text" && (
            <Choice
              label="Text style"
              value={textStyle}
              values={[["p", "Paragraph"], "h1", "h2", "h3", "h4"]}
              change={(next) => setTextStyle(next as typeof textStyle)}
            />
          )}
          <StyleFields
            value={style}
            change={setStyle}
            typography={["text", "link", "button"].includes(category)}
          />
        </>
      )}
      <p>
        Email styles change only this local newsletter. They do not update a
        Brand Kit.
      </p>
    </section>
  );
}
