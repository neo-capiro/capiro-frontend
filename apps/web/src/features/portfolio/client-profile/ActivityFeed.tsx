"use client";
/* eslint-disable @next/next/no-img-element -- Exact local 16px Figma SVG exports. */
import Link from "next/link";
import { z } from "zod";
import { TimelineMailThread } from "@/features/portfolio/relationships/thread/public";
import { instantDay } from "@/shared/portfolio/date/civil";
import type { Activity } from "./contracts";
import { ActivityActions } from "./ActivityActions";
import {
  activityDayLabel,
  activityKindDisplay,
  activityKindPresentation,
  groupActivityDays,
} from "./activity-presentation";
import styles from "./overview.module.css";

export function ActivityFeed({
  clientId,
  rows,
  zone,
  expanded,
  onFallbackFocus,
}: {
  clientId: string;
  rows: Activity[];
  zone: string;
  expanded: boolean;
  onFallbackFocus: () => void;
}) {
  const today = instantDay(new Date().toISOString(), zone);
  return (
    <div className={expanded ? styles.expandedFeed : styles.activityFeed}>
      <ol className={styles.timeline}>
        {groupActivityDays(rows, zone).flatMap((group) =>
          group.items.map((item, index) => (
            <ActivityRow
              key={item.id}
              clientId={clientId}
              item={item}
              dayLabel={
                index === 0 ? activityDayLabel(group.day, today) : undefined
              }
              zone={zone}
              expanded={expanded}
              onFallbackFocus={onFallbackFocus}
            />
          )),
        )}
      </ol>
    </div>
  );
}

function ActivityRow({
  clientId,
  item,
  dayLabel,
  zone,
  expanded,
  onFallbackFocus,
}: {
  clientId: string;
  item: Activity;
  dayLabel?: string;
  zone: string;
  expanded: boolean;
  onFallbackFocus: () => void;
}) {
  const kind = activityKindPresentation(item.kind);
  const occurred = (
    <time
      dateTime={item.occurredAt}
      title={new Date(item.occurredAt).toLocaleString(undefined, {
        timeZone: zone,
      })}
    >
      {new Date(item.occurredAt).toLocaleTimeString(undefined, {
        timeZone: zone,
        hour: "numeric",
        minute: "2-digit",
      })}
    </time>
  );
  return (
    <li className={styles.activityItem}>
      {dayLabel && <h3 className={styles.dateHeading}>{dayLabel}</h3>}
      <div className={styles.activityRow}>
        <span className={styles.activityIcon} aria-hidden="true">
          {expanded && kind.icon ? (
            <img
              src={`/design/remaining-profile/${kind.icon}.svg`}
              width={16}
              height={16}
              alt=""
            />
          ) : (
            kind.glyph
          )}
        </span>
        <div
          className={styles.activityContent}
          title={
            item.origin !== "recorded"
              ? "Open the original record to change this activity"
              : undefined
          }
        >
          <div className={styles.activityHeading}>
            <strong>{item.title}</strong>
            {!expanded && (
              <div className={styles.activityMeta}>
                {occurred}
                <ActivityActions
                  clientId={clientId}
                  item={item}
                  onFallbackFocus={onFallbackFocus}
                />
              </div>
            )}
          </div>
          {!expanded && (
            <small className={styles.activityKind}>{activityKindDisplay(item.kind)}</small>
          )}
          {item.body && <p className={styles.body}>{item.body}</p>}
          {(item.direction || item.counterparty) && (
            <small className={styles.activityDue}>
              {item.direction === "we_owe"
                ? "We owe"
                : item.direction === "they_owe"
                  ? "They owe"
                  : "Counterparty"}
              {item.counterparty ? ` · ${item.counterparty}` : ""}
            </small>
          )}
          {item.objective && (
            <small className={styles.activityDue}>
              {item.objective.availability === "current" ? (
                <Link
                  href={`/portfolio/${encodeURIComponent(clientId)}/objectives?objective=${encodeURIComponent(item.objective.objectiveId)}`}
                >
                  Open linked objective ↗
                </Link>
              ) : item.objective.availability === "changed" ? (
                "Linked Objective changed since this log"
              ) : (
                "Linked Objective unavailable"
              )}
            </small>
          )}
          {expanded && (
            <div className={styles.expandedMeta}>
              <small className={styles.activityKind}>{activityKindDisplay(item.kind)}</small>
              {occurred}
              {item.pinned && <small>★ Pinned</small>}
            </div>
          )}
          {!expanded &&
            item.origin === "derived" &&
            item.kind === "email" &&
            item.sourceType === "mail_thread" &&
            item.sourceId &&
            z.uuid().safeParse(item.sourceId).success && (
              <TimelineMailThread
                clientId={clientId}
                threadId={item.sourceId}
              />
            )}
          {item.dueAt && (
            <small className={styles.activityDue}>
              {item.settledAt ? "Settled " : "Due "}
              <time dateTime={item.settledAt ?? item.dueAt}>
                {new Date(item.settledAt ?? item.dueAt).toLocaleString()}
              </time>
            </small>
          )}
          {item.sourceType === "meeting" && item.sourceId && (
            <Link
              className="muted"
              href={`/portfolio/${clientId}/calendar?meeting=${encodeURIComponent(item.sourceId)}`}
            >
              Open meeting ↗
            </Link>
          )}
          {item.sourceType === "attachment" && item.sourceId && (
            <Link
              className="muted"
              href={`/portfolio/${clientId}/files?file=${encodeURIComponent(item.sourceId)}`}
            >
              Open file ↗
            </Link>
          )}
          {item.sourceType === "outreach" &&
            z.uuid().safeParse(item.sourceId).success &&
            z.uuid().safeParse(clientId).success && (
              <Link
                className="muted"
                href={`/modules/engagement?clientId=${clientId}&draft=${item.sourceId}`}
              >
                Open outreach ↗
              </Link>
            )}
        </div>
      </div>
    </li>
  );
}
