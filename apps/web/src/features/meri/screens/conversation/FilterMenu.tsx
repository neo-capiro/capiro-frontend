"use client";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@capiro/ui/dropdown-menu";
import ui from "../../ui/meri-ui.module.css";
import portal from "../../ui/meri-dialog.module.css";
import styles from "./conversation.module.css";

/** Outline filter trigger whose menu narrows a local list to one value or all. */
export function FilterMenu({
  label,
  allLabel,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  icon: ReactNode;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={ui.outline} aria-label={label}>
        {icon}
        {value || allLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={`${portal.portalSurface} ${styles.menu}`}
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {["", ...options].map((option) => (
            <DropdownMenuRadioItem
              key={option || "all"}
              value={option}
              className={styles.menuItem}
            >
              {option || allLabel}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
