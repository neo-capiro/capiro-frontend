"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@capiro/ui/button";
import { useSelectedClient } from "../session/SelectedClient";
import { scopedHref } from "../session/client-route";
import { type UnavailableResourceId } from "../meri-resources/unavailable";
import { useMeriCapabilities } from "../meri-resources/CapabilityContext";
import {
  heldMeriCapabilities,
  meriCapabilityHref,
  type MeriCapabilities,
  type MeriCapabilityId,
} from "../meri-resources/capabilities";
import { DesignIcon } from "./DesignIcon";
import { UnavailableControlReason } from "./UnavailableControlReason";
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
    capability: "conversations",
    fixture: "home",
  },
  {
    label: "Files",
    icon: "files",
    section: "files",
    capability: "files",
    fixture: "workspace-files",
  },
  {
    label: "Runs",
    icon: "runs",
    section: "runs",
    capability: "runs",
    fixture: "background-runs",
    unavailable: "runs",
  },
  {
    label: "Approvals",
    icon: "approvals",
    section: "approvals",
    capability: "approvals",
    fixture: "approval-center",
    unavailable: "approvals",
  },
  {
    label: "Memory",
    icon: "memory",
    section: "memory",
    capability: "memory",
    fixture: "memory-recall",
    unavailable: "memory",
  },
  {
    label: "Routines",
    icon: "routines",
    section: "routines",
    capability: "routines",
    fixture: "routines",
    unavailable: "routines",
  },
  {
    label: "Data access",
    icon: "data-access",
    section: "data-access",
    capability: "dataAccess",
    fixture: "data-coverage",
    unavailable: "dataAccess",
  },
] as const satisfies readonly {
  label: string;
  icon: string;
  section: MeriSection;
  capability: MeriCapabilityId;
  fixture?: string;
  /** Ordinary routes: the missing service that keeps this destination disabled. */
  unavailable?: UnavailableResourceId;
}[];
/** Tooltip for a destination with no ordinary route. */
export const unavailableDestinationTitle = (
  item: (typeof destinations)[number],
  capabilities: MeriCapabilities = heldMeriCapabilities,
) =>
  `${capabilities[item.capability].status === "unavailable" ? "Not available yet" : "Not enabled"}: ${capabilities[item.capability].reason}`;
/** Fixture mode links a destination to its synthetic Figma screen when one exists. */
export const destinationHref = (
  item: (typeof destinations)[number],
  fixture: boolean,
  capabilities: MeriCapabilities = heldMeriCapabilities,
): string | undefined =>
  fixture && "fixture" in item
    ? `/meri/fixture/${item.fixture}`
    : meriCapabilityHref(item.capability, capabilities);

/** Preferences opens the Figma 09.01 synthetic Settings page in fixture mode. */
export const preferencesHref = (
  fixture: boolean,
  capabilities: MeriCapabilities = heldMeriCapabilities,
) =>
  fixture
    ? "/meri/fixture/personal-preferences"
    : meriCapabilityHref("preferences", capabilities);

/** A destination label; Approvals carries the pending count when one is supplied. */
export const destinationLabel = (label: string, pendingApprovals?: number) =>
  label === "Approvals" && pendingApprovals !== undefined
    ? `Approvals · ${pendingApprovals}`
    : label;

/** Meri workspace destinations; unavailable services stay explained and disabled. */
export function SidebarDestinations({
  assetSet,
  fixture,
  section,
  pendingApprovals,
  exclude,
}: {
  assetSet: "home" | "cited-answer";
  fixture: boolean;
  section?: MeriSection | undefined;
  pendingApprovals?: number | undefined;
  /** Destinations reachable elsewhere in this composition (chat history, secondary Tools links). */
  exclude?: readonly MeriSection[] | undefined;
}) {
  const pathname = usePathname();
  const capabilities = useMeriCapabilities();
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
      {destinations
        .filter((item) => !exclude?.includes(item.section))
        .map((item) => {
          const href = destinationHref(item, fixture, capabilities);
          return (
            <UnavailableControlReason
              key={item.label}
              label={destinationLabel(item.label, pendingApprovals)}
              reason={
                href
                  ? undefined
                  : unavailableDestinationTitle(item, capabilities)
              }
            >
              <Button
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
                    ? fixture
                      ? "Open disconnected synthetic fixture"
                      : item.label === "Files"
                        ? "Open document files"
                        : `Open ${item.label.toLowerCase()}`
                    : unavailableDestinationTitle(item, capabilities)
                }
              >
                {<DesignIcon name={item.icon} assetSet={assetSet} />}
                {destinationLabel(item.label, pendingApprovals)}
              </Button>
            </UnavailableControlReason>
          );
        })}
    </nav>
  );
}
