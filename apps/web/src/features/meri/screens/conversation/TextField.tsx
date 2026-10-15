"use client";
import { useId, type ComponentProps } from "react";
import styles from "./conversation.module.css";

/** Labelled single-line input matching the Figma 3.4 field (label 12px, 44px input). */
export function TextField({
  label,
  className,
  ...input
}: { label: string } & Omit<ComponentProps<"input">, "id">) {
  const id = useId();
  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" {...input} />
    </div>
  );
}
