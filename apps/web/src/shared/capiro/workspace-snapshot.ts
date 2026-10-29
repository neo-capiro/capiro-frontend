import { canonicalWorkspaceSnapshot } from "@capiro/shared";
export { canonicalWorkspaceSnapshot };
export async function workspaceSnapshotHash(value: unknown) {
  const bytes = new TextEncoder().encode(canonicalWorkspaceSnapshot(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
