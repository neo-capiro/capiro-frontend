"use client";
import { useMemo, useState } from "react";
import {
  defaultNewsletterConfig,
  type NewsletterTemplateLibraryItem,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  TextInput,
} from "@/shared/module-ui";
import { RichPreview } from "../RichPreview";
import type { NewsletterLibrary } from "./use-newsletter-library";
import { filterLibraryItems } from "./sections";
import styles from "./sections.module.css";

function TemplateCard({
  item,
  library,
  apply,
}: {
  item: NewsletterTemplateLibraryItem;
  library: NewsletterLibrary;
  apply: (item: NewsletterTemplateLibraryItem) => void;
}) {
  const [preview, setPreview] = useState(false);
  const draft = useMemo(
    () => ({
      name: item.name,
      design: item.design,
      config: { ...defaultNewsletterConfig(), ...item.config },
    }),
    [item],
  );
  return (
    <article className={styles.templateCard} data-design-node="1172:277186">
      <div className={styles.thumbnail}>
        <RichPreview draft={draft} mobile={false} plainText={false} />
      </div>
      <span className={styles.badge}>Saved template</span>
      <h3>{item.name}</h3>
      <p>{item.folder || "No folder"}</p>
      <div className={styles.actions}>
        <ActionButton
          className={styles.button}
          onClick={() => setPreview(true)}
          aria-label={`Preview template ${item.name}`}
        >
          Preview
        </ActionButton>
        <ActionButton
          className={styles.button}
          primary
          disabled={!library.editable || library.writing}
          onClick={() => apply(item)}
          aria-label={`Apply template ${item.name}`}
        >
          Apply
        </ActionButton>
        <ActionButton
          className={styles.button}
          disabled={!library.editable || library.writing}
          onClick={() => library.manage("rename", item)}
          aria-label={`Rename/move template ${item.name}`}
        >
          Rename/move
        </ActionButton>
        <ActionButton
          className={styles.button}
          disabled={!library.editable || library.writing}
          onClick={() => library.manage("delete", item)}
          aria-label={`Delete template ${item.name}`}
        >
          Delete
        </ActionButton>
      </div>
      <Modal
        open={preview}
        onOpenChange={setPreview}
        title={`Preview: ${item.name}`}
        description="Local rendering of the loaded saved template. No newsletter is changed."
        className={styles.dialog}
        footer={
          <ActionButton
            className={styles.button}
            onClick={() => setPreview(false)}
          >
            Close preview
          </ActionButton>
        }
      >
        <RichPreview draft={draft} mobile={false} plainText={false} />
      </Modal>
    </article>
  );
}

export function SavedTemplates({
  library,
  close,
  apply,
}: {
  library: NewsletterLibrary;
  close: () => void;
  apply: (item: NewsletterTemplateLibraryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [page, setPage] = useState(0);
  const items = library.templates ?? [];
  const filtered = filterLibraryItems(items, search, folder, sort);
  const last = Math.max(0, Math.ceil(filtered.length / 6) - 1);
  const current = Math.min(page, last);
  const folders = [
    ...new Set(
      items
        .map((item) => item.folder)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  return (
    <section
      className={styles.catalog}
      aria-label="Saved templates"
      data-design-node="1172:276961"
    >
      <div className={styles.catalogHeader}>
        <div>
          <h2>Saved newsletter templates</h2>
          <p>
            Apply replaces the local design and any saved template footer
            details in one change. Your newsletter name, audience and campaign
            settings stay with this draft. Undo restores it.
          </p>
        </div>
        <ActionButton className={styles.button} onClick={close}>
          Back to editor
        </ActionButton>
      </div>
      <div
        className={`${styles.details} ${styles.filters}`}
        data-design-node="1172:277151"
      >
        <Field label="Search saved templates" htmlFor="saved-template-search">
          <TextInput
            id="saved-template-search"
            placeholder="Search templates"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </Field>
        <Field label="Folder" htmlFor="saved-template-folder">
          <SelectInput
            id="saved-template-folder"
            value={folder}
            onValueChange={(value) => {
              setFolder(value);
              setPage(0);
            }}
            options={[
              { value: "", label: "All folders" },
              ...folders.map((value) => ({ value, label: value })),
            ]}
          />
        </Field>
        <Field label="Sort" htmlFor="saved-template-sort">
          <SelectInput
            id="saved-template-sort"
            value={sort}
            onValueChange={(value) => {
              setSort(value === "name" ? "name" : "recent");
              setPage(0);
            }}
            options={[
              { value: "recent", label: "Recent" },
              { value: "name", label: "Name" },
            ]}
          />
        </Field>
      </div>
      <p className={styles.help}>
        Filters apply only to the loaded templates (up to 500). Previews are
        rendered locally with external images and links disabled.
      </p>
      <div aria-live="polite">
        {library.read === "loading" && <p>Loading saved templates…</p>}
        {library.read === "unavailable" && (
          <p>
            Saved templates are unavailable. Check current access with a new
            read.
          </p>
        )}
        {library.read === "idle" && (
          <p>Refresh templates to read current library items.</p>
        )}
        {library.read === "ready" && !items.length && (
          <p>
            No saved templates yet. Save the current server newsletter as a
            template to reuse it.
          </p>
        )}
        {library.read === "ready" && items.length > 0 && !filtered.length && (
          <div className={styles.actions}>
            <p>No loaded templates match these filters.</p>
            <ActionButton
              className={styles.button}
              onClick={() => {
                setSearch("");
                setFolder("");
                setPage(0);
              }}
            >
              Clear filters
            </ActionButton>
          </div>
        )}
      </div>
      {library.read === "ready" && (
        <div className={styles.templateGrid}>
          {filtered.slice(current * 6, (current + 1) * 6).map((item) => (
            <TemplateCard
              key={item.id}
              item={item}
              library={library}
              apply={apply}
            />
          ))}
        </div>
      )}
      <div className={styles.actions}>
        {library.read !== "loading" && (
          <ActionButton
            className={styles.button}
            onClick={() => void library.browse("template")}
          >
            Refresh templates
          </ActionButton>
        )}
        {filtered.length > 6 && (
          <>
            <span>
              Loaded templates {current * 6 + 1}–
              {Math.min((current + 1) * 6, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <ActionButton
              className={styles.button}
              disabled={!current}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </ActionButton>
            <ActionButton
              className={styles.button}
              disabled={current === last}
              onClick={() => setPage(current + 1)}
            >
              Next
            </ActionButton>
          </>
        )}
      </div>
    </section>
  );
}
