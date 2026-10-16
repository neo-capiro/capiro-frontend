"use client";

import Link from "next/link";
import { useSelectedClient } from "../session/SelectedClient";
import { productHref } from "../session/client-route";
import { Button } from "@capiro/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { unavailableTitle } from "../meri-resources/unavailable";
import { DesignIcon } from "./DesignIcon";
import {
  preferencesHref,
  SidebarDestinations,
  type MeriSection,
} from "./SidebarDestinations";
import { SidebarRecents } from "./SidebarRecents";
import styles from "./shell.module.css";

export function Sidebar({
  assetSet = "home",
  fixture = false,
  section,
  pendingApprovals,
}: {
  assetSet?: "home" | "cited-answer";
  fixture?: boolean;
  section?: MeriSection | undefined;
  pendingApprovals?: number | undefined;
}) {
  const pathname = usePathname();
  const selected = useSelectedClient();
  const router = useRouter();
  const reset = () => {
    window.dispatchEvent(new Event("meri:reset-local-draft"));
    if (fixture) {
      if (pathname !== "/meri/fixture/home") router.push("/meri/fixture/home");
      return;
    }
    if (pathname !== "/meri")
      router.push(
        productHref(
          "meri",
          selected.state === "authorized-client"
            ? selected.client.id
            : undefined,
        ),
      );
  };
  return (
    <aside className={styles.sidebar} aria-label="Meri navigation">
      <Button
        type="button"
        className={styles.newConversation}
        onClick={reset}
        disabled={!fixture}
        title={
          fixture
            ? "New local fixture draft"
            : unavailableTitle("newConversation")
        }
      >
        <DesignIcon name="plus" assetSet={assetSet} />
        New conversation
      </Button>
      {fixture ? (
        <Button asChild variant="ghost" className={styles.navButton}>
          <Link href="/meri/fixture/command-palette">
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
      <SidebarDestinations
        assetSet={assetSet}
        fixture={fixture}
        section={section}
        pendingApprovals={pendingApprovals}
      />
      <SidebarRecents fixture={fixture} />
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
  return (
    <div className={styles.preferences}>
      <div className={styles.divider} />
      <Button
        asChild
        variant="ghost"
        className={`${styles.navButton} ${current ? styles.currentDestination : ""}`}
      >
        <Link
          href={preferencesHref(fixture)}
          aria-current={current ? "page" : undefined}
        >
          Preferences
        </Link>
      </Button>
      <p>Capiro · Your authorized workspace</p>
    </div>
  );
}
