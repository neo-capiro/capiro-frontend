import styles from "./stat-tiles.module.css";

export type StatTile = { label: string; value: string; caption: string };

/**
 * Summary tiles: "metric" leads with the label over a large value (run detail),
 * "count" leads with the value in a compact muted tile (tooling summaries).
 */
export function StatTiles({
  label,
  tiles,
  variant,
}: {
  label: string;
  tiles: readonly StatTile[];
  variant: "metric" | "count";
}) {
  return (
    <ul className={styles.tiles} data-variant={variant} aria-label={label}>
      {tiles.map((tile) => (
        <li key={tile.label} className={styles.tile}>
          <span className={styles.label}>{tile.label}</span>
          <strong className={styles.value}>{tile.value}</strong>
          <small className={styles.caption}>{tile.caption}</small>
        </li>
      ))}
    </ul>
  );
}
