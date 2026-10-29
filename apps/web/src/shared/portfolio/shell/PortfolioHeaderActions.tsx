"use client";
/* Figma supplies the static line icons. The signed-in avatar is supplied by Clerk. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import styles from "./shell.module.css";

const asset = (name: string) => `/design/411-41421-${name}`;

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
            <img src={asset("imgIcon3.svg")} alt="" />
          </Link>
          <Link
            className="button ghost iconButton"
            href="/calendar"
            aria-label="Master calendar"
            title="Master calendar"
          >
            <img src={asset("imgIcon4.svg")} alt="" />
          </Link>
          <Link
            className="button ghost iconButton"
            href="/portfolio?search=1"
            aria-label="Search clients by name"
            title="Search clients by name"
          >
            <img src={asset("imgIcon5.svg")} alt="" />
          </Link>
          <button
            className="button ghost iconButton"
            disabled
            aria-label="Updates unavailable"
            title="Updates contract has not been connected"
          >
            <img src={asset("imgIcon6.svg")} alt="" />
          </button>
        </>
      )}
      <div className={styles.avatar}>{profileControl ?? <UserButton />}</div>
    </nav>
  );
}
