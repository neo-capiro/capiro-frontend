"use client";
import { useState } from "react";
import {
  ActionButton,
  Field,
  SelectInput,
  TextInput,
} from "@/shared/module-ui";
import type { NewsletterSectionLibraryItem } from "@capiro/shared/newsletter";
import type { NewsletterLibrary } from "./use-newsletter-library";
import { filterLibraryItems } from "./sections";
import styles from "./sections.module.css";

export function SavedSections({
  library,
  close,
  insert,
}: {
  library: NewsletterLibrary;
  close: () => void;
  insert: (item: NewsletterSectionLibraryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const items = library.items ?? [];
  const filtered = filterLibraryItems(items, search, folder, sort);
  const folders = [
    ...new Set(
      items
        .map((item) => item.folder)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  return (
    <aside
      className={styles.panel}
      aria-label="Saved sections"
      data-design-node="1175:287890"
    >
      <h2>Find a section</h2>
      <div className={styles.fields}>
        <Field label="Search saved sections" htmlFor="saved-section-search">
          <TextInput
            id="saved-section-search"
            value={search}
            placeholder="Search sections"
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label="Folder" htmlFor="saved-section-folder-filter">
          <SelectInput
            id="saved-section-folder-filter"
            value={folder}
            onValueChange={setFolder}
            options={[
              { value: "", label: "All folders" },
              ...folders.map((value) => ({ value, label: value })),
            ]}
          />
        </Field>
        <Field
          label="Sort"
          htmlFor="saved-section-sort"
          description="Recent or Name"
        >
          <SelectInput
            id="saved-section-sort"
            value={sort}
            onValueChange={(value) =>
              setSort(value === "name" ? "name" : "recent")
            }
            options={[
              { value: "recent", label: "Recent" },
              { value: "name", label: "Name" },
            ]}
          />
        </Field>
      </div>
      <p className={styles.help}>
        Search filters the loaded sections (up to 500). Insert adds a copy at
        the end of this draft.
      </p>
      <div aria-live="polite">
        {library.read === "loading" && <p>Loading saved sections…</p>}
        {library.read === "unavailable" && (
          <p>
            Saved sections are unavailable. Check current access with a new
            read.
          </p>
        )}
        {library.read === "ready" && !items.length && (
          <p>No saved sections yet. Save one from Sections to reuse it.</p>
        )}
        {library.read === "ready" && items.length > 0 && !filtered.length && (
          <div className={styles.actions}>
            <p>No loaded sections match these filters.</p>
            <ActionButton
              className={styles.button}
              onClick={() => {
                setSearch("");
                setFolder("");
              }}
            >
              Clear filters
            </ActionButton>
          </div>
        )}
      </div>
      {library.read === "ready" &&
        filtered.map((item) => (
          <article className={styles.item} key={item.id}>
            <span className={styles.badge}>Saved section</span>
            <h3>{item.name}</h3>
            <p>{item.folder || "No folder"}</p>
            <div className={styles.actions}>
              <ActionButton
                className={styles.button}
                primary
                disabled={!library.editable}
                aria-label={`Insert section ${item.name}`}
                onClick={() => insert(item)}
              >
                Insert section
              </ActionButton>
              <ActionButton
                className={styles.button}
                disabled={!library.editable || library.writing}
                onClick={() => library.manage("rename", item)}
                aria-label={`Rename/move section ${item.name}`}
              >
                Rename/move
              </ActionButton>
              <ActionButton
                className={styles.button}
                disabled={!library.editable || library.writing}
                onClick={() => library.manage("delete", item)}
                aria-label={`Delete section ${item.name}`}
              >
                Delete
              </ActionButton>
            </div>
          </article>
        ))}
      <div className={styles.actions}>
        {library.read !== "loading" && (
          <ActionButton
            className={styles.button}
            onClick={() => void library.browse()}
          >
            Refresh sections
          </ActionButton>
        )}
        <ActionButton className={styles.button} onClick={close}>
          Back to sections
        </ActionButton>
      </div>
    </aside>
  );
}
