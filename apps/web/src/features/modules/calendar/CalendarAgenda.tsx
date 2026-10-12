"use client";
import Link from "next/link";
import type { EngagementMeeting } from "../../../shared/capiro/operations/engagement";
import { safeAgendaHref, type AgendaItem } from "./agenda";
import { EffectiveDateDetails } from "../../../shared/federal-register/EffectiveDateDetails";
import styles from "./calendar.module.css";
export function AgendaTable({
  items,
  onMeeting,
}: {
  items: AgendaItem[];
  onMeeting: (meeting: EngagementMeeting) => void;
}) {
  return (
    <table className={styles.agenda}>
      <thead>
        <tr>
          <th>When</th>
          <th>Event</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const href = safeAgendaHref(item.href);
          return (
            <tr key={item.key} className={styles[item.source.toLowerCase()]}>
              <td>
                {new Date(`${item.date}T12:00:00Z`)
                  .toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })
                  .toUpperCase()}
                <br />
                {item.time}
              </td>
              <td>
                {item.meeting ? (
                  <button
                    type="button"
                    onClick={() => onMeeting(item.meeting!)}
                  >
                    {item.title}
                  </button>
                ) : href ? (
                  <Link
                    href={href}
                    target={href.startsWith("/") ? undefined : "_blank"}
                    rel={
                      href.startsWith("/") ? undefined : "noopener noreferrer"
                    }
                  >
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
                <small>{item.context}</small>
                {item.effectiveDate && (
                  <EffectiveDateDetails record={item.effectiveDate} />
                )}
              </td>
              <td>{item.source}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
