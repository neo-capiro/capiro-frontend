"use client";
import { useSyncExternalStore } from "react";
import { isRichSection } from "./content";
import { projectSection } from "./html";
import styles from "./rich-document.module.css";
const subscribe = () => () => {};
export function SectionPreview({ value }: { value: string }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!isRichSection(value)) return <p className={styles.literal}>{value}</p>;
  if (!mounted) return <p role="status">Loading formatted content…</p>;
  return (
    <div
      className={styles.document}
      dangerouslySetInnerHTML={{ __html: projectSection(value).html }}
    />
  );
}
