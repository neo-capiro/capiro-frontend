"use client";
/* Figma supplies the static line icons. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Menu, PanelLeft } from "lucide-react";
import { HeaderFrame } from "@/shared/shell/HeaderFrame";
import { ScopedLink } from "@/shared/shell/ScopedLink";
import { PortfolioNavigation } from "./PortfolioNavigation";
import type { Destinations } from "../config/config";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { PortfolioHeaderActions } from "./PortfolioHeaderActions";
import styles from "./shell.module.css";
const asset = (name: string) => `/design/411-41421-${name}`;
export function Shell({
  children,
  destinations,
  client,
  profileControl,
  readOnlyPreview = false,
}: {
  children: ReactNode;
  destinations: Destinations;
  client?: { id: string; name: string };
  profileControl?: ReactNode;
  readOnlyPreview?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const base = client ? `/portfolio/${client.id}` : "/portfolio";
  return (
    <div
      className={`${styles.shell} ${desktopExpanded ? "" : styles.collapsed}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileOpen) {
          setMobileOpen(false);
          mobileToggle.current?.focus();
        }
      }}
    >
      <a href="#main" className="skip">
        Skip to content
      </a>
      <HeaderFrame
        className={styles.header}
        mobileModeRow
        leading={
          <button
            ref={mobileToggle}
            type="button"
            className={`button ghost iconButton ${styles.mobileToggle}`}
            aria-label="Toggle navigation"
            aria-controls="portfolio-navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={18} />
          </button>
        }
        brand={
          <div className={styles.brand}>
            <Link href="/" aria-label="Capiro Home">
              <img
                src={asset("imgCapiroWordmark.png")}
                alt="Capiro"
                width={77}
                height={26}
              />
            </Link>
            <button
              type="button"
              className={styles.sidebarToggle}
              aria-label="Toggle sidebar"
              aria-controls="portfolio-navigation"
              aria-expanded={desktopExpanded}
              onClick={() => setDesktopExpanded((expanded) => !expanded)}
            >
              <PanelLeft size={18} aria-hidden="true" />
            </button>
          </div>
        }
        modes={<WorkspaceSwitcher destinations={destinations} />}
        actions={
          <PortfolioHeaderActions
            base={base}
            profileControl={profileControl}
            readOnlyPreview={readOnlyPreview}
          />
        }
      />
      <div className={styles.body}>
        <aside
          id="portfolio-navigation"
          className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}
          aria-label="Portfolio navigation"
        >
          <PortfolioNavigation
            client={client}
            onNavigate={() => setMobileOpen(false)}
            readOnlyPreview={readOnlyPreview}
          />
          {!readOnlyPreview && (
            <div className={styles.bottom}>
              <ScopedLink
                href="/settings/personal"
                aria-label="Settings"
                title="Settings"
              >
                <img src="/design/portfolio-34/settings.svg" alt="" />
                <span>Settings</span>
              </ScopedLink>
            </div>
          )}
        </aside>
        <main id="main" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
