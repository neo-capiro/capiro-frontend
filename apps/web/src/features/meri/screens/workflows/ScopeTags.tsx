import styles from "./tooling.module.css";

/** Applied scope and status tags (Figma "Status · …" chips); context only, never filters. */
export function ScopeTags({
  label,
  tags,
}: {
  label: string;
  tags: readonly string[];
}) {
  return (
    <ul className={styles.tags} aria-label={label}>
      {tags.map((tag) => (
        <li key={tag} className={styles.tag}>
          {tag}
        </li>
      ))}
    </ul>
  );
}
