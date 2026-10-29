"use client";
import Link from "next/link";
import { useEffect } from "react";
import {
  openHeaderOverlay,
  type HeaderOverlay,
} from "../../../../shared/shell/header-overlays";
import { NotificationsHost } from "../../notifications/NotificationsHost";
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
 * 09.05 Notifications and account menu.
 *
 * When the fixture header supplies the Updates panel and Account menu overlays,
 * this page opens those overlays as the design reference shows. Otherwise the page
 * is the live Updates surface: real revisioned notification preferences over
 * observed rows, and a real account route instead of a preview control.
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
          {chrome.headerOverlays ? (
            <>
              <SettingsFields fields={view.updates.fields} mode="inactive" />
              <SettingsCallout notice={view.updates.notice} />
              <button
                type="button"
                className={ui.primary}
                aria-haspopup="dialog"
                onClick={() => openHeaderOverlay("updates")}
              >
                Preview Updates panel
              </button>
            </>
          ) : (
            <NotificationsHost unavailable={chrome.unavailable} />
          )}
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCard
            title={view.account.title}
            description={view.account.description}
            emphasis
          >
            {chrome.headerOverlays ? (
              <>
                <SettingsFields fields={view.account.fields} mode="inactive" />
                <button
                  type="button"
                  className={ui.outline}
                  aria-haspopup="menu"
                  onClick={() => openHeaderOverlay("account")}
                >
                  Open profile menu
                </button>
              </>
            ) : (
              <Link className={ui.outline} href="/settings/personal">
                Open account settings
              </Link>
            )}
          </SettingsCard>
          {chrome.headerOverlays ? (
            <SettingsCallout notice={view.empty} />
          ) : null}
        </>
      }
    />
  );
}
