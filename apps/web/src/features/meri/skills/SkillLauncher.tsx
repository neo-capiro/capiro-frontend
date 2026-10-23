"use client";
import {
  skillCatalog,
  type SkillCatalogEntry,
} from "@capiro/meri-contracts/skill-catalog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@capiro/ui/command";
import { Button } from "@capiro/ui/button";
import {
  tabScopeKey,
  type TabScope,
} from "../../../shared/meri-conversations/tab-journal";
import { SkillWindowFields } from "./SkillWindowFields";
import { useSkillDraft } from "./useSkillDraft";
import styles from "./skills.module.css";

/** Canonical generated catalog: identity/version pins are never guessed from labels. */
export function SkillLauncher({
  scope,
  scopeLabel,
}: {
  scope?: TabScope | undefined;
  scopeLabel: string;
}) {
  return (
    <ScopedLauncher
      key={scope ? tabScopeKey(scope) : "unverified"}
      scope={scope}
      scopeLabel={scopeLabel}
    />
  );
}

function ScopedLauncher({
  scope,
  scopeLabel,
}: {
  scope: TabScope | undefined;
  scopeLabel: string;
}) {
  const selection = useSkillDraft(scope);
  const entry = skillCatalog.skills.find(
    (row) =>
      row.skillId === selection.draft?.skill.skillId &&
      row.skillVersion === selection.draft.skill.skillVersion,
  );
  return (
    <details className={styles.launcher}>
      <summary>
        Skills · {new Set(skillCatalog.skills.map((row) => row.skillId)).size}{" "}
        catalog skills
      </summary>
      <p>
        Draft scope: {scopeLabel}. Choosing a skill does not send a message.
      </p>
      <Command className={styles.command}>
        <CommandInput placeholder="Find a skill" aria-label="Find a skill" />
        <CommandList>
          <CommandEmpty>No matching skills.</CommandEmpty>
          {skillCatalog.skills.map((row) => {
            const id = `${row.skillId}@${row.skillVersion}`;
            return (
              <CommandItem
                key={id}
                value={`${id} ${row.label}`}
                disabled={!selection.ready}
                onSelect={() => selection.select(row)}
              >
                <span>{row.label}</span>
                <small>{row.skillVersion}</small>
              </CommandItem>
            );
          })}
        </CommandList>
      </Command>
      {entry && <SkillDraftEditor entry={entry} selection={selection} />}
      {!scope && (
        <p>
          Verify your account and choose General or an authorized client to
          prepare a draft.
        </p>
      )}
      {selection.error && <p role="alert">{selection.error}</p>}
    </details>
  );
}

function SkillDraftEditor({
  entry,
  selection,
}: {
  entry: SkillCatalogEntry;
  selection: ReturnType<typeof useSkillDraft>;
}) {
  return (
    <section aria-label="Selected skill" className={styles.detail}>
      <strong>
        {entry.label} · {entry.skillVersion}
      </strong>
      <p>
        {entry.unavailableReason === "RUNTIME_NOT_QUALIFIED"
          ? "This skill is not qualified for this runtime."
          : "A current installation is required before this skill can run."}
      </p>
      <p>
        Sources:{" "}
        {entry.requiredSources.map((source) => source.sourceId).join(", ") ||
          "None listed"}
      </p>
      <SkillWindowFields
        bases={entry.windowBases}
        fields={selection.fields}
        onChange={selection.setFields}
      />
      <Button
        type="button"
        variant="outline"
        disabled={!selection.ready}
        onClick={selection.keepWindow}
      >
        Keep window in this tab
      </Button>
      {selection.draft?.windowRequest && (
        <p role="status">
          Requested window kept for this exact version. Dates, scope and source
          access still need server validation before a run.
        </p>
      )}
      <Button type="button" disabled>
        Run skill unavailable
      </Button>
    </section>
  );
}
