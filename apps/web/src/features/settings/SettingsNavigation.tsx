"use client";

import { useRouter } from "next/navigation";
import { ScopedLink } from "../../shared/shell/ScopedLink";
import { useSelectedClient } from "../../shared/session/SelectedClient";
import { scopedHref } from "../../shared/session/client-route";
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
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
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
    <aside className={styles.rail} id="settings-navigation">
      <ScopedLink href="/modules" className={styles.back}>
        <img
          src="/figma/modules/settings-personal-imgIcon7.svg"
          alt=""
          aria-hidden="true"
        />
        All modules
      </ScopedLink>
      <nav aria-label="Settings">
        {groups.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupName}>{group.label}</p>
            {group.entries.map(([id, label]) => (
              <ScopedLink
                key={id}
                className={styles.navItem}
                href={`/settings/${id}`}
                aria-current={active === id ? "page" : undefined}
              >
                {label}
              </ScopedLink>
            ))}
          </div>
        ))}
      </nav>
      <label className={styles.mobileIndex}>
        Settings section
        <select
          className={styles.input}
          value={active}
          onChange={(event) =>
            router.push(scopedHref(`/settings/${event.target.value}`, clientId))
          }
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
