"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import styles from "./directory.module.css";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join("");
}

/**
 * Core's directory contact carries a `photoUrl` for members. Render that photo
 * when it is present and fall back to initials, so a missing or unreachable
 * image never leaves an empty circle. The photo is decorative: the member's
 * name is always rendered next to it.
 */
export function MemberPhoto({
  name,
  photoUrl,
  variant = "row",
}: {
  name: string;
  photoUrl?: string | null;
  variant?: "row" | "profile";
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const profile = variant === "profile";
  if (photoUrl && failedUrl !== photoUrl)
    return (
      <img
        className={profile ? styles.profilePhoto : styles.photo}
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(photoUrl)}
      />
    );
  return (
    <span
      className={profile ? styles.profileInitials : styles.avatar}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
