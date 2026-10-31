"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ActionButton,
  Modal,
  SelectInput,
  Tabs,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "./newsletter-figma.module.css";
import { createNewsletter, newsletterPresets } from "./newsletter-model";
import { NewsletterPaper } from "./NewsletterPaper";

const tabs = [
  { id: "all", label: "All templates" },
  { id: "basic", label: "Basic layouts" },
  { id: "designed", label: "Fully designed" },
  { id: "drafts", label: "Drafts" },
  { id: "saved", label: "Saved templates" },
  { id: "code", label: "Code your own" },
] as const;
type TabId = (typeof tabs)[number]["id"];

function options(values: readonly string[], all: string) {
  return [
    { value: "", label: all },
    ...Array.from(new Set(values)).map((value) => ({ value, label: value })),
  ];
}

export function SelectTemplate({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabId>("all");
  const [purpose, setPurpose] = useState("");
  const [presetStyle, setPresetStyle] = useState("");
  const [industry, setIndustry] = useState("");
  const [preview, setPreview] = useState<string>();
  const matched = newsletterPresets.filter((preset) => {
    const text = `${preset.name} ${preset.description}`.toLowerCase();
    if (!text.includes(search.trim().toLowerCase())) return false;
    if (purpose && preset.purpose !== purpose) return false;
    if (presetStyle && preset.style !== presetStyle) return false;
    if (industry && preset.industry !== industry) return false;
    if (tab === "basic") return preset.id === "column";
    if (tab === "designed") return preset.id === "weekly";
    if (tab === "code") return preset.id === "blank";
    return true;
  });
  const usingLibrary = tab === "drafts" || tab === "saved";
  return (
    <>
      <div className={styles.tabs}>
        <Tabs
          items={tabs}
          value={tab}
          onChange={(value) => setTab(value as TabId)}
          label="Newsletter template categories"
          wrap
        />
      </div>
      {!usingLibrary && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Find your starting point</h2>
          <div className={styles.filterRow}>
            <div className={styles.filterField}>
              <label htmlFor="newsletter-template-search">
                Search newsletter templates
              </label>
              <TextInput
                id="newsletter-template-search"
                value={search}
                placeholder="Search by name"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <label htmlFor="newsletter-template-purpose">Purpose</label>
              <SelectInput
                id="newsletter-template-purpose"
                value={purpose}
                onValueChange={setPurpose}
                options={options(
                  newsletterPresets.map((preset) => preset.purpose),
                  "All purposes",
                )}
              />
            </div>
            <div className={styles.filterField}>
              <label htmlFor="newsletter-template-style">Style</label>
              <SelectInput
                id="newsletter-template-style"
                value={presetStyle}
                onValueChange={setPresetStyle}
                options={options(
                  newsletterPresets.map((preset) => preset.style),
                  "All styles",
                )}
              />
            </div>
            <div className={styles.filterField}>
              <label htmlFor="newsletter-template-industry">Industry</label>
              <SelectInput
                id="newsletter-template-industry"
                value={industry}
                onValueChange={setIndustry}
                options={options(
                  newsletterPresets.map((preset) => preset.industry),
                  "All industries",
                )}
              />
            </div>
          </div>
        </div>
      )}
      {usingLibrary ? (
        <TemplateLibrary tab={tab} />
      ) : matched.length ? (
        <section>
          <h2 className={styles.galleryTitle}>Recommended for your work</h2>
          <div className={styles.templateGrid}>
            {matched.map((preset) => (
              <article key={preset.id} className={styles.templateCard}>
                <div className={styles.cardPreview} aria-hidden>
                  <NewsletterPaper body={createNewsletter(preset.id)} />
                </div>
                <span className={`${styles.statusBadge} ${styles.cardChip}`}>
                  {preset.tag}
                </span>
                <h3 className={styles.cardTitle}>{preset.name}</h3>
                <p className={styles.cardDescription}>{preset.description}</p>
                <div className={styles.cardActions}>
                  <ActionButton onClick={() => setPreview(preset.id)}>
                    Preview
                  </ActionButton>
                  <ActionButton primary onClick={() => onSelect(preset.id)}>
                    Apply
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <p className={styles.emptyState}>
          No starting points match these filters.
        </p>
      )}
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
          Apply
        </ActionButton>
      </Modal>
    </>
  );
}

function TemplateLibrary({ tab }: { tab: TabId }) {
  const drafts = tab === "drafts";
  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>
        {drafts ? "Continue an existing draft" : "Use a saved template"}
      </h2>
      <p className={styles.panelHint}>
        {drafts
          ? "Find and reopen your saved newsletter drafts in Workspace."
          : "Browse and apply saved templates in the Templates library."}
      </p>
      <Link
        href={
          drafts ? "/modules/workspace" : "/modules/workspace?view=templates"
        }
      >
        {drafts ? "Open Workspace" : "Open Templates"}
      </Link>
    </div>
  );
}
