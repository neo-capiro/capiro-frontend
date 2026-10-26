"use client";

import { useRef, useState } from "react";
import { ChevronDown, ListFilter } from "lucide-react";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import { FormField } from "../ui/FormField";
import { Notice } from "../ui/Notice";
import { MemoryCard } from "../screens/memory/MemoryCard";
import { MemorySearchEmpty } from "../screens/memory/MemorySearchEmpty";
import ui from "../ui/meri-ui.module.css";
import phone from "../ui/phone-page.module.css";
import memory from "../screens/memory/memory.module.css";
import { useOwnerCorrection } from "./useOwnerCorrection";
import styles from "./owner-review.module.css";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVIDENCE_UNAVAILABLE =
  "Evidence links are not connected for personal memory yet.";

/**
 * Core titles personal memory by its canonical key (`user:<id>:<slug>`, `learning-signal:…`).
 * The card shows the readable slug; the key itself is never a user-facing title.
 */
export function memoryTitle(key: string) {
  const parts = key
    .split(":")
    .filter((part) => part && part !== "user" && !UUID.test(part));
  const slug = parts.at(-1);
  if (!slug) return key;
  const words = slug.replace(/[_-]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : key;
}

const matches = (title: string, value: string, query: string) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = `${title} ${value}`.toLowerCase();
  return terms.some((term) => text.includes(term));
};

/** 05.04 Institutional Memory recall for the owner's personal memory; a correction is created against one Core-selected row. */
export function MemoryCorrectionComposer({ enabled }: { enabled: boolean }) {
  const {
    items,
    refresh,
    loadMore,
    propose,
    workingId,
    feedback,
    holdStatus,
    unknownIds,
  } = useOwnerCorrection(enabled);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const ready = items.state === "ready" ? items : undefined;
  const selected = ready?.items.find((item) => item.id === selectedId);
  const results =
    ready?.items.filter((item) =>
      matches(memoryTitle(item.title), item.value, query),
    ) ?? [];
  const count = ready?.items.length;
  return (
    <section
      className={`${ui.page} ${phone.page}`}
      aria-label="Institutional Memory"
    >
      <MeriPageHeading
        title="Institutional Memory"
        description={
          count === undefined
            ? "Personal memory · Freshness is shown separately"
            : `${count} current ${count === 1 ? "record" : "records"}${ready?.nextCursor ? " loaded; more may exist" : ""} · Personal memory · Freshness is shown separately`
        }
        action={
          <button
            type="button"
            className={ui.outline}
            disabled={!enabled || !!workingId || !!ready?.moreLoading}
            onClick={() => {
              setSelectedId(null);
              setDraft("");
              refresh();
            }}
          >
            Refresh current memory
          </button>
        }
      />
      {!enabled ? (
        <Notice title="Correction creation unavailable">
          The governed memory connection is not enabled for this workspace.
        </Notice>
      ) : (
        <>
          <div className={memory.search}>
            <div
              role="search"
              aria-label="Memory"
              className={memory.searchField}
            >
              <FormField
                label="Search memory"
                type="search"
                value={query}
                onChange={setQuery}
                ref={search}
              />
            </div>
            <button
              type="button"
              className={ui.outline}
              disabled
              title="This page shows your personal memory; client memory is read inside a client conversation."
              aria-label="Memory scope: Personal"
            >
              <ChevronDown aria-hidden /> Personal
            </button>
            <nav aria-label="Memory views" className={memory.viewSwitch}>
              <button type="button" className={ui.primary} aria-current="page">
                <ListFilter aria-hidden /> Current memory
              </button>
              <button
                type="button"
                className={ui.outline}
                disabled
                title="Memory history is not connected for personal memory yet."
              >
                <ListFilter aria-hidden /> History
              </button>
            </nav>
          </div>
          {holdStatus === "unavailable" ? (
            <Notice tone="danger" title="Corrections paused">
              This browser cannot preserve an uncertain submission across
              reloads. Corrections are held until recovery storage is available.
            </Notice>
          ) : null}
          {unknownIds.size > 0 ? (
            <Notice tone="danger" title="Correction outcome needs verification">
              {unknownIds.size} correction{" "}
              {unknownIds.size === 1 ? "submission is" : "submissions are"} held
              in this browser after an uncertain result. A Core review receipt
              is needed before resubmitting, even if the source item no longer
              appears below.
            </Notice>
          ) : null}
          {feedback ? (
            <p role="status" className={styles.feedback}>
              {feedback}
            </p>
          ) : null}
          {items.state === "loading" ? (
            <p role="status">Checking current personal memories…</p>
          ) : items.state === "error" ? (
            <Notice tone="danger" title="Current memory unavailable">
              {items.message}
            </Notice>
          ) : items.items.length === 0 ? (
            <Notice title="No current personal memory returned">
              Core returned no controlling personal memories in this page.
            </Notice>
          ) : results.length === 0 ? (
            <MemorySearchEmpty
              title="No matching memory"
              scope="Current memory · Personal"
              records="No current records in your personal memory match this search."
              query={query}
              onClear={() => {
                setQuery("");
                search.current?.focus();
              }}
            />
          ) : (
            <>
              <p className="sr-only" role="status">
                {results.length === 1
                  ? "1 record"
                  : `${results.length} records`}{" "}
                shown in current memory
              </p>
              <div
                className={memory.memoryList}
                role="group"
                aria-label="Current personal memories"
              >
                {results.map((item) => (
                  <MemoryCard
                    key={item.id}
                    unavailable={EVIDENCE_UNAVAILABLE}
                    item={{
                      id: item.id,
                      title: memoryTitle(item.title),
                      meta: item.clientId
                        ? "Personal · client memory"
                        : "Personal · firm-wide",
                      fact: item.value,
                      status: { label: "Current", tone: "neutral" },
                      terms: [],
                      evidence: { label: "View evidence" },
                      correction: {
                        selected: selectedId === item.id,
                        disabled: !!workingId,
                        onSelect: () => {
                          setSelectedId(item.id);
                          setDraft(item.value);
                        },
                      },
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {ready?.moreError ? (
            <p role="alert" className={styles.feedback}>
              {ready.moreError}
            </p>
          ) : null}
          {ready?.nextCursor ? (
            <button
              type="button"
              className={ui.outline}
              disabled={ready.moreLoading || !!workingId}
              onClick={() => void loadMore()}
            >
              {ready.moreLoading ? "Loading…" : "Load more"}
            </button>
          ) : null}
          {selected ? (
            <form
              className={styles.card}
              onSubmit={(event) => {
                event.preventDefault();
                void propose(selected, draft).then((outcome) => {
                  if (outcome === "confirmed") {
                    setSelectedId(null);
                    setDraft("");
                  }
                });
              }}
            >
              <h3>Propose a correction to {memoryTitle(selected.title)}</h3>
              <p className={ui.muted}>Current canonical text</p>
              <p className={styles.value}>{selected.value}</p>
              {unknownIds.has(selected.id) ? (
                <p role="status" className={styles.versionNotice}>
                  A correction for this item may already have been submitted.
                  Its outcome must be verified in Core before resubmission.
                </p>
              ) : null}
              <label>
                Corrected text
                <textarea
                  className={styles.reason}
                  value={draft}
                  maxLength={8_000}
                  disabled={workingId !== null}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className={ui.primary}
                disabled={
                  holdStatus !== "ready" ||
                  unknownIds.has(selected.id) ||
                  workingId !== null ||
                  !draft.trim() ||
                  draft.trim() === selected.value.trim()
                }
              >
                {workingId === selected.id
                  ? "Submitting…"
                  : "Submit correction for review"}
              </button>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}
