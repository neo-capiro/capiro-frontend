"use client";
import { useEffect, useState } from "react";
import { Button } from "@capiro/ui/button";
import { DesignIcon } from "./DesignIcon";
import { FixtureAccountMenu } from "./FixtureAccountMenu";
import { FixtureUpdatesPanel } from "./FixtureUpdatesPanel";
import { onHeaderOverlay, type HeaderOverlay } from "./header-overlays";
import styles from "./shell.module.css";

/** Fixture-mode Updates and Profile actions: each opens its Figma 3.4 overlay; one is open at a time. */
export function FixtureHeaderActions({
  assetSet,
}: {
  assetSet: "home" | "cited-answer";
}) {
  const [open, setOpen] = useState<HeaderOverlay | null>(null);
  useEffect(() => onHeaderOverlay(setOpen), []);
  const toggle = (overlay: HeaderOverlay) => (next: boolean) =>
    setOpen(next ? overlay : null);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={styles.action}
        aria-label="Updates"
        aria-haspopup="dialog"
        aria-expanded={open === "updates"}
        onClick={() => setOpen("updates")}
      >
        <DesignIcon name="updates" assetSet="header-34-20261016" />
      </Button>
      <FixtureAccountMenu
        assetSet={assetSet}
        open={open === "account"}
        onOpenChange={toggle("account")}
      />
      <FixtureUpdatesPanel
        open={open === "updates"}
        onOpenChange={toggle("updates")}
      />
    </>
  );
}
