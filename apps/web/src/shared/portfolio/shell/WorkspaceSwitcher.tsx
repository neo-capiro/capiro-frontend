"use client";
/* eslint-disable @next/next/no-img-element */
import { ModeLink } from "@/shared/shell/ModeLink";
import type { ProductMode } from "@/shared/session/client-route";
import type { Destinations } from "../config/config";
import styles from "./shell.module.css";
const asset = (name: string) => `/design/portfolio-34/${name}.svg`;
export function WorkspaceSwitcher({
  destinations: _destinations,
}: {
  destinations: Destinations;
}) {
  const entries = [
    { label: "Meri", icon: "mode-meri" },
    { label: "Portfolio", icon: "mode-portfolio" },
    { label: "Modules", icon: "mode-modules" },
  ];
  return (
    <nav className={styles.modes} aria-label="Workspace">
      {entries.map(({ label, icon }) => (
        <ModeLink
          key={label}
          mode={label.toLowerCase() as ProductMode}
          aria-label={label}
          title={label}
          aria-current={label === "Portfolio" ? "page" : undefined}
        >
          <img src={asset(icon)} alt="" />
        </ModeLink>
      ))}
    </nav>
  );
}
