"use client";
import type { ReactNode } from "react";
import { ActionButton, Field } from "../../../../shared/module-ui";
import styles from "./legiwatch.module.css";

export function LegiWatchTabs({
  value,
  items,
  onChange,
  label = "LegiWatch views",
}: {
  value: string;
  items: readonly { id: string; label: string }[];
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <nav aria-label={label} className={styles.tabs}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-current={value === item.id ? "page" : undefined}
          className={value === item.id ? styles.active : ""}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
export function LegiWatchHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className={styles.header}>
      <p className={styles.eyebrow}>Modules / LegiWatch</p>
      <h1>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </header>
  );
}
export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <select
        className={styles.select}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </Field>
  );
}
export function SourceLink({
  href,
  children,
}: {
  href?: string | null;
  children: ReactNode;
}) {
  if (!href || !/^https?:\/\//i.test(href))
    return (
      <span className={styles.description}>
        Official source is not available.
      </span>
    );
  return (
    <a
      className={styles.link}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
    >
      {children}
    </a>
  );
}
export function PageControls({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className={styles.pagination}>
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
          : "No records"}
      </span>
      <div className={styles.actions}>
        <ActionButton disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </ActionButton>
        <ActionButton
          disabled={page * pageSize >= total}
          onClick={() => onChange(page + 1)}
        >
          Next
        </ActionButton>
      </div>
    </div>
  );
}
export function timecode(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function hearingDate(date: string, instant?: string | null) {
  if (instant)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
      timeZone: "America/New_York",
    }).format(new Date(instant));
  const parts = date.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((value) => !value)) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!)));
}
export function downloadText(
  text: string,
  filename: string,
  contentType: string,
) {
  const url = URL.createObjectURL(new Blob([text], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
