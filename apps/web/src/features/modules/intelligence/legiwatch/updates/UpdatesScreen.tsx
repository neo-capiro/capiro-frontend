"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { committeeDirectoryHref } from "../../../directory/public";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { PageControls } from "../components";
import styles from "../legiwatch.module.css";
import { useLegiWatchRoute } from "../use-legiwatch-route";

export function UpdatesScreen() {
  const router = useRouter();
  const route = useLegiWatchRoute(),
    [page, setPage] = useState(1),
    [unreadOnly, setUnreadOnly] = useState(false);
  const query = useCapiroQuery("legiwatch.notifications", {
    query: { page, pageSize: 25, unreadOnly },
  });
  const read = useCapiroMutation("legiwatch.notifications.read"),
    readAll = useCapiroMutation("legiwatch.notifications.readAll");
  async function mark(id?: string) {
    try {
      if (id) await read.run({ params: { id } });
      else await readAll.run({});
      query.reload();
    } catch {
      /* Error is shown below. */
    }
  }
  return (
    <>
      <div className={styles.row}>
        <div className={styles.actions}>
          <Badge>
            {query.data ? `${query.data.unread} unread` : "Notification inbox"}
          </Badge>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => {
                setUnreadOnly(event.target.checked);
                setPage(1);
              }}
            />
            Unread only
          </label>
        </div>
        <ActionButton
          disabled={!query.data?.unread || readAll.pending}
          onClick={() => void mark()}
        >
          Mark all read
        </ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        empty={
          query.data?.rows.length === 0
            ? "No notifications match this view."
            : undefined
        }
        onRetry={query.reload}
      >
        <div className={styles.list}>
          {query.data?.rows.map((notification) => (
            <article key={notification.id} className={styles.listItem}>
              <div className={styles.row}>
                <Badge tone={notification.read ? "neutral" : "success"}>
                  {notification.read ? "Read" : "Unread"}
                </Badge>
                <span className={styles.description}>
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              <strong>{notification.title}</strong>
              {notification.body && <p>{notification.body}</p>}
              <div className={styles.actions}>
                {notification.hearingId ? (
                  <ActionButton
                    onClick={() =>
                      route.navigate({
                        lw: "hearings",
                        hearingId: notification.hearingId,
                      })
                    }
                  >
                    Open hearing
                  </ActionButton>
                ) : notification.committeeSystemCode ? (
                  <ActionButton
                    onClick={() =>
                      router.push(
                        committeeDirectoryHref(
                          notification.committeeSystemCode!,
                          route.clientId,
                        ),
                      )
                    }
                  >
                    Open committee
                  </ActionButton>
                ) : null}
                {!notification.read && (
                  <ActionButton
                    disabled={read.pending}
                    onClick={() => void mark(notification.id)}
                  >
                    Mark read
                  </ActionButton>
                )}
              </div>
            </article>
          ))}
        </div>
        {query.data && (
          <PageControls
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onChange={setPage}
          />
        )}
      </StatusPanel>
      {(read.error || readAll.error) && (
        <p className={styles.error} role="alert">
          {read.error?.message ?? readAll.error?.message}
        </p>
      )}
      <div className={styles.banner}>
        <strong>Follow based updates</strong>Hearing and committee follows
        control in-app alerts. Email is a separate opt-in preference.
        <div className={styles.actions}>
          <ActionButton
            onClick={() => route.navigate({ lw: "more", lwMore: "settings" })}
          >
            Notification settings
          </ActionButton>
        </div>
      </div>
    </>
  );
}
