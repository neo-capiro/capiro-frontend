"use client";

import Link from "next/link";
import { Button } from "@capiro/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSelectedClient } from "../session/SelectedClient";
import { researchRoute } from "../meri-conversations/research-context";
import { conversationSearchHref } from "../meri-conversations/conversation-navigation";
import { unavailableTitle } from "../meri-resources/unavailable";
import { useMeriCapabilities } from "../meri-resources/CapabilityContext";
import { DesignIcon } from "./DesignIcon";
import {
  preferencesHref,
  SidebarDestinations,
  type MeriSection,
} from "./SidebarDestinations";
import { SidebarRecents } from "./SidebarRecents";
import { LiveNewConversation } from "./LiveNewConversation";
import styles from "./shell.module.css";

export function Sidebar({
  assetSet = "home",
  fixture = false,
  conversationEnabled = false,
  firstChatBootstrapEnabled = false,
  section,
  pendingApprovals,
  chat = false,
}: {
  assetSet?: "home" | "cited-answer";
  fixture?: boolean;
  conversationEnabled?: boolean;
  firstChatBootstrapEnabled?: boolean;
  section?: MeriSection | undefined;
  pendingApprovals?: number | undefined;
  /** Chat-first canvas: the sidebar tracks the viewport and its recents scroll on their own. */
  chat?: boolean;
}) {
  const capabilities = useMeriCapabilities();
  const pathname = usePathname();
  const router = useRouter();
  const selected = useSelectedClient();
  const params = useSearchParams();
  const searchClient = researchRoute(params)
    ? undefined
    : params.getAll("scope").length === 1 &&
        params.get("scope") === "general" &&
        !params.has("clientId")
      ? null
      : selected.state === "authorized-client"
        ? selected.client.id
        : undefined;
  const resetFixture = () => {
    window.dispatchEvent(new Event("meri:reset-local-draft"));
    if (pathname !== "/meri/fixture/home") router.push("/meri/fixture/home");
  };
  return (
    <aside
      id="meri-sidebar"
      className={`${styles.sidebar} ${chat ? styles.chatSidebar : ""}`}
      aria-label="Meri navigation"
    >
      {fixture ? (
        <Button
          type="button"
          className={styles.newConversation}
          onClick={resetFixture}
          title="New local fixture draft"
        >
          <DesignIcon name="plus" assetSet={assetSet} />
          New conversation
        </Button>
      ) : (
        <LiveNewConversation
          assetSet={assetSet}
          className={styles.newConversation}
          conversationEnabled={
            conversationEnabled && capabilities.conversations.status === "on"
          }
          firstChatBootstrapEnabled={
            firstChatBootstrapEnabled &&
            capabilities.newConversation.status === "on"
          }
        />
      )}
      {fixture ? (
        <Button asChild variant="ghost" className={styles.navButton}>
          <Link href="/meri/fixture/command-palette">
            <DesignIcon name="search" assetSet={assetSet} />
            Search conversations
          </Link>
        </Button>
      ) : conversationEnabled && capabilities.conversations.status === "on" ? (
        <Button asChild variant="ghost" className={styles.navButton}>
          <Link href={conversationSearchHref(searchClient)}>
            <DesignIcon name="search" assetSet={assetSet} />
            Search conversations
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className={styles.navButton}
          disabled
          title={unavailableTitle("conversationList")}
        >
          <DesignIcon name="search" assetSet={assetSet} />
          Search conversations
        </Button>
      )}
      <div className={styles.divider} />
      {/* Real recent conversations sit before the destinations, as in the chat-first layout. */}
      <SidebarRecents
        fixture={fixture}
        enabled={
          conversationEnabled && capabilities.conversations.status === "on"
        }
      />
      <div className={styles.divider} />
      <h2 className={styles.libraryLabel} id="meri-library-label">
        Library
      </h2>
      <SidebarDestinations
        assetSet={assetSet}
        fixture={fixture}
        section={section}
        pendingApprovals={pendingApprovals}
        // On the chat-first canvas recent chats are the chat navigation, Runs is reachable from the
        // Tools panel, and workspace-wide Approvals has no ordinary route (SDK decisions stay
        // inline in the conversation). Other pages keep their existing destinations.
        exclude={chat ? ["conversations", "runs", "approvals"] : undefined}
      />
      <SidebarPreferences fixture={fixture} section={section} />
    </aside>
  );
}

/** Preferences link: the 09.01 fixture in fixture mode, current on the Settings fixture pages. */
function SidebarPreferences({
  fixture,
  section,
}: {
  fixture: boolean;
  section?: MeriSection | undefined;
}) {
  const current = section === "preferences";
  const capabilities = useMeriCapabilities();
  const href = preferencesHref(fixture, capabilities);
  return (
    <div className={styles.preferences}>
      <div className={styles.divider} />
      <Button
        asChild={Boolean(href)}
        variant="ghost"
        disabled={!href}
        title={href ? undefined : capabilities.preferences.reason}
        className={`${styles.navButton} ${current ? styles.currentDestination : ""}`}
      >
        {href ? (
          <Link href={href} aria-current={current ? "page" : undefined}>
            Preferences
          </Link>
        ) : (
          "Preferences"
        )}
      </Button>
    </div>
  );
}
