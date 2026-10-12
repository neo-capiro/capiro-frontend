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
      {groupActivityDays(rows, zone).map((group, index) => (
        <section
          key={`${group.day}:${index}`}
          aria-label={activityDayLabel(group.day, today)}
        >
          <h3 className={styles.dateHeading}>
            {activityDayLabel(group.day, today)}
          </h3>
          <ol className={styles.timeline}>
            {group.items.map((item) => (
              <ActivityRow
                key={item.id}
                clientId={clientId}
                item={item}
                zone={zone}
                expanded={expanded}
                onFallbackFocus={onFallbackFocus}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ActivityRow({
  clientId,
  item,
  zone,
  expanded,
  onFallbackFocus,
}: {
  clientId: string;
  item: Activity;
  zone: string;
  expanded: boolean;
  onFallbackFocus: () => void;
}) {
  const kind = activityKindPresentation(item.kind);
  return (
    <li className={styles.activityRow}>
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
      <div className={styles.activityContent}>
        <div className={styles.activityHeading}>
          <strong>{item.title}</strong>
          <div className={styles.activityMeta}>
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
            <ActivityActions
              clientId={clientId}
              item={item}
              onFallbackFocus={onFallbackFocus}
            />
          </div>
        </div>
        <small className={styles.activityKind}>{item.kind}</small>
        {item.body && <p className={styles.body}>{item.body}</p>}
        {item.origin === "derived" &&
          item.kind === "email" &&
          item.sourceType === "mail_thread" &&
          item.sourceId &&
          z.uuid().safeParse(item.sourceId).success && (
            <TimelineMailThread clientId={clientId} threadId={item.sourceId} />
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
      </div>
    </li>
  );
}
