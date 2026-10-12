import { Button } from "@capiro/ui/button";
import styles from "./watchlist.module.css";

const notices = {
  unavailable: {
    title: "Current data unavailable",
    description:
      "Your local edits are retained. Refresh the current client and targeting data before continuing.",
    action: "Retry",
  },
  unconfirmed: {
    title: "Save unconfirmed",
    description:
      "We could not confirm the last save. Your draft is retained, and this session will not resend it. Reloading only reads saved values.",
    action: "Reload saved values",
  },
};

export function WatchlistNotice({
  kind,
  disabled,
  onAction,
}: {
  kind: keyof typeof notices;
  disabled?: boolean;
  onAction: () => void;
}) {
  const notice = notices[kind];
  return (
    <section
      className={styles.notice}
      role={kind === "unconfirmed" ? "alert" : "status"}
      aria-label={notice.title}
    >
      <h3>{notice.title}</h3>
      <p>{notice.description}</p>
      <Button
        type="button"
        variant="outline"
        className={`button ${styles.noticeAction}`}
        disabled={disabled}
        onClick={onAction}
      >
        {notice.action}
      </Button>
    </section>
  );
}
