"use client";

import Link from "next/link";
import { useSelectedClient } from "../session/SelectedClient";
import { productHref, scopedHref } from "../session/client-route";
import { Button } from "@capiro/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { DesignIcon } from "./DesignIcon";
import styles from "./shell.module.css";

const destinations = [
  { label: "Conversations", icon: "conversations", current: true },
  { label: "Files", icon: "files" },
  { label: "Runs", icon: "runs" },
  { label: "Approvals · 2", icon: "approvals" },
  { label: "Memory", icon: "memory" },
  { label: "Routines", icon: "routines" },
  { label: "Data access", icon: "data-access" },
];
const recents = [
  "Anduril meeting brief",
  "FY27 funding landscape",
  "Weekly client updates",
];

export function Sidebar({
  assetSet = "home",
}: {
  assetSet?: "home" | "cited-answer";
}) {
  const pathname = usePathname();
  const selected = useSelectedClient();
  const router = useRouter();
  const reset = () => {
    window.dispatchEvent(new Event("meri:reset-local-draft"));
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
      <Button type="button" className={styles.newConversation} onClick={reset}>
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
      <nav className={styles.destinations} aria-label="Meri workspace">
        {destinations.map((item) => (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            className={`${styles.navButton} ${item.current && pathname !== "/meri/actions" ? styles.currentDestination : ""}`}
            aria-current={
              item.current && pathname !== "/meri/actions" ? "page" : undefined
            }
            disabled={!item.current}
            onClick={
              item.current
                ? () =>
                    router.push(
                      productHref(
                        "meri",
                        selected.state === "authorized-client"
                          ? selected.client.id
                          : undefined,
                      ),
                    )
                : undefined
            }
            title={
              item.current
                ? assetSet === "home"
                  ? "Current local Home"
                  : "Current local conversation view"
                : "Unavailable: disconnected synthetic fixture"
            }
          >
            {<DesignIcon name={item.icon} assetSet={assetSet} />}
            {item.label}
          </Button>
        ))}
        <Button
          asChild
          variant="ghost"
          className={`${styles.navButton} ${pathname === "/meri/actions" ? styles.currentDestination : ""}`}
        >
          <Link
            href={scopedHref(
              "/meri/actions",
              selected.state === "authorized-client"
                ? selected.client.id
                : undefined,
            )}
            aria-current={pathname === "/meri/actions" ? "page" : undefined}
          >
            Recommendation actions
          </Link>
        </Button>
      </nav>
      <section className={styles.recents} aria-labelledby="recent-label">
        <h2 id="recent-label">Recent</h2>
        {recents.map((title) => (
          <Button
            key={title}
            type="button"
            variant="ghost"
            className={styles.navButton}
            disabled
            title="Synthetic title; no conversation exists"
          >
            {title}
          </Button>
        ))}
      </section>
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
