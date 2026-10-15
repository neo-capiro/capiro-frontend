"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
import { DesignIcon } from "./DesignIcon";
import {
  destinationHref,
  destinations,
  type MeriSection,
} from "./SidebarDestinations";
import { recents } from "./SidebarRecents";
import styles from "./shell.module.css";

type AssetSet = "home" | "cited-answer";
type MenuProps = {
  id: string;
  assetSet: AssetSet;
  fixture: boolean;
  section?: MeriSection | undefined;
  clientId?: string | undefined;
  onNavigate: () => void;
};

/** Recents and the workflow library entry beneath the destinations. */
function MobileRecents({ fixture }: { fixture: boolean }) {
  return (
    <>
      <div className={styles.mobileDivider} />
      <h2 className={styles.mobileRecentLabel}>Recent</h2>
      {fixture ? (
        recents.map((title) => (
          <button
            key={title}
            type="button"
            className={styles.mobileItem}
            disabled
            title="Synthetic title; no conversation exists"
          >
            {title}
          </button>
        ))
      ) : (
        <p className={styles.mobileRecentLabel}>
          Recent conversations unavailable
        </p>
      )}
      <button
        type="button"
        className={styles.mobileItem}
        disabled
        title="Unavailable: no connected workflow library"
      >
        Workflows
      </button>
    </>
  );
}

/** Fixture mode starts a fresh local draft; the live conversation service is unavailable. */
function MobileNewConversation({
  assetSet,
  fixture,
  onNavigate,
}: Pick<MenuProps, "assetSet" | "fixture" | "onNavigate">) {
  const plus = <DesignIcon name="plus" assetSet={assetSet} />;
  return fixture ? (
    <Link
      href="/meri/fixture/home"
      className={styles.mobileNewConversation}
      onClick={() => {
        window.dispatchEvent(new Event("meri:reset-local-draft"));
        onNavigate();
      }}
    >
      {plus}
      New conversation
    </Link>
  ) : (
    <button
      type="button"
      className={styles.mobileNewConversation}
      disabled
      title="Conversation service unavailable"
    >
      {plus}
      New conversation
    </button>
  );
}

/** Figma 10.08 phone menu: every Meri destination, preferences and recents. */
function MobileMenu({
  id,
  assetSet,
  fixture,
  section,
  clientId,
  onNavigate,
}: MenuProps) {
  const pathname = usePathname();
  const current = (href: string, itemSection?: MeriSection) =>
    section
      ? itemSection === section
      : href === "/meri"
        ? pathname === "/meri"
        : href === pathname;
  const actionsHref = "/meri/actions";
  return (
    <nav id={id} className={styles.mobileMenu} aria-label="Meri sections">
      <MobileNewConversation
        assetSet={assetSet}
        fixture={fixture}
        onNavigate={onNavigate}
      />
      {destinations.map((item) => {
        const href = destinationHref(item, fixture);
        const label =
          fixture && item.label === "Approvals" ? "Approvals · 2" : item.label;
        const icon = <DesignIcon name={item.icon} assetSet={assetSet} />;
        return href ? (
          <Link
            key={item.label}
            href={scopedHref(href, clientId)}
            className={styles.mobileItem}
            aria-current={current(href, item.section) ? "page" : undefined}
            onClick={onNavigate}
          >
            {icon}
            {label}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            className={styles.mobileItem}
            disabled
            title="Unavailable: no connected service"
          >
            {icon}
            {label}
          </button>
        );
      })}
      <Link
        href={scopedHref(actionsHref, clientId)}
        className={styles.mobileItem}
        aria-current={pathname === actionsHref ? "page" : undefined}
        onClick={onNavigate}
      >
        Recommendation actions
      </Link>
      <Link
        href="/settings/preferences"
        className={styles.mobileItem}
        onClick={onNavigate}
      >
        <DesignIcon name="mode-modules" assetSet={assetSet} />
        Preferences
      </Link>
      <MobileRecents fixture={fixture} />
    </nav>
  );
}

/** Phone disclosure for the Meri workspace menu; the sidebar is hidden at this width. */
export function MeriMobileNavigation({
  assetSet = "home",
  fixture = false,
  section,
}: {
  assetSet?: AssetSet;
  fixture?: boolean;
  section?: MeriSection | undefined;
}) {
  const pathname = usePathname();
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
  // The menu belongs to the page it was opened on; navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const menuId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      toggle.current?.focus();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return (
    <div className={styles.mobileNavigation}>
      <button
        ref={toggle}
        type="button"
        className={styles.menuToggle}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        Meri workspace
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>
      {open ? (
        <MobileMenu
          id={menuId}
          assetSet={assetSet}
          fixture={fixture}
          section={section}
          clientId={clientId}
          onNavigate={() => setOpenOn(null)}
        />
      ) : null}
    </div>
  );
}
