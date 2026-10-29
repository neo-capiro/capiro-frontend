"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UserPreferencesOwner } from "@capiro/meri-client/user-preferences";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { userPreferencesJournal } from "../../../shared/meri-user-preferences/journal";
import { UserPreferencesController } from "../../../shared/meri-user-preferences/controller";
import { userPreferencesTransport } from "../../../shared/meri-user-preferences/transport";
import { SettingsLayout } from "../screens/settings/SettingsLayout";
import type { SettingsChrome } from "../screens/settings/settings-view";
import { PreferenceSupportCard } from "./PreferenceSupportCard";
import { UserPreferencesForm } from "./UserPreferencesForm";
import { toast, Toaster } from "@capiro/ui/sonner";
import ui from "../ui/meri-ui.module.css";
import styles from "./user-preferences.module.css";

/** Personal settings use the independently verified Core actor, never Clerk's subject. */
export function UserPreferencesHost({ chrome }: { chrome: SettingsChrome }) {
  const identity = useCapiroQuery("me.read", {});
  const owner = useMemo(
    () =>
      identity.data
        ? { tenantId: identity.data.tenant.id, actorId: identity.data.user.id }
        : null,
    [identity.data],
  );
  return (
    <SettingsLayout
      chrome={{
        ...chrome,
        notice: {
          title: "Personal Meri preferences",
          detail:
            "Personal model and client defaults, panel appearance and timezone settings are connected.",
        },
      }}
      heading={{
        title: "Personal preferences",
        description: "Your revisioned personal Meri settings.",
      }}
      primary={
        owner && !identity.loading && !identity.error ? (
          <OwnedPreferences key={JSON.stringify(owner)} owner={owner} />
        ) : (
          <p role="status">
            {identity.error
              ? "Current account could not be verified. Personal preferences are unavailable."
              : "Verifying your current account."}
          </p>
        )
      }
      supporting={
        <PreferenceSupportCard select={chrome.select} nav={chrome.nav} />
      }
    />
  );
}

function OwnedPreferences({ owner }: { owner: UserPreferencesOwner }) {
  const client = useQueryClient();
  const [controller] = useState(() => {
    const journal = userPreferencesJournal(client, owner);
    return new UserPreferencesController(
      owner,
      userPreferencesTransport(owner, journal.current),
      journal,
    );
  });
  useEffect(() => controller.attach(), [controller]);
  return (
    <>
      <PreferencesView controller={controller} />
      <Toaster />
    </>
  );
}

function PreferencesView({
  controller,
}: {
  controller: UserPreferencesController;
}) {
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  return (
    <section aria-label="Personal Meri preferences" className={styles.workflow}>
      <p role="status" aria-live="polite">
        {view.message}
      </p>
      {view.document ? (
        <UserPreferencesForm
          key={`${view.status}:${view.document.revision}`}
          document={view.document}
          editable={view.status === "ready"}
          save={(preferences) => {
            void controller.save(preferences).then(() => {
              if (controller.snapshot().status === "saved")
                toast.success(
                  "Save accepted. Check current preferences to confirm.",
                );
            });
          }}
        />
      ) : null}
      {view.status === "ready" && view.document ? (
        <div>
          <button
            type="button"
            className={ui.outline}
            onClick={() => void controller.resetPersonalDefaults()}
          >
            Reset conversation and panel defaults
          </button>
          <p>
            Restores the configured model, asks for a conversation scope, and
            resets the system theme, comfortable density and default timezone
            through a revision-checked save. Notification choices are preserved.
          </p>
        </div>
      ) : null}
      {view.status !== "access-lost" &&
      view.status !== "saving" &&
      view.status !== "loading" ? (
        <button
          type="button"
          className={ui.outline}
          onClick={() => {
            void controller.load();
          }}
        >
          {view.status === "conflict"
            ? "Reload current preferences"
            : ["saved", "unknown", "result-withheld"].includes(view.status)
              ? "Check current preferences"
              : "Load current preferences"}
        </button>
      ) : null}
      {["unknown", "result-withheld"].includes(view.status) && view.document ? (
        <button
          type="button"
          className={ui.outline}
          onClick={() => controller.adoptCurrent()}
        >
          Use current saved preferences
        </button>
      ) : null}
    </section>
  );
}
