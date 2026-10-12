"use client";

import { Button } from "@capiro/ui/button";
import { Input } from "@capiro/ui/input";
import { Textarea } from "@capiro/ui/textarea";
import type { ComponentProps, ReactNode } from "react";
import styles from "./module-ui.module.css";

export function ActionButton({
  primary = false,
  className = "",
  ...props
}: ComponentProps<typeof Button> & { primary?: boolean }) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      {...props}
      className={`${styles.button} ${primary ? styles.primary : ""} ${className}`}
    />
  );
}

export function TextInput(props: ComponentProps<typeof Input>) {
  return (
    <Input {...props} className={`${styles.input} ${props.className ?? ""}`} />
  );
}

export function TextArea(props: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={`${styles.textarea} ${props.className ?? ""}`}
    />
  );
}

export function Field({
  label,
  htmlFor,
  children,
  description,
  error,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  description?: string;
  error?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {description && <p>{description}</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
