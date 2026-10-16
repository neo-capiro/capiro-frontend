import Link from "next/link";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import ui from "../../ui/meri-ui.module.css";
import type { SettingsChrome } from "./settings-view";
import styles from "./settings.module.css";

/** Settings area navigation: route links on fixture pages, local tabs inside Capiro Settings. */
export function SettingsNav({ chrome }: { chrome: SettingsChrome }) {
  const { nav, select } = chrome;
  if (select)
    return (
      <div className={styles.nav}>
        <SegmentedTabs
          label="Meri preference pages"
          options={nav}
          value={nav.find((item) => item.current)?.id ?? ""}
          onChange={select}
        />
      </div>
    );
  return (
    <nav className={styles.nav} aria-label="Settings pages">
      {nav.map((item) =>
        item.href ? (
          <Link
            key={item.id}
            href={item.href}
            className={item.current ? ui.primary : ui.ghost}
            aria-current={item.current ? "page" : undefined}
          >
            {item.label}
          </Link>
        ) : null,
      )}
    </nav>
  );
}
