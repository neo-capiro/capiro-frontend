"use client";
import { staffProfileId } from "../../../shared/capiro/operations/directory-staff-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../shared/module-ui";
import { StaffProfileContent } from "./StaffProfileContent";
import { StaffProfileTrips } from "./StaffProfileTrips";

export function StaffProfile({
  id,
  onBack,
  parentName,
}: {
  id: string;
  onBack: () => void;
  parentName?: string;
}) {
  const valid = staffProfileId.safeParse(id).success;
  const query = useCapiroQuery(
    "directory.staffDetail",
    { params: { staffId: id } },
    { enabled: valid },
  );
  const detail = !query.error && query.data?.id === id ? query.data : undefined;
  const error = !valid
    ? "This staff profile link is invalid."
    : (query.error ??
      (query.data && !detail
        ? "The returned staff profile does not match the selected staff member."
        : undefined));
  return (
    <>
      <ActionButton onClick={onBack}>
        ← Back to {parentName || "directory"}
      </ActionButton>
      <StatusPanel loading={query.loading} error={error} onRetry={query.reload}>
        {detail ? (
          <>
            <StaffProfileContent staff={detail} />
            <StaffProfileTrips id={detail.id} />
          </>
        ) : (
          !error && <p role="status">Staff profile unavailable.</p>
        )}
      </StatusPanel>
    </>
  );
}
