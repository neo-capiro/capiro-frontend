"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  keywordConfig,
  keywordRule,
} from "../../../../../shared/capiro/operations/legiwatch-keyword-schemas";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { KeywordDefinitions } from "./KeywordDefinitions";
import { KeywordDelivery } from "./KeywordDelivery";
import { KeywordScanReview } from "./KeywordScanReview";
import { KeywordSuggestions } from "./KeywordSuggestions";
import { FolderTargets, LocalSchedule } from "./ScopeControls";
type Config = z.infer<typeof keywordConfig>;
export function KeywordEditor({
  row,
  onClose,
  onSaved,
}: {
  row?: z.infer<typeof keywordRule>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? ""),
    [changed, setChanged] = useState(false),
    [view, setView] = useState("settings");
  const [config, setConfig] = useState<Config>(() => {
    const saved = row?.config;
    return {
      scope: saved?.scope ?? {
        jurisdiction: "FL",
        sessionKey: "",
        fields: ["title", "bill_text"],
      },
      folderIds: saved?.folderIds ?? [],
      definitions: saved?.definitions ?? [{ id: crypto.randomUUID(), raw: "" }],
      aggregation: saved?.aggregation ?? "any-v1",
      semanticsReviewed: saved?.semanticsReviewed ?? false,
      mode: saved?.mode ?? "suggest",
      cadence: saved?.cadence ?? "end_of_day",
      timezone: saved?.timezone ?? "America/New_York",
      localMinutes: saved?.localMinutes ?? 480,
    };
  });
  const create = useCapiroMutation("legiwatch.keyword.create"),
    update = useCapiroMutation("legiwatch.keyword.save");
  const pending = create.pending || update.pending;
  const patch = (value: Partial<Config>) => {
    setChanged(true);
    setConfig((current) => ({
      ...current,
      semanticsReviewed: false,
      ...value,
    }));
  };
  const save = async () => {
    try {
      if (row)
        await update.run({
          params: { id: row.id },
          body: { name, config, expectedVersion: row.version },
        });
      else await create.run({ body: { name, config } });
      onSaved();
    } catch {
      /* Preserve reviewed input and version on failure. */
    }
  };
  return (
    <Modal
      open
      title={row?.name ?? "New keyword rule"}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      side="right"
    >
      <div className={styles.form}>
        {row && !changed && (
          <SelectField
            id="keyword-view"
            label="Rule workspace"
            value={view}
            onChange={setView}
          >
            <option value="settings">Definition and scope</option>
            <option value="scans">Scan review and activation</option>
            <option value="suggestions">Review suggestions</option>
            <option value="delivery">Staff mapping and channels</option>
          </SelectField>
        )}
        {view === "settings" && (
          <fieldset disabled={pending} className={styles.form}>
            <Field label="Rule name" htmlFor="keyword-name">
              <TextInput
                id="keyword-name"
                value={name}
                maxLength={200}
                onChange={(event) => {
                  setName(event.target.value);
                  setChanged(true);
                }}
              />
            </Field>
            <KeywordScopeFields config={config} patch={patch} />
            <FolderTargets
              values={config.folderIds}
              onChange={(folderIds) => patch({ folderIds })}
            />
            <KeywordDefinitions
              scope={config.scope}
              definitions={config.definitions}
              readOnly={Boolean(row?.config.source)}
              onChange={(definitions) => patch({ definitions })}
            />
            <SelectField
              id="keyword-aggregation"
              label="Combine definitions"
              value={config.aggregation}
              onChange={(value) =>
                patch({ aggregation: value === "all-v1" ? value : "any-v1" })
              }
            >
              <option value="unqualified" disabled>
                Needs interpretation review
              </option>
              <option value="any-v1">Match any definition</option>
              <option value="all-v1">Match every definition</option>
            </SelectField>
            <SelectField
              id="keyword-mode"
              label="Match action after activation"
              value={config.mode}
              onChange={(value) =>
                patch({ mode: value === "auto_add" ? value : "suggest" })
              }
            >
              <option value="suggest">Suggest for review</option>
              <option value="auto_add">
                Automatically add qualified matches
              </option>
            </SelectField>
            <SelectField
              id="keyword-cadence"
              label="Cadence"
              value={config.cadence}
              onChange={(value) =>
                patch({ cadence: value === "realtime" ? value : "end_of_day" })
              }
            >
              <option value="end_of_day">End of day</option>
              <option value="realtime">Real time</option>
            </SelectField>
            {config.cadence === "end_of_day" && (
              <LocalSchedule
                timezone={config.timezone ?? "America/New_York"}
                localMinutes={config.localMinutes ?? 480}
                onChange={patch}
              />
            )}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={config.semanticsReviewed}
                onChange={(event) =>
                  patch({ semanticsReviewed: event.target.checked })
                }
              />
              I reviewed each query and its combined interpretation.
            </label>
            <ActionButton
              primary
              disabled={
                !name.trim() ||
                !config.scope.sessionKey ||
                !config.definitions.length
              }
              onClick={() => void save()}
            >
              Save inactive rule for review
            </ActionButton>
          </fieldset>
        )}
        {row && view === "scans" && (
          <KeywordScanReview rule={row} onChanged={onSaved} />
        )}
        {row && view === "suggestions" && <KeywordSuggestions rule={row} />}
        {row && view === "delivery" && (
          <KeywordDelivery rule={row} onSaved={onSaved} />
        )}
        {(create.error || update.error) && (
          <p role="alert">{(update.error ?? create.error)?.message}</p>
        )}
      </div>
    </Modal>
  );
}
function KeywordScopeFields({
  config,
  patch,
}: {
  config: Config;
  patch: (value: Partial<Config>) => void;
}) {
  return (
    <div className={styles.form}>
      <div className={styles.filters}>
        <Field label="Jurisdiction code" htmlFor="keyword-jurisdiction">
          <TextInput
            id="keyword-jurisdiction"
            value={config.scope.jurisdiction}
            maxLength={2}
            onChange={(event) =>
              patch({
                scope: {
                  ...config.scope,
                  jurisdiction: event.target.value.toUpperCase(),
                },
              })
            }
          />
        </Field>
        <Field label="Exact session" htmlFor="keyword-session">
          <TextInput
            id="keyword-session"
            value={config.scope.sessionKey}
            maxLength={60}
            onChange={(event) =>
              patch({
                scope: { ...config.scope, sessionKey: event.target.value },
              })
            }
          />
        </Field>
      </div>
      <fieldset className={styles.form}>
        <legend>Retained source fields</legend>
        {(["title", "bill_text", "amendment_text"] as const).map((field) => (
          <label className={styles.check} key={field}>
            <input
              type="checkbox"
              checked={config.scope.fields.includes(field)}
              onChange={(event) =>
                patch({
                  scope: {
                    ...config.scope,
                    fields: event.target.checked
                      ? [...config.scope.fields, field]
                      : config.scope.fields.filter((item) => item !== field),
                  },
                })
              }
            />
            {field.replaceAll("_", " ")}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
