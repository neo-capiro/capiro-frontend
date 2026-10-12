"use client";
import type { CalendarItem } from "./contracts";
import { formatInstant } from "./range";
import { meetingMaterials } from "./lifecycle";
import styles from "./calendar.module.css";

/** The client meeting list retains native artifact states independently of approval. */
export function MeetingAgenda({
  items,
  onMeeting,
}: {
  items: CalendarItem[];
  onMeeting: (id: string) => void;
}) {
  const sorted = [...items].sort(
    (a, b) =>
      (a.startAt ?? "").localeCompare(b.startAt ?? "") ||
      a.key.localeCompare(b.key),
  );
  return (
    <div className={styles.meetingTableWrap}>
      <table className={styles.meetingTable}>
        <caption className={styles.tableCaption}>
          Meeting preparation, notes and debrief status
        </caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Meeting</th>
            <th scope="col">Prep</th>
            <th scope="col">Meeting notes</th>
            <th scope="col">Debrief</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const material = item.meeting && meetingMaterials(item.meeting);
            return (
              <tr key={item.key}>
                <td data-label="When">
                  {item.startAt
                    ? formatInstant(item.startAt, item.timeZone)
                    : "Time unavailable"}
                </td>
                <th scope="row">
                  <button
                    className={styles.titleButton}
                    onClick={() => onMeeting(item.sourceId)}
                  >
                    {item.title}
                  </button>
                  <small>
                    {item.meeting?.location ??
                      (item.meeting?.isVirtual
                        ? "Virtual meeting"
                        : "Location not supplied")}
                  </small>
                </th>
                <td data-label="Prep">
                  {material?.prep ?? "Status unavailable"}
                </td>
                <td data-label="Meeting notes">
                  {material?.notes ?? "Status unavailable"}
                </td>
                <td data-label="Debrief">
                  {material?.debrief ?? "Status unavailable"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!sorted.length && (
        <p className="status">
          No meetings match the selected filters and date range.
        </p>
      )}
    </div>
  );
}
