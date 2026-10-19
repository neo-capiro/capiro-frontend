"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";

export function LegiWatchSettings() {
  const me = useCapiroQuery("me.read", {}),
    notifications = useCapiroQuery("legiwatch.notificationPreferences", {});
  const updateMe = useCapiroMutation("me.update"),
    updateEmail = useCapiroMutation("legiwatch.notificationPreferences.update");
  const [timezone, setTimezone] = useState("America/New_York"),
    [view, setView] = useState("week"),
    [chamber, setChamber] = useState("all"),
    [email, setEmail] = useState(false),
    [success, setSuccess] = useState<string>();
  const [loadedMe, setLoadedMe] = useState(() => me.data);
  if (loadedMe !== me.data) {
    setLoadedMe(me.data);
    const prefs = me.data?.user.legiwatchPrefs;
    if (prefs) {
      setTimezone(
        typeof prefs.timezone === "string"
          ? prefs.timezone
          : "America/New_York",
      );
      setView(
        typeof prefs.defaultView === "string" ? prefs.defaultView : "week",
      );
      setChamber(typeof prefs.chamber === "string" ? prefs.chamber : "all");
    }
  }
  const [loadedNotifications, setLoadedNotifications] = useState(
    () => notifications.data,
  );
  if (loadedNotifications !== notifications.data) {
    setLoadedNotifications(notifications.data);
    if (notifications.data) setEmail(notifications.data.committeeEmailEnabled);
  }
  async function saveDisplay() {
    setSuccess(undefined);
    try {
      await updateMe.run({
        body: {
          legiwatchPrefs: {
            ...me.data?.user.legiwatchPrefs,
            timezone: timezone,
            defaultView: view,
            chamber: chamber,
          },
        },
      });
      me.reload();
      setSuccess("Display preferences saved.");
    } catch {
      /* Display the mutation error below. */
    }
  }
  async function saveEmail() {
    setSuccess(undefined);
    try {
      await updateEmail.run({ body: { committeeEmailEnabled: email } });
      notifications.reload();
      setSuccess("Committee email preference saved.");
    } catch {
      /* Display the mutation error below. */
    }
  }
  return (
    <>
      <section className={styles.card}>
        <h2>Display preferences</h2>
        <StatusPanel loading={me.loading} error={me.error} onRetry={me.reload}>
          <div className={styles.filters}>
            <SelectField
              id="lw-display-timezone"
              label="Display timezone"
              value={timezone}
              onChange={setTimezone}
            >
              <option value="America/New_York">Eastern</option>
              <option value="America/Chicago">Central</option>
              <option value="America/Denver">Mountain</option>
              <option value="America/Los_Angeles">Pacific</option>
            </SelectField>
            <SelectField
              id="lw-default-view"
              label="Default hearing view"
              value={view}
              onChange={setView}
            >
              <option value="week">Calendar</option>
              <option value="agenda">Agenda</option>
              <option value="day">Day</option>
            </SelectField>
            <SelectField
              id="lw-default-chamber"
              label="Chamber"
              value={chamber}
              onChange={setChamber}
            >
              <option value="all">All</option>
              <option value="house">House</option>
              <option value="senate">Senate</option>
              <option value="joint">Joint</option>
            </SelectField>
          </div>
          <div className={styles.actions}>
            <ActionButton
              primary
              disabled={!me.data || updateMe.pending}
              onClick={() => void saveDisplay()}
            >
              Save preferences
            </ActionButton>
          </div>
          <p className={styles.description}>
            Official event timezone remains available. Small screens use Agenda
            without overwriting the saved desktop preference.
          </p>
        </StatusPanel>
      </section>
      <section className={styles.card}>
        <h2>Committee email opt-in</h2>
        <StatusPanel
          loading={notifications.loading}
          error={notifications.error}
          onRetry={notifications.reload}
        >
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={email}
              onChange={(event) => setEmail(event.target.checked)}
              disabled={!notifications.data?.emailAddress}
            />
            Email committee updates to my signed-in account address
          </label>
          <p className={styles.description}>
            {notifications.data?.emailAddress ??
              "A usable account email is required."}{" "}
            · In-app alerts are configured per follow.
          </p>
          <div className={styles.actions}>
            <ActionButton
              disabled={
                updateEmail.pending ||
                !notifications.data ||
                (email && !notifications.data.emailAddress)
              }
              onClick={() => void saveEmail()}
            >
              Save email preference
            </ActionButton>
          </div>
        </StatusPanel>
      </section>
      {success && (
        <p role="status" className={styles.success}>
          {success}
        </p>
      )}
      {(updateMe.error || updateEmail.error) && (
        <p role="alert" className={styles.error}>
          {updateMe.error?.message ?? updateEmail.error?.message}
        </p>
      )}
    </>
  );
}
