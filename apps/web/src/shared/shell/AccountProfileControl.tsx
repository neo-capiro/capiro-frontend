"use client";
import { UserButton } from "@clerk/nextjs";
import { useContext } from "react";
import { SessionContext } from "../session/SessionContext";

/** Provider identity stays with Clerk; no client or tenant hint is passed. */
export function AccountProfileControl() {
  const session = useContext(SessionContext);
  return session === "signed-in" ? (
    <UserButton />
  ) : (
    <span role="status">
      {session === "loading"
        ? "Loading account…"
        : "Sign in to manage your account"}
    </span>
  );
}
