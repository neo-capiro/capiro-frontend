import { staffProfileId } from "../../../shared/capiro/operations/directory-staff-schemas";

export function staffProfileHref(
  pathname: string,
  query: string,
  id: string | null,
) {
  if (id !== null && !staffProfileId.safeParse(id).success) return null;
  const params = new URLSearchParams(query);
  if (id === null) params.delete("staffId");
  else {
    params.set("view", "congressional-staff");
    params.set("staffId", id);
  }
  return `${pathname}${params.size ? `?${params}` : ""}`;
}

export type StaffProfileRoute = {
  id: string | null;
  href: (id: string) => string | null;
  back: () => void;
};
