"use client";
import { useRef, useState } from "react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import { ConfirmActions } from "./ConfirmActions";
import { ChoiceGroup } from "./SettingsControls";
import { SettingsCard } from "./SettingsCard";
import { SettingsFields } from "./SettingsFields";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import type {
  SettingsChrome,
  SettingsField,
  SettingsHeading,
  SettingsLink,
  SettingsNotice,
  SettingsOutcome,
} from "./settings-view";

export type PersonalPreferencesView = {
  heading: SettingsHeading;
  defaults: { title: string; fields: readonly SettingsField[] };
  appearance: {
    title: string;
    description: string;
    options: readonly string[];
    initial: string;
    /** Preview callout for each option. */
    previews: Readonly<Record<string, SettingsNotice>>;
  };
  accessibility: {
    title: string;
    fields: readonly SettingsField[];
    links: readonly SettingsLink[];
  };
  clear: { title: string; description: string; confirm: string };
};

/** 09.01 Personal preferences, with the Clear personal defaults? confirmation. */
export function PersonalPreferencesScreen({
  chrome,
  view,
  outcome,
  clearOpen = false,
}: {
  chrome: SettingsChrome;
  view: PersonalPreferencesView;
  outcome?: SettingsOutcome | undefined;
  /** Fixture state: the confirmation is open when the page loads. */
  clearOpen?: boolean;
}) {
  const [confirming, setConfirming] = useState(clearOpen);
  const clearButton = useRef<HTMLButtonElement>(null);
  const fieldMode = chrome.localDrafts ? "editable" : "inactive";
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      outcome={outcome}
      primary={
        <SettingsCard title={view.defaults.title}>
          <SettingsFields fields={view.defaults.fields} mode={fieldMode} />
          <div className={ui.row}>
            <button
              type="button"
              className={ui.primary}
              disabled
              title={chrome.unavailable}
            >
              Save preferences
            </button>
            <button
              ref={clearButton}
              type="button"
              className={ui.outline}
              disabled={!chrome.localDrafts}
              title={chrome.localDrafts ? undefined : chrome.unavailable}
              onClick={() => setConfirming(true)}
            >
              Clear personal defaults
            </button>
          </div>
        </SettingsCard>
      }
      supporting={
        <>
          <AppearanceCard appearance={view.appearance} />
          <SettingsCard title={view.accessibility.title}>
            <SettingsFields
              fields={view.accessibility.fields}
              mode={fieldMode}
            />
            <div className={ui.row}>
              {view.accessibility.links.map((link) => (
                <LinkAction
                  key={link.label}
                  variant="outline"
                  href={link.href}
                  unavailable={chrome.unavailable}
                >
                  {link.label}
                </LinkAction>
              ))}
            </div>
          </SettingsCard>
          <MeriDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={view.clear.title}
            description={view.clear.description}
            width="compact"
            returnFocus={clearButton}
          >
            <ConfirmActions
              confirm={view.clear.confirm}
              unavailable={chrome.unavailable}
              onCancel={() => setConfirming(false)}
            />
          </MeriDialog>
        </>
      }
    />
  );
}

/** Appearance preview: choosing an option changes only this page's preview callout. */
function AppearanceCard({
  appearance,
}: {
  appearance: PersonalPreferencesView["appearance"];
}) {
  const [choice, setChoice] = useState(appearance.initial);
  const preview = appearance.previews[choice];
  return (
    <SettingsCard title={appearance.title} description={appearance.description}>
      <ChoiceGroup
        label="Appearance preview"
        options={appearance.options}
        value={choice}
        onChange={setChoice}
      />
      {preview ? <SettingsCallout notice={preview} /> : null}
    </SettingsCard>
  );
}
