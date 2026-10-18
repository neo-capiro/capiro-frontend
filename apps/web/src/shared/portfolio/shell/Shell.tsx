"use client";
/* Figma supplies the static line icons. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Menu, PanelLeft } from "lucide-react";
import { HeaderFrame } from "@/shared/shell/HeaderFrame";
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
}: {
  children: ReactNode;
  destinations: Destinations;
  client?: { id: string; name: string };
  profileControl?: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const base = client ? `/portfolio/${client.id}` : "/portfolio";
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <HeaderFrame
        className={styles.header}
        mobileModeRow
        leading={
          <button
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
          <PortfolioHeaderActions base={base} profileControl={profileControl} />
        }
      />
      <div
        className={`${styles.body} ${desktopExpanded ? "" : styles.bodyCollapsed}`}
      >
        <aside
          id="portfolio-navigation"
          className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}
          aria-label="Portfolio navigation"
        >
          <PortfolioNavigation
            client={client}
            onNavigate={() => setMobileOpen(false)}
          />
          <div className={styles.bottom}>
            <Link href="/settings">
              <img src="/design/471-93465-imgIcon10.svg" alt="" />
              Settings
            </Link>
          </div>
        </aside>
        <main id="main" className={styles.main}>
          {children}
        </main>
      </div>
    </>
  );
}
