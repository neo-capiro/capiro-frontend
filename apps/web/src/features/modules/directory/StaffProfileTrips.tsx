"use client";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { Panel, StatusPanel } from "../../../shared/module-ui";
import styles from "./directory.module.css";

export function StaffProfileTrips({ id }: { id: string }) {
  const query = useCapiroQuery("directory.staffTrips", {
    params: { contactId: id },
  });
  const trips = query.data?.contactId === id ? query.data.trips : undefined;
  return (
    <Panel title="Privately funded travel">
      <StatusPanel
        loading={query.loading}
        error={
          query.error ??
          (query.data && !trips
            ? "Travel records do not match this staff member."
            : undefined)
        }
        onRetry={query.reload}
      >
        {trips?.length === 0 && (
          <p>No travel records in the current directory snapshot.</p>
        )}
        {trips?.map((trip) => (
          <div key={trip.id} className={styles.row}>
            <div>
              <strong>{trip.purpose || "Trip"}</strong>
              <p>
                {trip.role === "approver" ? "Approver" : "Traveler"}
                {trip.otherPartyName ? ` · ${trip.otherPartyName}` : ""}
              </p>
              <p>
                {[trip.startDate, trip.endDate].filter(Boolean).join(" – ")}
                {trip.durationDays !== null
                  ? ` · ${trip.durationDays} days`
                  : ""}
              </p>
              <p>
                {trip.destinations
                  .map((destination) => destination.name)
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {trip.sponsors.length > 0 && (
                <p>
                  Sponsors:{" "}
                  {trip.sponsors
                    .map((sponsor) => sponsor.name)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {trip.companionName && <p>Companion: {trip.companionName}</p>}
              {trip.totalCost !== null && (
                <p>
                  Reported cost:{" "}
                  {trip.totalCost.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              )}
              {trip.filedDate && <p>Filed: {trip.filedDate}</p>}
            </div>
          </div>
        ))}
      </StatusPanel>
    </Panel>
  );
}
