"use client";
import Link from "next/link";
import { Button } from "@capiro/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@capiro/ui/dropdown-menu";
import { DesignIcon } from "./DesignIcon";
import overlay from "./fixture-overlays.module.css";
import styles from "./shell.module.css";

/** Figma 3.4 Overlay · Account menu for the synthetic fixture identity; Sign out is not executed. */
export function FixtureAccountMenu({
  assetSet,
  open,
  onOpenChange,
}: {
  assetSet: "home" | "cited-answer";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={styles.action}
          aria-label="Account menu"
        >
          <DesignIcon name="profile" assetSet={assetSet} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={`${overlay.surface} ${overlay.menu}`}
      >
        <DropdownMenuLabel className={overlay.title}>
          Jordan Clayton
        </DropdownMenuLabel>
        <p className={overlay.muted}>Current workspace · Capiro</p>
        <DropdownMenuItem asChild className={overlay.item}>
          <Link href="/meri/fixture/personal-preferences">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled
          className={overlay.item}
          title="Disconnected synthetic fixture: this action is not executed."
        >
          Sign out
        </DropdownMenuItem>
        <DropdownMenuItem className={overlay.item}>Close</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
