"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionButton, PageHeader, Tabs } from "../../../shared/module-ui";
import { CommitteeDirectory } from "./CommitteeDirectory";
import { CongressionalContacts } from "./CongressionalContacts";
import { PersonnelDirectory } from "./PersonnelDirectory";
import { readPersonnelId } from "./personnel-selection";
import { StateDirectory } from "./StateDirectory";
const views = [
  { id: "congressional-staff", label: "Congressional Staff" },
  { id: "committee-staff", label: "Committee Staff" },
  { id: "department-of-war", label: "Department of War" },
  { id: "state-legislators", label: "State Legislators" },
  { id: "state-committees", label: "State Committees" },
];
export function DirectoryScreen() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requestedView = params.get("view");
  const view = views.some((item) => item.id === requestedView)
    ? requestedView!
    : "congressional-staff";
  const [favorites, setFavorites] = useState(false);
  const [personnelDetailOpen, setPersonnelDetailOpen] = useState(
    () => view === "department-of-war" && readPersonnelId(params) !== null,
  );
  const setView = (nextView: string) => {
    if (!views.some((item) => item.id === nextView)) return;
    const next = new URLSearchParams(params.toString());
    next.set("view", nextView);
    next.delete("personnelId");
    next.delete("personnelPreviewId");
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
          <Tabs items={views} value={view} onChange={setView} />
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
      {view === "state-committees" && <StateDirectory committees />}
    </>
  );
}
