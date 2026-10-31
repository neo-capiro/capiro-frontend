"use client";
/* Figma supplies the static line icons. The signed-in avatar is supplied by Clerk. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { ScopedLink } from "@/shared/shell/ScopedLink";
import styles from "./shell.module.css";

const asset = (name: string) => `/design/portfolio-34/${name}.svg`;

export function PortfolioHeaderActions({
  base,
  profileControl,
  readOnlyPreview = false,
}: {
  base: string;
  profileControl?: ReactNode;
  readOnlyPreview?: boolean;
}) {
  return (
    <nav className={styles.actions} aria-label="Global actions">
      {!readOnlyPreview && (
        <>
          <Link
            className="button ghost iconButton"
            href={`${base}?log=1`}
            aria-label="Quick log"
            title="Quick log"
          >
            <img src={asset("quick-log")} alt="" />
          </Link>
          <Link
            className="button ghost iconButton"
            href="/calendar"
            aria-label="Master calendar"
            title="Master calendar"
          >
            <img src={asset("calendar")} alt="" />
          </Link>
          <ScopedLink
            className="button ghost iconButton"
            href="/modules/intelligence"
            aria-label="Search intelligence"
            title="Search intelligence"
          >
            <img src={asset("search")} alt="" />
          </ScopedLink>
          <ScopedLink
            className="button ghost iconButton"
            href="/meri/updates"
            aria-label="Updates"
            title="Updates"
          >
            <img src={asset("updates")} alt="" />
          </ScopedLink>
        </>
      )}
      <div className={styles.avatar}>{profileControl ?? <UserButton />}</div>
    </nav>
  );
}
