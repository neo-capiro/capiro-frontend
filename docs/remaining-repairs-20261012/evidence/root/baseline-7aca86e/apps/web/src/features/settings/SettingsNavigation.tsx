"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
import { canOpenSettings, settingsNavigation } from "./access";
import styles from "./styles";

export function SettingsNavigation({
  section,
  identity,
}: {
  section: string;
  identity: CapiroMe;
}) {
  const router = useRouter();
  const groups = settingsNavigation
    .map((group) => ({
      ...group,
      entries: group.entries.filter(([id]) => canOpenSettings(id, identity)),
    }))
    .filter((group) => group.entries.length);
  const active = ["hq-ai-keys", "hq-personnel"].includes(section)
    ? "hq-tenants"
    : section;
  return (
    <aside className={styles.rail}>
      <Link href="/modules" className={styles.back}>
        <img
          src="/figma/modules/settings-personal-imgIcon7.svg"
          alt=""
          aria-hidden="true"
        />
        All modules
      </Link>
      <nav aria-label="Settings">
        {groups.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupName}>{group.label}</p>
            {group.entries.map(([id, label]) => (
              <Link
                key={id}
                className={styles.navItem}
                href={`/settings/${id}`}
                aria-current={active === id ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <label className={styles.mobileIndex}>
        Settings section
        <select
          className={styles.input}
          value={active}
          onChange={(event) => router.push(`/settings/${event.target.value}`)}
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.entries.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </aside>
  );
}
