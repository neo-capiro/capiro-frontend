"use client";
/* eslint-disable @next/next/no-img-element */
import { ModeLink } from "@/shared/shell/ModeLink";
import type { ProductMode } from "@/shared/session/client-route";
import { DropdownMenu } from "radix-ui";
import type { Destinations } from "../config/config";
import styles from "./shell.module.css";
const asset = (name: string) => `/design/411-41421-${name}`;
export function WorkspaceSwitcher({
  destinations: _destinations,
}: {
  destinations: Destinations;
}) {
  const entries = [
    { label: "Meri", href: "/meri", icon: "imgIcon.svg" },
    { label: "Portfolio", href: "/", icon: "imgIcon1.svg" },
    { label: "Modules", href: "/modules", icon: "imgIcon2.svg" },
  ];
  return (
    <>
      <nav className={styles.modes} aria-label="Workspace">
        {entries.map(({ label, href, icon }) =>
          href ? (
            <ModeLink
              key={label}
              mode={label.toLowerCase() as ProductMode}
              aria-label={label}
              title={label}
              aria-current={label === "Portfolio" ? "page" : undefined}
            >
              <img src={asset(icon)} alt="" />
            </ModeLink>
          ) : (
            <button
              key={label}
              disabled
              aria-label={label}
              title={`${label} destination is not configured`}
            >
              <img src={asset(icon)} alt="" />
            </button>
          ),
        )}
      </nav>
      <div className={styles.phoneMode}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="button iconButton"
            aria-label="Switch workspace"
            title="Portfolio"
          >
            <img src={asset("imgIcon1.svg")} alt="" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={styles.workspaceMenu}
              align="start"
            >
              {entries.map(({ label, href, icon }) => (
                <DropdownMenu.Item
                  key={label}
                  disabled={!href}
                  asChild={Boolean(href)}
                >
                  {href ? (
                    <ModeLink
                      mode={label.toLowerCase() as ProductMode}
                      aria-current={label === "Portfolio" ? "page" : undefined}
                    >
                      <img src={asset(icon)} alt="" />
                      {label}
                    </ModeLink>
                  ) : (
                    <span>
                      <img src={asset(icon)} alt="" />
                      {label} unavailable
                    </span>
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  );
}
