import styles from "./tooling.module.css";

export type StatTile = { value: string; label: string; caption: string };

/** Summary counts with their bounding caption. */
export function StatTiles({
  label,
  tiles,
}: {
  label: string;
  tiles: readonly StatTile[];
}) {
  return (
    <ul className={styles.stats} aria-label={label}>
      {tiles.map((tile) => (
        <li key={tile.label} className={styles.stat}>
          <strong>{tile.value}</strong>
          <span>{tile.label}</span>
          <small>{tile.caption}</small>
        </li>
      ))}
    </ul>
  );
}
