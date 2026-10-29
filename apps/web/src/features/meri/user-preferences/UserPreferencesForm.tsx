"use client";
import { useState } from "react";
import {
  USER_PREFERENCE_THEMES,
  USER_PREFERENCE_DENSITIES,
  type UserPreferences,
  type UserPreferencesResponse,
} from "@capiro/meri-client/user-preferences";
import styles from "./user-preferences.module.css";
import { TimezonePreview } from "./TimezonePreview";
import { DefaultClientField } from "./DefaultClientField";
import { ModelSelectionPicker } from "../model-selection/ModelSelectionPicker";
import {
  selectionAvailable,
  selectionLabel,
} from "../model-selection/model-selection";

/** Complete received document stays intact; this form edits only the exposed fields. */
export function UserPreferencesForm({
  document,
  editable,
  save,
}: {
  document: UserPreferencesResponse;
  editable: boolean;
  save: (preferences: UserPreferences) => void;
}) {
  const [draft, setDraft] = useState(document.preferences);
  const [timezone, setTimezone] = useState(document.preferences.timezone ?? "");
  return (
    <form
      className={styles.panel}
      data-theme={draft.theme}
      data-density={draft.density}
      onSubmit={(event) => {
        event.preventDefault();
        if (
          editable &&
          selectionAvailable(document.modelCatalog, draft.defaultModel)
        )
          save({ ...draft, timezone: timezone.trim() || null });
      }}
    >
      <h2>Personal settings</h2>
      <p>
        Saved revision {document.revision}. Appearance and density are previewed
        only in this panel.
      </p>
      <fieldset disabled={!editable} className={styles.fields}>
        <legend>Conversation defaults, panel preview and timezone</legend>
        <DefaultClientField
          value={draft.defaultClientId}
          onChange={(defaultClientId) =>
            setDraft({ ...draft, defaultClientId })
          }
          disabled={!editable}
        />
        <ModelSelectionPicker
          catalog={document.modelCatalog}
          value={draft.defaultModel}
          onChange={(defaultModel) => setDraft({ ...draft, defaultModel })}
          disabled={!editable}
          label="Default model"
          defaultDescription={`Configured default: ${selectionLabel(document.modelCatalog, document.modelCatalog.defaultSelection)}. Applies to new conversations; existing conversations keep their admitted model.`}
        />
        <AppearanceFields
          draft={draft}
          setDraft={setDraft}
          timezone={timezone}
          setTimezone={setTimezone}
        />
        <button
          type="submit"
          disabled={
            !selectionAvailable(document.modelCatalog, draft.defaultModel)
          }
        >
          Save personal preferences
        </button>
      </fieldset>
      <p>
        Other stored settings and notification delivery choices are preserved.
      </p>
    </form>
  );
}

/** Appearance deliberately affects this preview panel; other stored fields survive. */
function AppearanceFields({
  draft,
  setDraft,
  timezone,
  setTimezone,
}: {
  draft: UserPreferences;
  setDraft: (value: UserPreferences) => void;
  timezone: string;
  setTimezone: (value: string) => void;
}) {
  return (
    <>
      <label>
        Theme
        <select
          value={draft.theme}
          onChange={(event) =>
            setDraft({
              ...draft,
              theme: event.target.value as UserPreferences["theme"],
            })
          }
        >
          {USER_PREFERENCE_THEMES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        Density
        <select
          value={draft.density}
          onChange={(event) =>
            setDraft({
              ...draft,
              density: event.target.value as UserPreferences["density"],
            })
          }
        >
          {USER_PREFERENCE_DENSITIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        Timezone
        <input
          value={timezone}
          placeholder="Use tenant default"
          onChange={(event) => setTimezone(event.target.value)}
          aria-describedby="preferences-timezone-help"
          maxLength={64}
        />
      </label>
      <p id="preferences-timezone-help">
        A canonical IANA timezone, such as America/New_York. Leave empty to use
        the tenant default.
      </p>
      <TimezonePreview timezone={timezone} />
    </>
  );
}
