"use client";

import { Button } from "@capiro/ui/button";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { ScopedLink } from "./ScopedLink";
import { ModeLink } from "./ModeLink";
import { productModes } from "../session/client-route";
import { DesignIcon } from "./DesignIcon";
import { HeaderFrame } from "./HeaderFrame";
import { FixtureHeaderActions } from "./FixtureHeaderActions";
import { useMeriSidebarVisibility } from "./MeriSidebarVisibility";
import styles from "./shell.module.css";

const actions = [
  { label: "Quick log", icon: "quick-log", href: "/?log=1" },
  { label: "Master calendar", icon: "calendar", href: "/calendar" },
  { label: "Search", icon: "search", href: "/modules/intelligence" },
  { label: "Updates", icon: "updates" },
];

export function Header({
  assetSet = "home",
  fixture = false,
}: {
  assetSet?: "home" | "cited-answer";
  /** Fixture mode opens the designed Updates panel and Account menu overlays. */
  fixture?: boolean;
}) {
  return (
    <HeaderFrame
      mobileModeRow
      className={styles.header}
      brand={<MeriBrand />}
      modes={
        <nav className={styles.modes} aria-label="Product modes">
          {productModes.map((mode) => (
            <Button
              key={mode.id}
              asChild
              variant="ghost"
              className={`${styles.mode} ${mode.id === "meri" ? styles.currentMode : ""}`}
            >
              <ModeLink
                mode={mode.id}
                aria-label={mode.label}
                aria-current={mode.id === "meri" ? "page" : undefined}
                title={mode.label}
              >
                <DesignIcon name={`mode-${mode.id}`} assetSet={assetSet} />
              </ModeLink>
            </Button>
          ))}
        </nav>
      }
      actions={
        <div className={styles.globalActions}>
          {(fixture ? actions.filter((action) => action.href) : actions).map(
            (action) =>
              action.href ? (
                <Button
                  key={action.label}
                  asChild
                  variant="ghost"
                  className={styles.action}
                >
                  <ScopedLink href={action.href} aria-label={action.label}>
                    <DesignIcon
                      name={action.icon}
                      assetSet="header-34-20261016"
                    />
                  </ScopedLink>
                </Button>
              ) : (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
                  className={styles.action}
                  disabled
                  aria-label={`${action.label} — unavailable`}
                >
                  <DesignIcon
                    name={action.icon}
                    assetSet="header-34-20261016"
                  />
                </Button>
              ),
          )}
          {fixture ? (
            <FixtureHeaderActions assetSet={assetSet} />
          ) : (
            <Button asChild variant="ghost" className={styles.action}>
              <Link href="/settings/personal" aria-label="Account settings">
                <DesignIcon name="profile" assetSet={assetSet} />
              </Link>
            </Button>
          )}
        </div>
      }
    />
  );
}

function MeriBrand() {
  const { expanded, toggle } = useMeriSidebarVisibility();
  return (
    <div className={styles.brand}>
      <Link href="/" className={styles.wordmark} aria-label="Capiro Home">
        <img
          src="/design/home/wordmark.png"
          width="77"
          height="26"
          alt="Capiro"
        />
      </Link>
      <button
        type="button"
        className={styles.sidebarToggle}
        aria-label="Toggle Meri sidebar"
        aria-controls="meri-sidebar"
        aria-expanded={expanded}
        onClick={toggle}
      >
        <PanelLeft size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
