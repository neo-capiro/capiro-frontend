"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionButton, PageHeader, Tabs } from "../../../shared/module-ui";
import {
  directoryViews,
  resolveDirectoryView,
} from "../../../shared/shell/directory-views";
import { CommitteesScreen } from "./committees/CommitteesScreen";
import { CommitteeDirectory } from "./CommitteeDirectory";
import { CongressionalContacts } from "./CongressionalContacts";
import { PersonnelDirectory } from "./PersonnelDirectory";
import { readPersonnelId } from "./personnel-selection";
import { StateDirectory } from "./StateDirectory";
export function DirectoryScreen() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const view = resolveDirectoryView(params.get("view")).id;
  const [favorites, setFavorites] = useState(false);
  const [personnelDetailOpen, setPersonnelDetailOpen] = useState(
    () => view === "department-of-war" && readPersonnelId(params) !== null,
  );
  const setView = (nextView: string) => {
    if (!directoryViews.some((item) => item.id === nextView)) return;
    const next = new URLSearchParams(params.toString());
    next.set("view", nextView);
    next.delete("personnelId");
    next.delete("personnelPreviewId");
    next.delete("committeeId");
    next.delete("jurisdiction");
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const showDirectoryNavigation =
    view !== "department-of-war" || !personnelDetailOpen;
  return (
    <>
      {showDirectoryNavigation && (
        <>
          <PageHeader
            title="Directory"
            actions={
              <ActionButton
                aria-pressed={favorites}
                onClick={() => {
                  setFavorites(!favorites);
                  setView("congressional-staff");
                }}
              >
                ★ Favorites
              </ActionButton>
            }
          />
          <Tabs items={directoryViews} value={view} onChange={setView} />
        </>
      )}
      {view === "congressional-staff" && (
        <CongressionalContacts key={view} favoritesOnly={favorites} />
      )}{" "}
      {view === "committee-staff" && <CommitteeDirectory />}
      {view === "department-of-war" && (
        <PersonnelDirectory onDetailChange={setPersonnelDetailOpen} />
      )}
      {view === "state-legislators" && <StateDirectory />}
      {view === "committees" && <CommitteesScreen />}
    </>
  );
}
