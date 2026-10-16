"use client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@capiro/ui/dialog";
import ui from "../../ui/meri-ui.module.css";
import styles from "./routines.module.css";

/** Overlay · Cancel future runs?: confirmation opened from routine controls. */
export function CancelRoutineDialog({
  routine,
  unavailable,
}: {
  routine: string;
  unavailable: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className={ui.ghost}>Cancel routine</DialogTrigger>
      <DialogContent className={styles.dialog} showCloseButton={false}>
        <DialogTitle>Cancel future runs?</DialogTitle>
        <DialogDescription className={ui.muted}>
          {routine} · Past outputs follow retention and access policies.
        </DialogDescription>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Confirm cancellation
        </button>
        <DialogClose className={ui.outline}>Keep routine</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
