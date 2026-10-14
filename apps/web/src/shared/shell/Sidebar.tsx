"use client";

import Link from "next/link";
import { useSelectedClient } from "../session/SelectedClient";
import { productHref, scopedHref } from "../session/client-route";
import { Button } from "@capiro/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { DesignIcon } from "./DesignIcon";
import styles from "./shell.module.css";

const destinations = [
  { label: "Conversations", icon: "conversations", href: "/meri" },
  { label: "Files", icon: "files", href: "/meri/files" },
  { label: "Runs", icon: "runs" },
  { label: "Approvals", icon: "approvals" },
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
  const isCurrent = (href?: string) =>
    href === "/meri"
      ? pathname === "/meri" || pathname.startsWith("/meri/fixture/")
      : href === pathname;
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
      <nav className={styles.destinations} aria-label="Meri workspace">
        {destinations.map((item) => (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            className={`${styles.navButton} ${isCurrent(item.href) ? styles.currentDestination : ""}`}
            aria-current={isCurrent(item.href) ? "page" : undefined}
            disabled={!item.href}
            onClick={
              item.href
                ? () =>
                    router.push(
                      scopedHref(
                        item.href,
                        selected.state === "authorized-client"
                          ? selected.client.id
                          : undefined,
                      ),
                    )
                : undefined
            }
            title={
              item.href
                ? item.label === "Files"
                  ? "Open document files"
                  : fixture
                    ? "Open local fixture"
                    : "Open Meri"
                : "Unavailable: no connected service"
            }
          >
            {<DesignIcon name={item.icon} assetSet={assetSet} />}
            {fixture && item.label === "Approvals"
              ? "Approvals · 2"
              : item.label}
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
        {fixture ? (
          recents.map((title) => (
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
          ))
        ) : (
          <p>Recent conversations unavailable</p>
        )}
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
