"use client";

import Link from "next/link";
import { ScopedLink } from "./ScopedLink";
import { useState } from "react";
import { moduleCatalog, moduleHref, type ModuleSlug } from "./module-catalog";
import styles from "./module-shell.module.css";
import { ModuleAsset } from "./ModuleAsset";

export function ModuleNavigation({ active }: { active?: ModuleSlug | "hub" }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.mobileNavToggle}
        aria-expanded={expanded}
        aria-controls="module-navigation"
        onClick={() => setExpanded(!expanded)}
      >
        Modules menu
      </button>
      <aside
        className={`${styles.navigation} ${expanded ? styles.expanded : ""}`}
        id="module-navigation"
      >
        <p className={styles.navEyebrow}>Modules</p>
        <nav aria-label="Modules">
          <ScopedLink
            href="/modules"
            className={active === "hub" ? styles.current : ""}
            aria-current={active === "hub" ? "page" : undefined}
          >
            <ModuleAsset name="modules" />
            <span>Module hub</span>
          </ScopedLink>
          {moduleCatalog.map((item) => (
            <ScopedLink
              key={item.slug}
              href={moduleHref(item.slug)}
              className={active === item.slug ? styles.current : ""}
              aria-current={active === item.slug ? "page" : undefined}
              onClick={() => setExpanded(false)}
            >
              <ModuleAsset name={item.icon} />
              <span>{item.label}</span>
            </ScopedLink>
          ))}
        </nav>
        <Link href="/settings/personal" className={styles.settings}>
          <ModuleAsset name="settings" />
          <span>Settings</span>
        </Link>
      </aside>
    </>
  );
}
