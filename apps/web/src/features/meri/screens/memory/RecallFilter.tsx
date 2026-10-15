"use client";
import { ListFilter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@capiro/ui/dropdown-menu";
import ui from "../../ui/meri-ui.module.css";
import styles from "./memory.module.css";

export type RecallPeriod = "current" | "history";
const periods: readonly { id: RecallPeriod; label: string }[] = [
  { id: "current", label: "Current" },
  { id: "history", label: "History only" },
];

/** Recall period filter: current memory with its labeled history, or history alone. */
export function RecallFilter({
  value,
  onChange,
}: {
  value: RecallPeriod;
  onChange: (value: RecallPeriod) => void;
}) {
  const label = periods.find((period) => period.id === value)?.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={ui.outline}
        aria-label={`Memory period: ${label}`}
      >
        <ListFilter aria-hidden /> {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={styles.filterMenu}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) =>
            onChange(next === "history" ? "history" : "current")
          }
        >
          {periods.map((period) => (
            <DropdownMenuRadioItem key={period.id} value={period.id}>
              {period.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
