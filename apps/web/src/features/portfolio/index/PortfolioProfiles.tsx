"use client";
import type { Client, Member } from "./contracts";
import type { Prospect } from "@/features/portfolio/prospects/public";
import type { PortfolioIndexState } from "./filter";
import { ProfileCard, ProfileResults } from "./ProfileResults";
import { ProspectResults } from "./ProspectResults";
import { PortfolioLayoutEditor, usePortfolioLayout } from "./layout/public";

/** Roster metadata supplies presentation; the layout receipt owns reorderable membership. */
export function PortfolioProfiles({
  catalog,
  customizing,
  onFinishCustomizing,
  rows,
  prospects,
  prospectOwners,
  state,
  filtered,
  owners,
  onRefreshCatalog,
}: {
  catalog: Client[];
  customizing: boolean;
  onFinishCustomizing: () => void;
  rows: Client[];
  prospects: readonly Prospect[];
  prospectOwners: Record<string, Member>;
  state: PortfolioIndexState;
  filtered: boolean;
  owners?: Record<string, { accountOwner: Member | null }>;
  onRefreshCatalog: () => void;
}) {
  const currentCatalog = catalog.filter(
    (client) => client.status !== "archived",
  );
  const layout = usePortfolioLayout(currentCatalog.map(({ id }) => id));
  const layoutCatalog = currentCatalog.filter(({ id }) =>
    layout.catalogIds.includes(id),
  );
  const byId = new Map(
    (customizing ? layoutCatalog : rows).map((client) => [client.id, client]),
  );
  const ordered =
    state.sort === "saved"
      ? layout.orderedIds.flatMap((id) => {
          const client = byId.get(id);
          return client ? [client] : [];
        })
      : rows;
  return (
    <>
      {customizing && layout.receipt && (
        <p className="status" role="status">
          Customizing {layoutCatalog.length} client{" "}
          {layoutCatalog.length === 1 ? "profile" : "profiles"} you can access.
          Your filters and view will be restored when you finish.
        </p>
      )}
      {layout.error && (
        <button className="button" onClick={onRefreshCatalog}>
          Refresh profiles
        </button>
      )}
      {customizing ||
      (state.view === "cards" && state.sort === "saved" && !filtered) ? (
        <PortfolioLayoutEditor
          cards={(customizing ? layoutCatalog : currentCatalog).map(
            ({ id, name }) => ({ id, name }),
          )}
          layout={layout}
          editing={customizing}
          onFinish={onFinishCustomizing}
          renderCard={(id) => {
            const client = byId.get(id);
            return client ? (
              <ProfileCard client={client} ownership={owners?.[id]} />
            ) : null;
          }}
        />
      ) : (
        <ProfileResults rows={ordered} view={state.view} owners={owners} />
      )}
      {prospects.length > 0 && (
        <ProspectResults
          rows={prospects}
          view={state.view}
          owners={prospectOwners}
        />
      )}
    </>
  );
}
