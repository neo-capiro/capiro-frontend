"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UserPreferencesOwner } from "@capiro/meri-client/user-preferences";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { userPreferencesJournal } from "../../../shared/meri-user-preferences/journal";
import { UserPreferencesController } from "../../../shared/meri-user-preferences/controller";
import { userPreferencesTransport } from "../../../shared/meri-user-preferences/transport";
import { SettingsLayout } from "../screens/settings/SettingsLayout";
import { SettingsCard } from "../screens/settings/SettingsCard";
import { SettingsFields } from "../screens/settings/SettingsFields";
import type { SettingsChrome } from "../screens/settings/settings-view";
import { unavailablePreferences } from "../screens/settings/preferences-unavailable";
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
            "Personal model defaults, appearance and timezone settings are connected. Other Meri settings remain unavailable.",
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
        <SettingsCard
          title="Additional preferences unavailable"
          description="These design controls have no connected preference contract."
        >
          <fieldset
            disabled
            className={styles.unsupported}
            aria-label="Additional settings unavailable"
          >
            <SettingsFields
              fields={unavailablePreferences.personal.defaults.fields}
              mode="inactive"
            />
            <SettingsFields
              fields={unavailablePreferences.personal.accessibility.fields}
              mode="inactive"
            />
          </fieldset>
        </SettingsCard>
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
            Reset model and panel defaults
          </button>
          <p>
            Restores the configured model, system theme, comfortable density and
            default timezone through a revision-checked save. Notification
            choices and the stored default client are preserved.
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
