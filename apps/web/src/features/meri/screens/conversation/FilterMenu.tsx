"use client";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@capiro/ui/dropdown-menu";
import ui from "../../ui/meri-ui.module.css";
import portal from "../../ui/meri-dialog.module.css";
import styles from "./filter-menu.module.css";

/** 13.21 / 13.22 filter menu: an outline trigger whose menu narrows a local list to one value or all. */
export function FilterMenu({
  title,
  description,
  allLabel,
  icon,
  options,
  value,
  onChange,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  allLabel: string;
  icon: ReactNode;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** Fixture frames that show the menu open render it open on load. */
  defaultOpen?: boolean;
}) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger
        className={`${ui.outline} ${styles.trigger}`}
        aria-label={`${title}: ${value || allLabel}`}
      >
        {icon}
        {value || allLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        collisionPadding={16}
        className={`${portal.portalSurface} ${styles.menu}`}
      >
        <DropdownMenuLabel className={styles.title}>{title}</DropdownMenuLabel>
        <p className={styles.description}>{description}</p>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={onChange}
          className={styles.options}
        >
          {["", ...options].map((option) => (
            <DropdownMenuRadioItem
              key={option || "all"}
              value={option}
              className={`${ui.outline} ${styles.option}`}
            >
              {option || allLabel}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuItem className={`${ui.ghost} ${styles.option}`}>
          Close
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
