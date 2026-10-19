"use client";
import { useEffect } from "react";
import {
  openHeaderOverlay,
  type HeaderOverlay,
} from "../../../../shared/shell/header-overlays";
import ui from "../../ui/meri-ui.module.css";
import { SettingsCard } from "./SettingsCard";
import { SettingsFields } from "./SettingsFields";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import type {
  SettingsChrome,
  SettingsField,
  SettingsHeading,
  SettingsNotice,
  SettingsOutcome,
} from "./settings-view";

export type NotificationsAccountView = {
  heading: SettingsHeading;
  updates: {
    title: string;
    description: string;
    fields: readonly SettingsField[];
    notice: SettingsNotice;
  };
  account: {
    title: string;
    description: string;
    fields: readonly SettingsField[];
  };
  empty: SettingsNotice;
};

/**
 * 09.05 Notifications and account menu. The Updates panel and Account menu are the
 * header's own overlays, so this page opens them rather than drawing a second copy.
 */
export function NotificationsAccountScreen({
  chrome,
  view,
  outcome,
  overlayOnLoad,
}: {
  chrome: SettingsChrome;
  view: NotificationsAccountView;
  outcome?: SettingsOutcome | undefined;
  /** Fixture state: a header overlay is open when the page loads. */
  overlayOnLoad?: HeaderOverlay | undefined;
}) {
  useEffect(() => {
    if (overlayOnLoad) openHeaderOverlay(overlayOnLoad);
  }, [overlayOnLoad]);
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      outcome={outcome}
      primary={
        <SettingsCard
          title={view.updates.title}
          description={view.updates.description}
        >
          <SettingsFields fields={view.updates.fields} mode="inactive" />
          <SettingsCallout notice={view.updates.notice} />
          <button
            type="button"
            className={ui.primary}
            aria-haspopup="dialog"
            disabled={!chrome.headerOverlays}
            title={chrome.headerOverlays ? undefined : chrome.unavailable}
            onClick={() => openHeaderOverlay("updates")}
          >
            Preview Updates panel
          </button>
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCard
            title={view.account.title}
            description={view.account.description}
            emphasis
          >
            <SettingsFields fields={view.account.fields} mode="inactive" />
            <button
              type="button"
              className={ui.outline}
              aria-haspopup="menu"
              disabled={!chrome.headerOverlays}
              title={chrome.headerOverlays ? undefined : chrome.unavailable}
              onClick={() => openHeaderOverlay("account")}
            >
              Open profile menu
            </button>
          </SettingsCard>
          <SettingsCallout notice={view.empty} />
        </>
      }
    />
  );
}
