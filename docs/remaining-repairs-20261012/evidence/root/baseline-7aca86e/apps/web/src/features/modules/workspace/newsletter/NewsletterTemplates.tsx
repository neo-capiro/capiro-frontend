"use client";
import { useState } from "react";
import {
  ActionButton,
  Badge,
  Modal,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { createNewsletter, newsletterPresets } from "./newsletter-model";
import { NewsletterPaper } from "./NewsletterPaper";
export function SelectTemplate({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All templates");
  const [preview, setPreview] = useState<string>();
  return (
    <>
      <div
        className={styles.pills}
        role="group"
        aria-label="Newsletter template categories"
      >
        {[
          "All templates",
          "Basic layouts",
          "Fully designed",
          "Code your own",
        ].map((value) => (
          <button
            key={value}
            className={category === value ? styles.active : ""}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <TextInput
        aria-label="Search newsletter templates"
        value={search}
        placeholder="Search by name or purpose…"
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className={styles.templateGrid}>
        {newsletterPresets
          .filter(
            (preset) =>
              `${preset.name} ${preset.description}`
                .toLowerCase()
                .includes(search.toLowerCase()) &&
              (category === "All templates" ||
                (category === "Basic layouts" && preset.id === "column") ||
                (category === "Fully designed" && preset.id === "weekly") ||
                (category === "Code your own" && preset.id === "blank")),
          )
          .map((preset) => (
            <article key={preset.id} className={styles.templateCard}>
              <div className={styles.previewCover}>
                <p>CAPIRO / CLIENT UPDATE</p>
                <h3>{preset.title}</h3>
                <p>Insights, context and what comes next.</p>
                <hr />
                <h3 style={{ fontSize: 18 }}>Legislative watch</h3>
                <p>A thoughtful briefing for the week ahead.</p>
              </div>
              <h3>{preset.name}</h3>
              <p>{preset.description}</p>
              <Badge>{preset.tag}</Badge>
              <footer>
                <ActionButton onClick={() => setPreview(preset.id)}>
                  Preview
                </ActionButton>
                <ActionButton primary onClick={() => onSelect(preset.id)}>
                  {preset.id === "blank" ? "Start blank" : "Apply template"}
                </ActionButton>
              </footer>
            </article>
          ))}
      </div>
      <p className={styles.footnote}>
        Composer layouts are local starting points. Saving creates a document in
        the existing Workspace service.
      </p>
      <Modal
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(undefined);
        }}
        title="Newsletter template preview"
      >
        <NewsletterPaper body={createNewsletter(preview ?? "weekly")} />
        <ActionButton primary onClick={() => preview && onSelect(preview)}>
          Apply template
        </ActionButton>
      </Modal>
    </>
  );
}
