"use client";
import { useState } from "react";
import {
  ActionButton,
  Field,
  SelectInput,
  TextInput,
} from "@/shared/module-ui";
import type { NewsletterSectionLibraryItem } from "@capiro/shared/newsletter";
import type { SectionLibrary } from "./use-section-library";
import { filterSavedSections } from "./sections";
import styles from "./sections.module.css";

export function SavedSections({
  library,
  close,
  insert,
}: {
  library: SectionLibrary;
  close: () => void;
  insert: (item: NewsletterSectionLibraryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const items = library.items ?? [];
  const filtered = filterSavedSections(items, search, folder, sort);
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

export function SectionLibraryNotice({ library }: { library: SectionLibrary }) {
  const unknown = library.save?.phase === "unknown";
  if (library.dialog || (!unknown && !library.notice)) return null;
  return (
    <div className={styles.notice} role="status">
      <p>
        {unknown
          ? "Save was not confirmed. The section may have been added to your saved sections. This mounted view will not repeat that save."
          : library.notice}
      </p>
      {unknown && (
        <ActionButton
          className={styles.button}
          onClick={() => void library.browse()}
        >
          View saved sections
        </ActionButton>
      )}
    </div>
  );
}
