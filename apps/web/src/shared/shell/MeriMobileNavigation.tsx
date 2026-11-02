"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { Button } from "@capiro/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@capiro/ui/dialog";
import { useMeriSidebarVisibility } from "./MeriSidebarVisibility";
import { conversationSearchHref } from "../meri-conversations/conversation-navigation";
import { researchRoute } from "../meri-conversations/research-context";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
import { useMeriCapabilities } from "../meri-resources/CapabilityContext";
import { meriCapabilityHref } from "../meri-resources/capabilities";
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
import { UnavailableControlReason } from "./UnavailableControlReason";
import styles from "./shell.module.css";

type AssetSet = "home" | "cited-answer";
type MenuProps = {
  id: string;
  assetSet: AssetSet;
  fixture: boolean;
  conversationEnabled: boolean;
  firstChatBootstrapEnabled: boolean;
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
        <UnavailableControlReason
          label="Workflows"
          reason="Unavailable: no connected workflow library"
        >
          <button
            type="button"
            className={styles.mobileItem}
            disabled
            title="Unavailable: no connected workflow library"
          >
            Workflows
          </button>
        </UnavailableControlReason>
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
  onNavigate,
}: Pick<
  MenuProps,
  | "assetSet"
  | "fixture"
  | "conversationEnabled"
  | "firstChatBootstrapEnabled"
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
      onNavigate={onNavigate}
    />
  );
}

/** Supplemental workflow and preference links use the same capability snapshot as the destinations. */
function MobileWorkflowLinks({
  fixture,
  clientId,
  onNavigate,
  preferences = false,
}: Pick<MenuProps, "fixture" | "clientId" | "onNavigate"> & {
  preferences?: boolean;
}) {
  const pathname = usePathname();
  const capabilities = useMeriCapabilities();
  return (
    <>
      {(
        [
          ["actions", "Recommendation actions", "workflow-request"],
          ["taskUpdates", "Task updates", "draft-client-task"],
          ["preferences", "Preferences", "personal-preferences"],
        ] as const
      )
        .filter(([id]) => (id === "preferences") === preferences)
        .map(([id, label, screen]) => {
          const href = fixture
            ? `/meri/fixture/${screen}`
            : meriCapabilityHref(id, capabilities);
          return href ? (
            <Link
              key={id}
              href={scopedHref(href, clientId)}
              className={styles.mobileItem}
              aria-current={pathname === href ? "page" : undefined}
              onClick={onNavigate}
              title={
                fixture ? "Open disconnected synthetic fixture" : undefined
              }
            >
              {label}
            </Link>
          ) : (
            <UnavailableControlReason
              key={id}
              label={label}
              reason={capabilities[id].reason}
            >
              <button
                type="button"
                className={styles.mobileItem}
                disabled
                title={capabilities[id].reason}
              >
                {label}
              </button>
            </UnavailableControlReason>
          );
        })}
    </>
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
  pendingApprovals,
  clientId,
  onNavigate,
}: MenuProps) {
  const pathname = usePathname();
  const capabilities = useMeriCapabilities();
  const params = useSearchParams();
  const historyHref = fixture
    ? "/meri/fixture/conversation-history"
    : conversationSearchHref(
        researchRoute(params)
          ? undefined
          : params.getAll("scope").length === 1 &&
              params.get("scope") === "general" &&
              !params.has("clientId")
            ? null
            : clientId,
      );
  const current = (href: string, itemSection?: MeriSection) =>
    section
      ? itemSection === section
      : href === "/meri"
        ? pathname === "/meri"
        : href === pathname;
  return (
    <nav id={id} className={styles.mobileMenu} aria-label="Meri sections">
      <div className={styles.mobilePrimary}>
        <MobileNewConversation
          assetSet={assetSet}
          fixture={fixture}
          conversationEnabled={conversationEnabled}
          firstChatBootstrapEnabled={firstChatBootstrapEnabled}
          onNavigate={onNavigate}
        />
        {fixture || capabilities.conversations.status === "on" ? (
          <Link
            href={historyHref}
            className={styles.mobileSearch}
            onClick={onNavigate}
          >
            <DesignIcon name="search" assetSet={assetSet} />
            Search conversations
          </Link>
        ) : (
          <Button
            disabled
            className={styles.mobileSearch}
            title={capabilities.conversations.reason}
          >
            Search conversations
          </Button>
        )}
      </div>
      <div className={styles.mobileScroll}>
        <h2 className={styles.mobileRecentLabel}>Library</h2>
        {destinations
          .filter((item) => item.section !== "conversations")
          .map((item) => {
            const href = destinationHref(item, fixture, capabilities);
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
              <UnavailableControlReason
                key={item.label}
                label={label}
                reason={unavailableDestinationTitle(item, capabilities)}
              >
                <button
                  type="button"
                  className={styles.mobileItem}
                  disabled
                  title={unavailableDestinationTitle(item, capabilities)}
                >
                  {icon}
                  {label}
                </button>
              </UnavailableControlReason>
            );
          })}
        <MobileWorkflowLinks
          fixture={fixture}
          clientId={clientId}
          onNavigate={onNavigate}
        />
        <MobileRecents
          fixture={fixture}
          conversationEnabled={conversationEnabled}
          onNavigate={onNavigate}
        />
        {fixture || capabilities.conversations.navigation === "on" ? (
          <Link
            href={historyHref.replace(/#.*$/, "")}
            className={styles.mobileItem}
            onClick={onNavigate}
          >
            <DesignIcon name="conversations" assetSet={assetSet} />
            All conversations
          </Link>
        ) : (
          <Button
            disabled
            className={styles.mobileItem}
            title={capabilities.conversations.reason}
          >
            All conversations
          </Button>
        )}
      </div>
      <div className={styles.mobilePreferences}>
        <MobileWorkflowLinks
          fixture={fixture}
          clientId={clientId}
          onNavigate={onNavigate}
          preferences
        />
      </div>
    </nav>
  );
}

/** Tablet/phone Workspace drawer; the existing dialog owns focus containment and Escape. */
export function MeriMobileNavigation({
  assetSet = "home",
  fixture = false,
  conversationEnabled = false,
  firstChatBootstrapEnabled = false,
  section,
  pendingApprovals,
}: {
  assetSet?: AssetSet;
  fixture?: boolean;
  conversationEnabled?: boolean;
  firstChatBootstrapEnabled?: boolean;
  section?: MeriSection | undefined;
  pendingApprovals?: number | undefined;
}) {
  const capabilities = useMeriCapabilities();
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : undefined;
  const {
    workspaceOpen: open,
    setWorkspaceOpen,
    workspaceId,
  } = useMeriSidebarVisibility();
  const toggle = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 1101px)");
    const dismissOnDesktop = () => {
      if (desktop.matches) setWorkspaceOpen(false);
    };
    desktop.addEventListener("change", dismissOnDesktop);
    return () => desktop.removeEventListener("change", dismissOnDesktop);
  }, [open, setWorkspaceOpen]);
  return (
    <Dialog open={open} onOpenChange={setWorkspaceOpen}>
      <div className={styles.mobileNavigation}>
        <Button
          ref={toggle}
          type="button"
          className={styles.menuToggle}
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={workspaceId}
          onClick={() => setWorkspaceOpen(!open)}
        >
          <PanelLeft size={16} aria-hidden />
          Workspace menu
        </Button>
      </div>
      <DialogContent
        id={workspaceId}
        className={styles.workspaceDrawer}
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          close.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = opener.current;
          const visible = target?.isConnected && target.getClientRects().length;
          (visible
            ? target
            : document.getElementById("meri-sidebar-toggle")
          )?.focus({ preventScroll: true });
        }}
      >
        <div className={styles.workspaceHeading}>
          <DialogTitle className={styles.workspaceTitle}>Workspace</DialogTitle>
          <DialogClose asChild>
            <Button
              ref={close}
              variant="ghost"
              className={styles.workspaceClose}
              aria-label="Close Workspace"
            >
              Close
            </Button>
          </DialogClose>
        </div>
        <MobileMenu
          id={`${workspaceId}-sections`}
          assetSet={assetSet}
          fixture={fixture}
          conversationEnabled={
            conversationEnabled && capabilities.conversations.status === "on"
          }
          firstChatBootstrapEnabled={
            firstChatBootstrapEnabled &&
            capabilities.newConversation.status === "on"
          }
          section={section}
          pendingApprovals={pendingApprovals}
          clientId={clientId}
          onNavigate={() => setWorkspaceOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
