"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
import { DesignIcon } from "./DesignIcon";
import {
  destinationHref,
  destinationLabel,
  destinations,
  type MeriSection,
  unavailableDestinationTitle,
} from "./SidebarDestinations";
import { recents } from "./SidebarRecents";
import { ConversationRecents } from "./ConversationRecents";
import { LiveNewConversation } from "./LiveNewConversation";
import styles from "./shell.module.css";

type AssetSet = "home" | "cited-answer";
type MenuProps = {
  id: string;
  assetSet: AssetSet;
  fixture: boolean;
  conversationEnabled: boolean;
  firstChatBootstrapEnabled: boolean;
  firstChatBootstrapClientId?: string;
  section?: MeriSection | undefined;
  pendingApprovals?: number | undefined;
  clientId?: string | undefined;
  onNavigate: () => void;
};

/** Recents and the workflow library entry beneath the destinations. */
function MobileRecents({
  fixture,
  conversationEnabled,
  onNavigate,
}: Pick<MenuProps, "fixture" | "conversationEnabled" | "onNavigate">) {
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
      ) : conversationEnabled ? (
        <ConversationRecents
          enabled
          className={styles.mobileItem}
          onNavigate={onNavigate}
        />
      ) : (
        <p className={styles.mobileRecentLabel}>
          Recent conversations unavailable
        </p>
      )}
      {fixture ? (
        <Link
          href="/meri/fixture/workflow-library"
          className={styles.mobileItem}
          onClick={onNavigate}
        >
          Workflows
        </Link>
      ) : (
        <button
          type="button"
          className={styles.mobileItem}
          disabled
          title="Unavailable: no connected workflow library"
        >
          Workflows
        </button>
      )}
    </>
  );
}

/** Fixture mode starts a local draft; live mode records a verified Core intent. */
function MobileNewConversation({
  assetSet,
  fixture,
  conversationEnabled,
  firstChatBootstrapEnabled,
  firstChatBootstrapClientId,
  onNavigate,
}: Pick<
  MenuProps,
  | "assetSet"
  | "fixture"
  | "conversationEnabled"
  | "firstChatBootstrapEnabled"
  | "firstChatBootstrapClientId"
  | "onNavigate"
>) {
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
    <LiveNewConversation
      assetSet={assetSet}
      className={styles.mobileNewConversation}
      conversationEnabled={conversationEnabled}
      firstChatBootstrapEnabled={firstChatBootstrapEnabled}
      firstChatBootstrapClientId={firstChatBootstrapClientId}
      onNavigate={onNavigate}
    />
  );
}

/** Figma 10.08 phone menu: every Meri destination, preferences and recents. */
function MobileMenu({
  id,
  assetSet,
  fixture,
  section,
  conversationEnabled,
  firstChatBootstrapEnabled,
  firstChatBootstrapClientId,
  pendingApprovals,
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
  const taskUpdatesHref = "/meri/task-updates";
  return (
    <nav id={id} className={styles.mobileMenu} aria-label="Meri sections">
      <MobileNewConversation
        assetSet={assetSet}
        fixture={fixture}
        conversationEnabled={conversationEnabled}
        firstChatBootstrapEnabled={firstChatBootstrapEnabled}
        firstChatBootstrapClientId={firstChatBootstrapClientId}
        onNavigate={onNavigate}
      />
      {destinations.map((item) => {
        const href = destinationHref(item, fixture);
        const label = destinationLabel(item.label, pendingApprovals);
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
            title={unavailableDestinationTitle(item)}
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
        href={scopedHref(taskUpdatesHref, clientId)}
        className={styles.mobileItem}
        aria-current={pathname === taskUpdatesHref ? "page" : undefined}
        onClick={onNavigate}
      >
        Task updates
      </Link>
      <Link
        href="/settings/preferences"
        className={styles.mobileItem}
        onClick={onNavigate}
      >
        <DesignIcon name="mode-modules" assetSet={assetSet} />
        Preferences
      </Link>
      <MobileRecents
        fixture={fixture}
        conversationEnabled={conversationEnabled}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

/** Figma 10.19 phone "Workspace menu" disclosure; the sidebar is hidden at this width. */
export function MeriMobileNavigation({
  assetSet = "home",
  fixture = false,
  conversationEnabled = false,
  firstChatBootstrapEnabled = false,
  firstChatBootstrapClientId,
  section,
  pendingApprovals,
}: {
  assetSet?: AssetSet;
  fixture?: boolean;
  conversationEnabled?: boolean;
  firstChatBootstrapEnabled?: boolean;
  firstChatBootstrapClientId?: string;
  section?: MeriSection | undefined;
  pendingApprovals?: number | undefined;
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
        <ChevronDown aria-hidden />
        Workspace menu
      </button>
      {open ? (
        <MobileMenu
          id={menuId}
          assetSet={assetSet}
          fixture={fixture}
          conversationEnabled={conversationEnabled}
          firstChatBootstrapEnabled={firstChatBootstrapEnabled}
          firstChatBootstrapClientId={firstChatBootstrapClientId}
          section={section}
          pendingApprovals={pendingApprovals}
          clientId={clientId}
          onNavigate={() => setOpenOn(null)}
        />
      ) : null}
    </div>
  );
}
