import styles from "./artifacts.module.css";

export type Thumbnail = { id: string; number: string; label: string };

/** Page or slide rail; the selected item drives the main preview. */
export function ThumbnailRail({
  label,
  items,
  selectedId,
  onSelect,
  variant,
  className,
}: {
  label: string;
  items: readonly Thumbnail[];
  selectedId: string;
  onSelect: (id: string) => void;
  variant: "page" | "slide";
  className: string | undefined;
}) {
  return (
    <ol className={`${styles.rail} ${className ?? ""}`} aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`${styles.thumb} ${variant === "slide" ? styles.slideThumb : ""}`}
            aria-current={item.id === selectedId}
            onClick={() => onSelect(item.id)}
          >
            <span className={styles.thumbNumber}>{item.number}</span>
            <span className={styles.thumbLabel}>{item.label}</span>
            {variant === "page" ? (
              <span className={styles.thumbOpen} aria-hidden>
                Open
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ol>
  );
}
