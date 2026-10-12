"use client";

import { SettingsButton } from "../components";
import styles from "../styles";

export function QueuePagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className={styles.row}>
      <p className={`${styles.description} ${styles.grow}`}>
        {total
          ? `${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total}`
          : "No records"}
      </p>
      <SettingsButton
        small
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </SettingsButton>
      <SettingsButton
        small
        disabled={page * limit >= total}
        onClick={() => onChange(page + 1)}
      >
        Next
      </SettingsButton>
    </div>
  );
}
