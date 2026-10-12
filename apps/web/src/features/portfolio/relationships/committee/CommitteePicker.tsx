"use client";
import { useId, useLayoutEffect, useState } from "react";
import { Popover } from "radix-ui";
import { committeeLabel, type Committee } from "../directory-contracts";
import { CommitteePickerPanel } from "./CommitteePickerPanel";
import styles from "./committee-picker.module.css";

export function CommitteePicker({
  committees,
  value,
  onChange,
  disabled = false,
}: {
  committees: Committee[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = committees.find((row) => row.id === value);
  useLayoutEffect(() => () => setOpen(false), []);
  return (
    <div className={styles.field}>
      <label id={`${id}-label`}>Committee / subcommittee</label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={`button ${styles.trigger}`}
            aria-labelledby={`${id}-label ${id}-value`}
            disabled={disabled}
          >
            <span id={`${id}-value`}>
              {selected
                ? committeeLabel(selected, committees)
                : value
                  ? "Selected committee unavailable"
                  : "Select a committee"}
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={styles.panel}
            align="start"
            sideOffset={6}
            collisionPadding={16}
            aria-label="Choose a committee"
            onEscapeKeyDown={(event) => event.stopPropagation()}
          >
            <CommitteePickerPanel
              committees={committees}
              value={value}
              disabled={disabled}
              onCommit={(id) => {
                onChange(id);
                setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
