/** Directory route selection and its full presentation labels share one owner. */
export const directoryViews = [
  { id: "congressional-staff", label: "Congressional Staff" },
  { id: "committee-staff", label: "Committee Staff" },
  { id: "department-of-war", label: "Department of War" },
  { id: "state-legislators", label: "State Legislators" },
  { id: "committees", label: "Committees" },
] as const;

export function resolveDirectoryView(requested: string | null) {
  return (
    directoryViews.find((view) => view.id === requested) ?? directoryViews[0]
  );
}
