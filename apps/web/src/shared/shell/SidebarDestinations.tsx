"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@capiro/ui/button";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
import { DesignIcon } from "./DesignIcon";
import styles from "./shell.module.css";

const destinations = [
  { label: "Conversations", icon: "conversations", href: "/meri" },
  { label: "Files", icon: "files", href: "/meri/files" },
  { label: "Runs", icon: "runs", fixture: "background-runs" },
  { label: "Approvals", icon: "approvals", fixture: "approval-center" },
  { label: "Memory", icon: "memory", fixture: "memory-recall" },
  { label: "Routines", icon: "routines", fixture: "routines" },
  { label: "Data access", icon: "data-access", fixture: "data-coverage" },
] as const satisfies readonly {
  label: string;
  icon: string;
  href?: string;
  fixture?: string;
}[];
/** Fixture mode links a destination to its synthetic Figma screen when one exists. */
const destinationHref = (
  item: (typeof destinations)[number],
  fixture: boolean,
): string | undefined =>
  fixture && "fixture" in item
    ? `/meri/fixture/${item.fixture}`
    : "href" in item
      ? item.href
      : undefined;

/** Meri workspace destinations; unavailable services stay explained and disabled. */
export function SidebarDestinations({
  assetSet,
  fixture,
}: {
  assetSet: "home" | "cited-answer";
  fixture: boolean;
}) {
  const pathname = usePathname();
  const selected = useSelectedClient();
  const router = useRouter();
  const isCurrent = (href?: string) =>
    href === "/meri"
      ? pathname === "/meri" ||
        pathname === "/meri/fixture/home" ||
        pathname === "/meri/fixture/cited-answer" ||
        pathname === "/meri/fixture/run-activity"
      : href === pathname;
  return (
    <nav className={styles.destinations} aria-label="Meri workspace">
      {destinations.map((item) => {
        const href = destinationHref(item, fixture);
        return (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            className={`${styles.navButton} ${isCurrent(href) ? styles.currentDestination : ""}`}
            aria-current={isCurrent(href) ? "page" : undefined}
            disabled={!href}
            onClick={
              href
                ? () =>
                    router.push(
                      scopedHref(
                        href,
                        selected.state === "authorized-client"
                          ? selected.client.id
                          : undefined,
                      ),
                    )
                : undefined
            }
            title={
              href
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
        );
      })}
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
  );
}
