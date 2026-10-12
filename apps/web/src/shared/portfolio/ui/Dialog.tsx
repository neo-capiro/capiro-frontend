"use client";
import {
  Dialog as DialogRoot,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@capiro/ui/dialog";
import type { ComponentProps, ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./dialog.module.css";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  drawer = false,
  wide = false,
  className = "",
  onCloseAutoFocus,
  onOpenAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  drawer?: boolean;
  wide?: boolean;
  className?: string;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
  onOpenAutoFocus?: ComponentProps<typeof DialogContent>["onOpenAutoFocus"];
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-modal="true"
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={onOpenAutoFocus}
        className={`${styles.content} ${drawer ? styles.drawer : ""} ${wide ? styles.wide : ""} ${className}`}
      >
        <header className="row between">
          <DialogTitle asChild>
            <h2>{title}</h2>
          </DialogTitle>
          <DialogClose className="button ghost iconButton" aria-label="Close">
            <X size={16} />
          </DialogClose>
        </header>
        {description ? (
          <DialogDescription className="muted">{description}</DialogDescription>
        ) : (
          <DialogDescription className="srOnly">{title}</DialogDescription>
        )}
        {children}
      </DialogContent>
    </DialogRoot>
  );
}
