"use client";

import Link from "next/link";
import { useSelectedClient } from "../session/SelectedClient";
import { productHref, scopedHref } from "../session/client-route";
import { Button } from "@capiro/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { DesignIcon } from "./DesignIcon";
import { SidebarDestinations } from "./SidebarDestinations";
import { SidebarRecents } from "./SidebarRecents";
import styles from "./shell.module.css";

export function Sidebar({
  assetSet = "home",
  fixture = false,
}: {
  assetSet?: "home" | "cited-answer";
  fixture?: boolean;
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
            : "Conversation service unavailable"
        }
      >
        <DesignIcon name="plus" assetSet={assetSet} />
        New conversation
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={styles.navButton}
        disabled
        title="No connected conversation store"
      >
        <DesignIcon name="search" assetSet={assetSet} />
        Search conversations
      </Button>
      <div className={styles.divider} />
      <SidebarDestinations assetSet={assetSet} fixture={fixture} />
      <SidebarRecents fixture={fixture} />
      <div className={styles.preferences}>
        <div className={styles.divider} />
        <Button asChild variant="ghost" className={styles.navButton}>
          <Link href="/settings/preferences">Preferences</Link>
        </Button>
        <p>Capiro · Your authorized workspace</p>
      </div>
    </aside>
  );
}
