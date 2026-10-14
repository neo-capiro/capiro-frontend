"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { Destinations } from "@/shared/portfolio/config/config";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClients, useAccountOwners } from "./queries";
import {
  clearPortfolioFilters,
  filterClients,
  portfolioHref,
  readPortfolioState,
  sortClients,
} from "./filter";
import { CreateProfileDialog } from "./CreateProfileDialog";
import { PortfolioProfiles } from "./PortfolioProfiles";
import { IndexOwnerFilter } from "./IndexOwnerFilter";
import { IndexNavigation } from "./IndexNavigation";
import { PortfolioPulse } from "./PortfolioPulse";
import { GlobalQuickLog } from "./GlobalQuickLog";
import { PortfolioAttention } from "./attention/public";
import { GlobalObjectiveClientPicker } from "@/features/portfolio/objectives/global-create/public";
import styles from "./portfolio.module.css";

export function PortfolioIndex({
  destinations,
}: {
  destinations: Destinations;
}) {
  const clients = useClients();
  const records =
    clients.isSuccess && !clients.error ? clients.data : undefined;
  const owners = useAccountOwners();
  const identity = useIdentity();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const objectiveTrigger = useRef<HTMLButtonElement>(null);
  const customizeTrigger = useRef<HTMLButtonElement>(null);
  const finishCustomizing = () => {
    setCustomizing(false);
    customizeTrigger.current?.focus();
  };
  const state = readPortfolioState(params);
  const permitted =
    !identity.error &&
    (identity.data?.role === "standard_user" ||
      canAdminister(identity.data?.role));
  const set = (key: string, value: string) =>
    router.replace(
      portfolioHref(pathname, new URLSearchParams(params), key, value),
      { scroll: false },
    );
  const clear = () =>
    router.replace(
      clearPortfolioFilters(pathname, new URLSearchParams(params)),
      { scroll: false },
    );
  const rows = sortClients(
    filterClients(
      records ?? [],
      state,
      owners.error ? {} : (owners.data ?? {}),
    ).filter((client) => !state.type || client.profileType === state.type),
    state.sort,
  );
  const ownerFilterWaiting = Boolean(
    state.owner && (owners.isPending || owners.error),
  );
  const activeFilters = Boolean(
    state.search || state.status || state.sector || state.owner || state.type,
  );
  return (
    <Shell destinations={destinations}>
      <div className={`page ${styles.indexPage}`}>
        <header className={`pageHeader ${styles.indexHeader}`}>
          <div className="stack" style={{ gap: 10 }}>
            <p className="eyebrow">Your client portfolio</p>
            <h1 className={styles.title}>
              Portfolio <span>{records?.length ?? "—"}</span>
            </h1>
          </div>
          <div className={styles.headerActions}>
            <IndexOwnerFilter
              state={state}
              owners={owners.error ? undefined : owners.data}
              ownerPending={owners.isPending}
              disabled={customizing}
              set={set}
            />
            <label className={styles.search}>
              <Search size={16} aria-hidden="true" />
              <input
                aria-label="Search profiles"
                autoFocus={params.has("search")}
                placeholder="Search profiles…"
                value={state.search}
                disabled={customizing}
                onChange={(e) => set("q", e.target.value)}
              />
            </label>
            <button
              className={`button ${styles.customize}`}
              ref={customizeTrigger}
              aria-expanded={customizing}
              onClick={() => setCustomizing(true)}
            >
              Customize
            </button>
            <button
              className={`button primary ${styles.createProfile}`}
              disabled={!permitted}
              onClick={() => setCreating(true)}
            >
              <Plus size={16} aria-hidden="true" />
              Add profile
            </button>
          </div>
        </header>
        <QueryState
          error={identity.error}
          retry={() => void identity.refetch()}
        />
        {identity.data && !permitted && !identity.error && (
          <p className="muted">Your role does not allow creating profiles.</p>
        )}
        <PortfolioPulse clients={records} />
        {state.unsupportedSort && (
          <p className="status" role="status">
            This sort is unavailable. Showing most recently added profiles.{" "}
            <button className="button ghost" onClick={() => set("sort", "")}>
              Use recent order
            </button>
          </p>
        )}
        {state.type === "PROSPECT" && (
          <p className="status" role="status">
            These are legacy prospect profiles. Current Business Development
            prospects are in <Link href="/portfolio/prospects">Prospects</Link>.
          </p>
        )}
        <QueryState
          pending={clients.isPending}
          error={clients.error}
          retry={() => void clients.refetch()}
        />
        {owners.error && (
          <QueryState
            error={owners.error}
            retry={() => void owners.refetch()}
          />
        )}
        <div className={styles.columns}>
          {records && <PortfolioAttention clients={records} />}
          <section className="stack" aria-label="Portfolio profiles">
            <IndexNavigation
              records={records}
              customizing={customizing}
              state={state}
              permitted={permitted}
              objectiveTrigger={objectiveTrigger}
              onObjective={() => set("new", "objective")}
              set={set}
              clear={clear}
            />
            {records && (
              <>
                {ownerFilterWaiting && !customizing ? (
                  <div className="status" role="status">
                    {owners.isPending
                      ? "Loading account owners…"
                      : "The account owner filter cannot be applied until owners are available."}
                  </div>
                ) : (
                  <>
                    <p
                      className={
                        customizing || activeFilters
                          ? styles.resultCount
                          : "srOnly"
                      }
                      role="status"
                    >
                      {customizing ? (
                        <>
                          Customize the current accessible catalog. Your filters
                          and view will be restored when you finish.
                        </>
                      ) : (
                        <>
                          {rows.length}{" "}
                          {rows.length === 1 ? "profile" : "profiles"}
                          {activeFilters ? ` of ${records.length}` : ""}
                        </>
                      )}
                    </p>
                    {(customizing ? records.length > 0 : rows.length > 0) ? (
                      <PortfolioProfiles
                        catalog={records}
                        customizing={customizing}
                        onFinishCustomizing={finishCustomizing}
                        rows={rows}
                        state={state}
                        filtered={activeFilters}
                        owners={owners.error ? undefined : owners.data}
                        onRefreshCatalog={() => void clients.refetch()}
                      />
                    ) : (
                      <div className="status">
                        <h3>
                          {records.length
                            ? "No profiles found"
                            : "No profiles yet"}
                        </h3>
                        <p className="muted">
                          {records.length
                            ? "Try a different search or clear your filters."
                            : "Add your first client or track a prospect in Business Development."}
                        </p>
                        {activeFilters && !customizing && (
                          <button className="button" onClick={clear}>
                            Clear filters
                          </button>
                        )}
                        {!activeFilters && permitted && (
                          <button
                            className="button"
                            onClick={() => setCreating(true)}
                          >
                            Add profile
                          </button>
                        )}
                      </div>
                    )}
                    {!customizing &&
                      rows.length > 0 &&
                      (state.view !== "cards" ||
                        state.sort !== "saved" ||
                        activeFilters) && (
                        <p className="muted">
                          Select Customize to rearrange all profiles in their
                          saved order.
                        </p>
                      )}
                  </>
                )}
                {state.view === "cards" && permitted && (
                  <button
                    className={styles.addCard}
                    onClick={() => setCreating(true)}
                  >
                    + Add profile
                  </button>
                )}
              </>
            )}
            {customizing && !records?.length && (
              <button className="button" onClick={finishCustomizing}>
                Done customizing
              </button>
            )}
          </section>
        </div>
        {records && <GlobalQuickLog clients={records} />}
        <CreateProfileDialog
          open={creating}
          onOpenChange={setCreating}
          destinations={destinations}
        />
        <GlobalObjectiveClientPicker
          open={params.get("new") === "objective"}
          onCloseAutoFocus={(event) => {
            if (
              objectiveTrigger.current &&
              !objectiveTrigger.current.disabled
            ) {
              event.preventDefault();
              objectiveTrigger.current.focus();
            }
          }}
          onOpenChange={(open) => {
            if (!open) {
              const next = new URLSearchParams(params);
              next.delete("new");
              router.replace(`/portfolio?${next}`, { scroll: false });
            }
          }}
          onContinue={(clientId) =>
            router.push(`/portfolio/${clientId}/objectives?new=1`)
          }
        />
      </div>
    </Shell>
  );
}
