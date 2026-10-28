"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  UserPreferences,
  UserPreferencesOwner,
} from "@capiro/meri-client/user-preferences";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { createRunsClient } from "../../../shared/meri-runs/client";
import { userPreferencesJournal } from "../../../shared/meri-user-preferences/journal";
import { UserPreferencesController } from "../../../shared/meri-user-preferences/controller";
import { userPreferencesTransport } from "../../../shared/meri-user-preferences/transport";
import { createMemoryNotificationsClient } from "../../../shared/meri-notifications/memory-client";
import {
  applyNotificationPreference,
  projectUpdates,
  type NotificationPreferenceKey,
  type ProjectedNotice,
} from "../../../shared/meri-notifications/projection";
import { runRecordHref } from "../runs/RunRecord";
import { NotificationCategoryControls } from "./NotificationCategoryControls";
import { useUpdatesFeed } from "./useUpdatesFeed";
import { useMemoryNotificationActions } from "./useMemoryNotificationActions";
import ui from "../ui/meri-ui.module.css";
import styles from "./notifications.module.css";

/**
 * Live Updates consumer. Identity comes from the independently read Core actor,
 * rows come from the existing Core notification read and the existing run-index
 * read, and optional presentation comes from the saved canonical preferences.
 *
 * No row is rendered while the current account is being verified, so a superseded
 * or failed identity can never keep another account's rows on screen.
 */
export function NotificationsHost({ unavailable }: { unavailable: string }) {
  const identity = useCapiroQuery("me.read", {});
  const owner: UserPreferencesOwner | null = useMemo(
    () =>
      identity.data
        ? { tenantId: identity.data.tenant.id, actorId: identity.data.user.id }
        : null,
    [identity.data],
  );
  // A cached me.read result can outlive an account change or a failed re-read.
  // While the current account is unverified, no owned row is mounted: the surface
  // refuses instead of presenting another account's retained rows. A background
  // refetch that still has data (loading false, no error) keeps the rows mounted.
  if (!owner || identity.loading || identity.error)
    return (
      <p role="status">
        {identity.error
          ? "Your current account could not be verified, so updates and notification preferences are unavailable."
          : "Verifying your current account."}
      </p>
    );
  return (
    <OwnedUpdates
      key={`${owner.tenantId}:${owner.actorId}`}
      owner={owner}
      unavailable={unavailable}
    />
  );
}

function OwnedUpdates({
  owner,
  unavailable,
}: {
  owner: UserPreferencesOwner;
  unavailable: string;
}) {
  const client = useQueryClient();
  const selected = useSelectedClient();
  const [controller] = useState(() => {
    const journal = userPreferencesJournal(client, owner);
    return new UserPreferencesController(
      owner,
      userPreferencesTransport(owner, journal.current),
      journal,
    );
  });
  const [denied, setDenied] = useState(false);
  const [action, setAction] = useState("");
  // A lifetime fence, not rendered state. The client factories only store these
  // callbacks and invoke them after an await; construction reads nothing, so the
  // ref is never read during render.
  const alive = useRef(true);
  const isCurrent = useCallback(() => alive.current, []);
  const onAccessLost = useCallback(() => {
    alive.current = false;
    setDenied(true);
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const runsClient = useMemo(
    // eslint-disable-next-line react-hooks/refs -- the factory stores the fence callbacks; it does not read them during render
    () => createRunsClient(isCurrent, onAccessLost),
    [isCurrent, onAccessLost],
  );
  const notificationsClient = useMemo(
    // eslint-disable-next-line react-hooks/refs -- the factory stores the fence callbacks; it does not read them during render
    () => createMemoryNotificationsClient(isCurrent, onAccessLost),
    [isCurrent, onAccessLost],
  );
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : null;
  // One feed per account lifetime; the scope is a primitive, so an ordinary
  // re-render never recreates the feed and never re-reads.
  const { snapshot, loadMore, refresh, release } = useUpdatesFeed({
    ownerKey: `${owner.tenantId}:${owner.actorId}`,
    clientId,
    notificationsClient,
    runsClient,
    isCurrent,
    onAccessLost,
  });
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  const notificationActions = useMemoryNotificationActions(
    refresh,
    onAccessLost,
  );
  // Reattachment may repeat this read; an earlier aborted generation remains
  // fenced. Ordinary renders do not reload and no write is replayed.
  useEffect(() => {
    const detach = controller.attach();
    void controller.load();
    return detach;
  }, [controller]);
  // A lost preferences lifetime retires the rows too: nothing read under a closed
  // account lifetime may stay visible. The retired state is derived in render
  // (`view.status === "access-lost"`), so this effect performs no setState.
  useEffect(() => {
    if (view.status !== "access-lost") return;
    alive.current = false;
    release();
  }, [view.status, release]);

  const projection = useMemo(
    () =>
      projectUpdates({
        notifications:
          snapshot.notifications.state === "observed"
            ? { state: "observed", page: snapshot.notifications.value }
            : snapshot.notifications.state === "loading"
              ? { state: "loading", page: null }
              : { state: "unavailable", page: null },
        runs:
          snapshot.runs.state === "observed"
            ? { state: "observed", runs: snapshot.runs.value }
            : snapshot.runs.state === "loading"
              ? { state: "loading", runs: [] }
              : { state: "unavailable", runs: [] },
        preferences: view.document?.preferences ?? null,
      }),
    [snapshot, view.document],
  );

  if (denied || view.status === "access-lost")
    return (
      <p role="alert">
        Update access was denied or your account lifetime changed. Reload this
        page to check current access; no earlier rows are kept.
      </p>
    );

  async function change(key: NotificationPreferenceKey, value: boolean) {
    const captured = controller.snapshot();
    if (!captured.document) return;
    if (captured.status === "saved") {
      // A successful save is confirmed by a read-back, not by the write. This
      // deliberate change waits for that read and then saves against the fresh
      // revision; the earlier write is never replayed.
      setAction("Checking current preferences before applying this change.");
      await controller.load();
      const after = controller.snapshot();
      if (after.status !== "ready" || !after.document) {
        setAction(after.message);
        return;
      }
      await controller.save(
        applyNotificationPreference(
          after.document.preferences as UserPreferences,
          key,
          value,
        ),
      );
    } else {
      await controller.save(
        applyNotificationPreference(
          captured.document.preferences as UserPreferences,
          key,
          value,
        ),
      );
    }
    setAction(controller.snapshot().message);
  }

  const editable =
    (view.status === "ready" || view.status === "saved") &&
    view.document !== null;
  const count = projection.notices.length;
  return (
    <section aria-label="Meri updates" className={styles.panel}>
      {/* The owner scan is bounded, so this count is a recent observation of a
          limited set and never a complete unread total. */}
      <p role="status">
        {notificationActions.unread.loading
          ? "Checking unread memory reviews."
          : notificationActions.unread.error
            ? "Unread memory-review count is unavailable."
            : notificationActions.unread.data?.enabled
              ? `Recent check found ${notificationActions.unread.data.count} unread memory-review ${notificationActions.unread.data.count === 1 ? "notification" : "notifications"}. Older unread notifications may not be included.`
              : "Memory-review notifications are not enabled."}
      </p>
      {notificationActions.error && (
        <p role="alert">
          The read acknowledgement could not be confirmed. Unread status is
          preserved; refresh to check the current result.
        </p>
      )}
      <p role="status" aria-live="polite">
        {projection.state === "loading"
          ? "Loading updates from their owners."
          : projection.state === "unavailable"
            ? "No source could verify updates. This is not an empty list."
            : projection.state === "partial"
              ? `Showing ${count} observed ${count === 1 ? "update" : "updates"}. At least one source is unverified, so this is a partial page.`
              : projection.state === "unverified"
                ? `${projection.withheldOptional} optional ${projection.withheldOptional === 1 ? "update is" : "updates are"} withheld until your saved preferences are verified.`
                : projection.state === "suppressed"
                  ? `${projection.withheldOptional} optional ${projection.withheldOptional === 1 ? "update is" : "updates are"} withheld by your saved notification preferences. Mandatory notices are never withheld.`
                  : projection.state === "empty"
                    ? "Every source answered and nothing was observed. This reports what was observed, not a global caught-up count."
                    : `Showing ${count} observed ${count === 1 ? "update" : "updates"}.`}
      </p>
      {snapshot.refreshing ? (
        <p role="note">
          Verifying updates for the selected client. The previously verified
          rows are kept until that read settles.
        </p>
      ) : !snapshot.scopeVerified && projection.state !== "loading" ? (
        <p role="note">
          Updates for the selected client could not be verified; only the
          previously verified scope is shown.
        </p>
      ) : null}
      {projection.withheldReason === "preferences-unverified" ? (
        <p role="note">
          Your saved notification preferences are not verified yet, so optional
          notices are withheld. This is not a stored preference withholding
          them.
        </p>
      ) : null}
      {projection.memoryNotifications === "not-enabled" ? (
        <p role="note">
          Memory-review notifications are not enabled for this workspace, so
          none are shown here.
        </p>
      ) : projection.memoryNotifications === "unavailable" ? (
        <p role="note">
          Memory-review notices could not be verified. Any pending approval
          request remains accessible in the memory review surface.
        </p>
      ) : null}
      {projection.runOutcomes === "unavailable" ? (
        <p role="note">
          Recent run states could not be read, so run notices are missing from
          this list.
        </p>
      ) : null}
      <ul className={styles.rows} aria-label="Observed updates">
        {projection.notices.map((notice) => (
          <NoticeRow
            key={notice.id}
            notice={notice}
            clientId={clientId}
            markRead={(id) => void notificationActions.markRead(id)}
            readDisabled={
              notificationActions.pending ||
              notificationActions.unread.data?.enabled !== true
            }
          />
        ))}
      </ul>
      {snapshot.moreError ? <p role="alert">{snapshot.moreError}</p> : null}
      {notificationActions.unread.data?.enabled ? (
        <p className={styles.meta}>
          {notificationActions.unread.data.count === 0
            ? "The recent check found no unread memory-review notifications in the set it observed. A row above marked not read was unread before that check, so acknowledge it with its own Mark read action."
            : "Mark recent memory reviews read acknowledges only the set the recent check observed. Older unread notifications can remain and are acknowledged from their own row."}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.outline}
          disabled={
            notificationActions.pending ||
            notificationActions.unread.data?.enabled !== true ||
            notificationActions.unread.data.count === 0
          }
          onClick={() => void notificationActions.markRead(null)}
        >
          Mark recent memory reviews read
        </button>
        {projection.nextCursor ? (
          <button
            type="button"
            className={ui.outline}
            onClick={() => void loadMore()}
          >
            Load more updates
          </button>
        ) : null}
        <button
          type="button"
          className={ui.outline}
          onClick={() => {
            notificationActions.refreshCount();
            void refresh();
          }}
        >
          Refresh updates
        </button>
        <button
          type="button"
          className={ui.outline}
          disabled={view.status === "loading" || view.status === "saving"}
          onClick={() =>
            void controller
              .load()
              .then(() => setAction(controller.snapshot().message))
          }
        >
          {view.status === "conflict"
            ? "Reload current preferences"
            : ["saved", "unknown", "result-withheld"].includes(view.status)
              ? "Check current preferences"
              : "Load current preferences"}
        </button>
        {["unknown", "result-withheld"].includes(view.status) &&
        view.document ? (
          <button
            type="button"
            className={ui.outline}
            onClick={() => {
              controller.adoptCurrent();
              setAction(controller.snapshot().message);
            }}
          >
            Use current saved preferences
          </button>
        ) : null}
      </div>
      <p role="status" aria-live="polite">
        {action || view.message}
      </p>
      {view.document ? (
        <NotificationCategoryControls
          preferences={view.document.preferences}
          editable={editable}
          unavailable={view.message || unavailable}
          onChange={(key, value) => void change(key, value)}
        />
      ) : null}
      <p className={styles.meta}>
        Revisioned preferences are saved once with the captured revision and
        read back to confirm the stored value. These switches govern optional
        in-app notices only; Core keeps its event log, approvals and
        obligations.
      </p>
    </section>
  );
}

function NoticeRow({
  notice,
  clientId,
  markRead,
  readDisabled,
}: {
  notice: ProjectedNotice;
  clientId: string | null;
  markRead: (id: string) => void;
  readDisabled: boolean;
}) {
  return (
    <li className={styles.row} data-source={notice.source}>
      <div className={styles.rowHead}>
        <span>{notice.title}</span>
        {notice.delivery === "required" ? (
          <span className={styles.required}>Required in-app notice</span>
        ) : null}
      </div>
      <p className={styles.meta}>{notice.detail}</p>
      <p className={styles.meta}>
        {notice.occurredAt}
        {notice.read === null
          ? " · no per-row read record"
          : notice.read
            ? " · read"
            : " · not read"}
      </p>
      {notice.run ? (
        <Link href={runRecordHref(notice.run, clientId)}>Open run</Link>
      ) : null}
      {notice.reviewRequestId && (
        <Link href={`/meri/memory/review/${notice.reviewRequestId}`}>
          Open memory review
        </Link>
      )}
      {notice.source === "memory-review" && notice.read === false && (
        <button
          type="button"
          className={ui.outline}
          disabled={readDisabled}
          onClick={() => markRead(notice.id.slice("memory-review:".length))}
        >
          Mark read
        </button>
      )}
    </li>
  );
}
