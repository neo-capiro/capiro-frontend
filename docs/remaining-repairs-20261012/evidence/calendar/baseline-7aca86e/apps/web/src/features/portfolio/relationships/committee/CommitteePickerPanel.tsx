"use client";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Popover } from "radix-ui";
import { committeeLabel, type Committee } from "../directory-contracts";
import {
  committeeOptions,
  parentCommitteeBranch,
  type CommitteeBranch,
  type CommitteeOption,
} from "./catalog";
import styles from "./committee-picker.module.css";

const searchAsset = new URL("./assets/search.svg", import.meta.url).href;
const backAsset = new URL("./assets/arrow-left.svg", import.meta.url).href;
const expandAsset = new URL("./assets/chevron.svg", import.meta.url).href;

/** Presentation for one reviewed ID; branch navigation never commits a value. */
export function CommitteePickerPanel({
  committees,
  value,
  disabled,
  onCommit,
}: {
  committees: Committee[];
  value: string;
  disabled: boolean;
  onCommit: (id: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [branch, setBranch] = useState<CommitteeBranch>(null);
  const [query, setQuery] = useState("");
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusOptions = useRef(false);
  const options = committeeOptions(committees, branch, query);
  const selected = committees.find((row) => row.id === draft);
  const parent = committees.find((row) => row.officeId === branch?.officeId);
  const selectionValid = !draft || Boolean(selected);
  const path = parent
    ? committeeLabel(parent, committees).replaceAll(" / ", " › ")
    : branch?.chamber;

  useLayoutEffect(() => {
    if (focusOptions.current) {
      optionRefs.current[0]?.focus();
      focusOptions.current = false;
    }
  }, [branch, query]);

  function expand(option: CommitteeOption) {
    if (!option.branch || disabled) return;
    focusOptions.current = true;
    setBranch(option.branch);
    setQuery("");
  }
  function back() {
    focusOptions.current = true;
    if (query) setQuery("");
    else setBranch(parentCommitteeBranch(committees, branch));
  }
  function navigate(event: KeyboardEvent, index: number) {
    if (disabled) return;
    const last = options.length - 1;
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % options.length
        : event.key === "ArrowUp"
          ? (index + last) % options.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    if (next !== undefined) {
      event.preventDefault();
      optionRefs.current[next]?.focus();
    } else if (event.key === "ArrowRight" && options[index]?.branch) {
      event.preventDefault();
      expand(options[index]!);
    } else if (event.key === "ArrowLeft" && (query || branch)) {
      event.preventDefault();
      back();
    }
  }

  return (
    <>
      <div className={styles.search}>
        <img
          className={styles.icon}
          src={searchAsset}
          alt=""
          width={16}
          height={16}
        />
        <input
          aria-label="Search committees"
          placeholder="Search committees…"
          maxLength={200}
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && options.length) {
              event.preventDefault();
              optionRefs.current[0]?.focus();
            }
          }}
        />
        <Popover.Close
          className={styles.close}
          aria-label="Close committee picker"
        >
          ✕
        </Popover.Close>
      </div>
      <div className={styles.breadcrumb}>
        {(branch || query) && (
          <button
            type="button"
            className={styles.back}
            onClick={back}
            disabled={disabled}
            aria-label={
              query ? "Back to committee browsing" : "Back to parent committees"
            }
          >
            <img
              className={styles.icon}
              src={backAsset}
              alt=""
              width={16}
              height={16}
            />
          </button>
        )}
        <span>
          {query
            ? "Search results"
            : `All committees${path ? ` › ${path}` : ""}`}
        </span>
      </div>
      <div
        className={styles.options}
        role="group"
        aria-label="Committee choices"
      >
        {options.map((option, index) => (
          <div
            className={styles.option}
            key={option.key}
            data-selected={option.committee?.id === draft || undefined}
          >
            <button
              type="button"
              className={styles.select}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              disabled={disabled}
              aria-label={
                option.committee
                  ? `Select ${option.detail}`
                  : `Open ${option.label}`
              }
              aria-pressed={
                option.committee ? option.committee.id === draft : undefined
              }
              onClick={() =>
                option.committee
                  ? setDraft(option.committee.id)
                  : expand(option)
              }
              onKeyDown={(event) => navigate(event, index)}
            >
              <span>{option.label}</span>
              {query && <small>{option.detail}</small>}
            </button>
            {option.branch && (
              <>
                <small
                  className={styles.count}
                  aria-label={`${option.childCount} child committees`}
                >
                  {option.childCount}
                </small>
                <button
                  type="button"
                  className={styles.expand}
                  aria-label={`Open ${option.detail || option.label} subcommittees`}
                  disabled={disabled}
                  onClick={() => expand(option)}
                  onKeyDown={(event) => navigate(event, index)}
                >
                  <img
                    className={styles.icon}
                    src={expandAsset}
                    alt=""
                    width={16}
                    height={16}
                  />
                </button>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && (
          <p className={styles.empty} role="status">
            No matching committees.
          </p>
        )}
      </div>
      <div className={styles.footer}>
        <p role="status">
          {selected
            ? committeeLabel(selected, committees).replaceAll(" / ", " › ")
            : draft
              ? "Selected committee unavailable. Choose a current committee."
              : query
                ? "Results include the full parent path"
                : "Choose a committee or subcommittee"}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className="button ghost"
            disabled={disabled}
            onClick={() => setDraft("")}
          >
            Clear
          </button>
          <button
            type="button"
            className="button primary"
            disabled={disabled || !selectionValid}
            onClick={() => onCommit(draft)}
          >
            Done
          </button>
        </div>
        <p>↑↓ Navigate · → Open · Enter Select · Esc Close</p>
      </div>
    </>
  );
}
