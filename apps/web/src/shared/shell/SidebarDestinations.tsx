"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@capiro/ui/button";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
import { DesignIcon } from "./DesignIcon";
import styles from "./shell.module.css";

/** Workspace section a page belongs to; marks its sidebar destination as current. */
export type MeriSection =
  | "conversations"
  | "files"
  | "runs"
  | "approvals"
  | "memory"
  | "routines"
  | "data-access"
  | "preferences";

/** Canonical Meri workspace destinations, shared by the sidebar and the phone menu. */
export const destinations = [
  {
    label: "Conversations",
    icon: "conversations",
    section: "conversations",
    href: "/meri",
    fixture: "home",
  },
  {
    label: "Files",
    icon: "files",
    section: "files",
    href: "/meri/files",
    fixture: "workspace-files",
  },
  { label: "Runs", icon: "runs", section: "runs", fixture: "background-runs" },
  {
    label: "Approvals",
    icon: "approvals",
    section: "approvals",
    fixture: "approval-center",
  },
  {
    label: "Memory",
    icon: "memory",
    section: "memory",
    fixture: "memory-recall",
  },
  {
    label: "Routines",
    icon: "routines",
    section: "routines",
    fixture: "routines",
  },
  {
    label: "Data access",
    icon: "data-access",
    section: "data-access",
    fixture: "data-coverage",
  },
] as const satisfies readonly {
  label: string;
  icon: string;
  section: MeriSection;
  href?: string;
  fixture?: string;
}[];
/** Fixture mode links a destination to its synthetic Figma screen when one exists. */
export const destinationHref = (
  item: (typeof destinations)[number],
  fixture: boolean,
): string | undefined =>
  fixture && "fixture" in item
    ? `/meri/fixture/${item.fixture}`
    : "href" in item
      ? item.href
      : undefined;

/** Preferences opens the Figma 09.01 synthetic Settings page in fixture mode. */
export const preferencesHref = (fixture: boolean) =>
  fixture ? "/meri/fixture/personal-preferences" : "/settings/preferences";

/** Meri workspace destinations; unavailable services stay explained and disabled. */
export function SidebarDestinations({
  assetSet,
  fixture,
  section,
}: {
  assetSet: "home" | "cited-answer";
  fixture: boolean;
  section?: MeriSection | undefined;
}) {
  const pathname = usePathname();
  const selected = useSelectedClient();
  const router = useRouter();
  const isCurrent = (item: (typeof destinations)[number], href?: string) =>
    section
      ? item.section === section
      : href === "/meri"
        ? pathname === "/meri"
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
            className={`${styles.navButton} ${isCurrent(item, href) ? styles.currentDestination : ""}`}
            aria-current={isCurrent(item, href) ? "page" : undefined}
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
