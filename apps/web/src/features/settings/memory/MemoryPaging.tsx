"use client";
import { useState } from "react";
import { SettingsButton } from "../components";
export function useMemoryPage() {
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  return {
    cursor,
    page: cursors.length + 1,
    next: (value: string) => setCursors([...cursors, value]),
    back: () => setCursors(cursors.slice(0, -1)),
  };
}
export function MemoryPaging({
  page,
  nextCursor,
  busy,
}: {
  page: ReturnType<typeof useMemoryPage>;
  nextCursor: string | null | undefined;
  busy: boolean;
}) {
  return (
    <nav aria-label="Memory pages">
      <SettingsButton disabled={busy || page.page === 1} onClick={page.back}>
        Previous page
      </SettingsButton>{" "}
      <span>Page {page.page}</span>{" "}
      <SettingsButton
        disabled={busy || !nextCursor}
        onClick={() => nextCursor && page.next(nextCursor)}
      >
        Next page
      </SettingsButton>
    </nav>
  );
}
