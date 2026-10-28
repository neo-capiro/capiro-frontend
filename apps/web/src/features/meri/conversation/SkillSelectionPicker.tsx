"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  CONVERSATION_SKILLS,
  type ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import {
  receiveSkillSelection,
  type ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import styles from "../model-selection/model-selection.module.css";

type Window = NonNullable<ConversationSubmitRequest["windowRequest"]>;
const labels: Record<Window["basis"], string> = {
  "calendar-week": "Calendar week",
  "calendar-month": "Calendar month",
  "calendar-year": "Calendar year",
  "relative-duration": "Number of days",
  explicit: "Date range",
  "fiscal-year": "Saved fiscal year",
  unbounded: "All available history",
};
export const skillsForScope = (clientId: string | null) =>
  CONVERSATION_SKILLS.filter((skill) =>
    clientId === null
      ? skill.subjectKinds.some(
          (kind) => kind === "portfolio" || kind === "personal",
        )
      : skill.subjectKinds.includes("client"),
  );
const defaultBasis = (
  skill: (typeof CONVERSATION_SKILLS)[number],
): Window["basis"] =>
  skill.windowBases.includes("unbounded")
    ? "unbounded"
    : skill.windowBases.includes("calendar-week")
      ? "calendar-week"
      : "explicit";
const utcInput = (value: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  )
    throw Error("Timestamp required");
  return new Date(value).toISOString();
};
export const skillSelectionLabel = (selection: ConversationSkillSelection) => {
  const skill = CONVERSATION_SKILLS.find(
    (item) => item.skillId === selection.skill?.skillId,
  );
  return selection.skill
    ? `${skill?.displayName ?? "Saved skill"} · ${selection.skill.skillVersion}`
    : "No selected skill";
};

/** The derived public catalogue selects a typed request; Apply never sends a prompt. */
export function SkillSelectionPicker({
  selection,
  clientId,
  disabled,
  onChange,
}: {
  selection: ConversationSkillSelection;
  clientId: string | null;
  disabled: boolean;
  onChange: (value: ConversationSkillSelection) => void;
}) {
  const choices = skillsForScope(clientId);
  const saved = selection.windowRequest;
  const [skillId, setSkillId] = useState(selection.skill?.skillId ?? "");
  const selected = choices.find((item) => item.skillId === skillId);
  const [basis, setBasis] = useState<Window["basis"]>(
    saved?.basis ?? "unbounded",
  );
  const [timezone, setTimezone] = useState(
    saved && "timezone" in saved
      ? saved.timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [offset, setOffset] = useState<-1 | 0>(
    saved && "offset" in saved ? saved.offset : -1,
  );
  const [weekStartsOn, setWeekStartsOn] = useState<"monday" | "sunday">(
    saved?.basis === "calendar-week" ? saved.weekStartsOn : "monday",
  );
  const [days, setDays] = useState(
    saved?.basis === "relative-duration" ? saved.days : 30,
  );
  const [anchorAt, setAnchorAt] = useState(
    saved?.basis === "relative-duration"
      ? saved.anchorAt
      : new Date().toISOString(),
  );
  const [start, setStart] = useState(
    saved?.basis === "explicit" ? saved.startInclusive : "",
  );
  const [end, setEnd] = useState(
    saved?.basis === "explicit" ? saved.endExclusive : "",
  );
  const [error, setError] = useState<string>();
  const apply = () => {
    if (disabled) return;
    if (!skillId) {
      // Clearing the skill keeps an additive work definition; other selected inputs clear as before.
      onChange(
        receiveSkillSelection(selection.work ? { work: selection.work } : {}),
      );
      return;
    }
    if (!selected || !selected.windowBases.includes(basis)) return;
    try {
      const windowRequest: Window =
        basis === "unbounded"
          ? { basis }
          : basis === "calendar-week"
            ? { basis, offset, timezone, weekStartsOn }
            : basis === "calendar-month" || basis === "calendar-year"
              ? { basis, offset, timezone }
              : basis === "relative-duration"
                ? { basis, days, anchorAt: utcInput(anchorAt), timezone }
                : basis === "explicit"
                  ? {
                      basis,
                      startInclusive: utcInput(start),
                      endExclusive: utcInput(end),
                      timezone,
                    }
                  : saved?.basis === "fiscal-year"
                    ? saved
                    : (() => {
                        throw Error("No saved fiscal calendar");
                      })();
      onChange(
        receiveSkillSelection({
          // Work is additive intent, so an applied work definition survives a skill change.
          ...(selection.work ? { work: selection.work } : {}),
          skill: { skillId: selected.skillId, skillVersion: selected.version },
          windowRequest,
        }),
      );
      setError(undefined);
    } catch {
      setError(
        "Check the time window. Use an IANA timezone and ISO timestamps with an offset; the end must follow the start.",
      );
    }
  };
  return (
    <details className={styles.picker}>
      {/* Figma composer "Skill · None": the Select-trigger look; the full name stays for assistive technology. */}
      <summary className={styles.trigger}>
        <span className="sr-only">Skill for next message: </span>
        <span className={styles.value}>
          Skill · {selection.skill ? skillSelectionLabel(selection) : "None"}
        </span>
        <ChevronDown aria-hidden />
      </summary>
      <p className={styles.help}>
        Choose a skill and time window, then review your message before Send.
        Access is checked when Meri starts.
      </p>
      <label className={styles.field}>
        Skill
        <select
          className={styles.trigger}
          disabled={disabled}
          value={skillId}
          onChange={(event) => {
            const next = choices.find(
              (item) => item.skillId === event.target.value,
            );
            setSkillId(next?.skillId ?? "");
            if (next) setBasis(defaultBasis(next));
            setError(undefined);
          }}
        >
          <option value="">No selected skill</option>
          {selection.skill &&
            !choices.some(
              (item) => item.skillId === selection.skill?.skillId,
            ) && (
              <option value={selection.skill.skillId} disabled>
                Saved skill unavailable for this scope
              </option>
            )}
          {choices.map((skill) => (
            <option key={skill.skillId} value={skill.skillId}>
              {skill.displayName} · {skill.version}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <>
          <label className={styles.field}>
            Time window
            <select
              className={styles.trigger}
              disabled={disabled}
              value={basis}
              onChange={(event) =>
                setBasis(event.target.value as Window["basis"])
              }
            >
              {selected.windowBases
                .filter(
                  (value) =>
                    value !== "fiscal-year" || saved?.basis === "fiscal-year",
                )
                .map((value) => (
                  <option key={value} value={value}>
                    {labels[value]}
                  </option>
                ))}
            </select>
          </label>
          {basis.startsWith("calendar-") && (
            <label>
              Period
              <select
                disabled={disabled}
                value={offset}
                onChange={(event) =>
                  setOffset(Number(event.target.value) as -1 | 0)
                }
              >
                <option value={-1}>Previous</option>
                <option value={0}>Current</option>
              </select>
            </label>
          )}
          {basis === "calendar-week" && (
            <label>
              Week starts
              <select
                disabled={disabled}
                value={weekStartsOn}
                onChange={(event) =>
                  setWeekStartsOn(event.target.value as "monday" | "sunday")
                }
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </label>
          )}
          {basis === "relative-duration" && (
            <>
              <label>
                Days
                <input
                  disabled={disabled}
                  type="number"
                  min={1}
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                />
              </label>
              <label>
                Ending at
                <input
                  disabled={disabled}
                  value={anchorAt}
                  onChange={(event) => setAnchorAt(event.target.value)}
                  placeholder="2026-10-24T12:00:00Z"
                />
              </label>
            </>
          )}
          {basis === "explicit" && (
            <>
              <label>
                Start, inclusive
                <input
                  disabled={disabled}
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  placeholder="2026-10-01T00:00:00-04:00"
                />
              </label>
              <label>
                End, exclusive
                <input
                  disabled={disabled}
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  placeholder="2026-11-01T00:00:00-04:00"
                />
              </label>
            </>
          )}
          {basis !== "unbounded" && basis !== "fiscal-year" && (
            <label>
              Timezone
              <input
                disabled={disabled}
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="America/New_York"
              />
            </label>
          )}
          {basis === "fiscal-year" && saved?.basis === "fiscal-year" && (
            <p>
              Retain saved fiscal year {saved.year}, {saved.stage},{" "}
              {saved.timezone}.
            </p>
          )}
        </>
      )}
      {selection.windowRequest && (
        <p className={styles.help}>
          Applied window: {labels[selection.windowRequest.basis]}
          {"timezone" in selection.windowRequest
            ? ` · ${selection.windowRequest.timezone}`
            : ""}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        disabled={disabled || (!!skillId && !selected)}
        onClick={apply}
      >
        Apply to draft
      </button>
    </details>
  );
}
