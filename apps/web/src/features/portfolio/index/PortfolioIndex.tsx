"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import type { Destinations } from "@/shared/portfolio/config/config";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClients, useAccountOwners, useMemberOptions } from "./queries";
import { useProspects } from "@/features/portfolio/prospects/public";
import {
  clearPortfolioFilters,
  portfolioHref,
  readPortfolioState,
} from "./filter";
import { projectPortfolioCatalog } from "./catalog-projection";
import { CreateProfileDialog } from "./CreateProfileDialog";
import { PortfolioProfiles } from "./PortfolioProfiles";
import { ProspectResults } from "./ProspectResults";
import { IndexPipeline } from "./IndexPipeline";
import { IndexOwnerFilter } from "./IndexOwnerFilter";
import { IndexNavigation } from "./IndexNavigation";
import { PortfolioPulse } from "./PortfolioPulse";
import { GlobalQuickLog } from "./GlobalQuickLog";
import { PortfolioAttention } from "./attention/public";
import { GlobalObjectiveClientPicker } from "@/features/portfolio/objectives/global-create/public";
import styles from "./portfolio.module.css";

function portfolioWeekLabel(today: Date) {
  const weekStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  const fiscalYear =
    today.getUTCFullYear() + (today.getUTCMonth() >= 9 ? 1 : 0);
  const week = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(weekStart);
  return `FY${String(fiscalYear).slice(-2)} · WEEK OF ${week.toUpperCase()}`;
}

export function PortfolioIndex({
  destinations,
}: {
  destinations: Destinations;
}) {
  const params = useSearchParams();
  const state = readPortfolioState(params);
  const includeProspects = state.type !== "CLIENT";
  const clients = useClients();
  const records =
    clients.isSuccess && !clients.error ? clients.data : undefined;
  const owners = useAccountOwners();
  const prospectOwners = useMemberOptions({ enabled: includeProspects });
  const prospects = useProspects(
    { search: "", stage: "", ownerId: "", status: "active" },
    { enabled: includeProspects },
  );
  const prospectData =
    includeProspects &&
    prospects.isSuccess &&
    prospects.isFetchedAfterMount &&
    !prospects.error
      ? prospects.data
      : undefined;
  const prospectRecords = prospectData?.prospects;
  const prospectVisibleCount = prospectData?.counts.visible;
  const prospectOptions = includeProspects ? prospectOwners.data : undefined;
  const identity = useIdentity();
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
  const { rows, visibleProspects, prospectsCapped, prospectCount, allCount } =
    projectPortfolioCatalog({
      records,
      prospectRecords,
      prospectVisibleCount,
      state,
      owners: owners.error ? {} : (owners.data ?? {}),
    });
  const prospectiveOwnerById = Object.fromEntries(
    (prospectOptions ?? []).map((member) => [member.id, member]),
  );
  const ownerFilterWaiting = Boolean(
    state.owner &&
    state.type !== "PROSPECT" &&
    (owners.isPending || owners.error),
  );
  const today = new Date();
  const fiscalYear =
    today.getUTCFullYear() + (today.getUTCMonth() >= 9 ? 1 : 0);
  const activeFilters = Boolean(
    state.search || state.status || state.sector || state.owner || state.type,
  );
  const criteriaFilters = Boolean(
    state.search || state.status || state.sector || state.owner,
  );
  return (
    <Shell destinations={destinations}>
      <div className={`page ${styles.indexPage}`}>
        <header className={`pageHeader ${styles.indexHeader}`}>
          <div className="stack" style={{ gap: 10 }}>
            <p className="eyebrow">{portfolioWeekLabel(today)}</p>
            <h1 className={styles.title}>
              Portfolio <span>{allCount ?? "—"}</span>
            </h1>
          </div>
          <div className={styles.headerActions}>
            <IndexOwnerFilter
              state={state}
              owners={owners.error ? undefined : owners.data}
              options={prospectOptions}
              ownerPending={
                state.type === "PROSPECT"
                  ? prospectOwners.isPending
                  : owners.isPending
              }
              currentUser={identity.data?.user}
              disabled={customizing}
              set={set}
            />
            <label className={styles.search}>
              <input
                aria-label="Search profiles"
                autoFocus={params.has("search")}
                placeholder="Search clients"
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
        <PortfolioPulse clients={records} fiscalYear={fiscalYear} />
        {state.unsupportedSort && (
          <p className="status" role="status">
            This sort is unavailable. Showing most recently added profiles.{" "}
            <button className="button ghost" onClick={() => set("sort", "")}>
              Use recent order
            </button>
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
        {includeProspects && prospectOwners.error && (
          <QueryState
            error={prospectOwners.error}
            retry={() => void prospectOwners.refetch()}
          />
        )}
        <div className={styles.columns}>
          {records && <PortfolioAttention clients={records} />}
          <section className="stack" aria-label="Portfolio profiles">
            <IndexNavigation
              records={records}
              prospectCount={prospectCount}
              allCount={allCount}
              customizing={customizing}
              state={state}
              permitted={permitted}
              objectiveTrigger={objectiveTrigger}
              onObjective={() => set("new", "objective")}
              set={set}
              clear={clear}
            />
            {state.type !== "CLIENT" && (
              <QueryState
                pending={prospects.isPending}
                error={prospects.error}
                retry={() => void prospects.refetch()}
              />
            )}
            {prospectsCapped && state.type !== "CLIENT" && (
              <p className="status" role="status">
                Showing the latest {prospectRecords!.length} of{" "}
                {prospectVisibleCount} active BD prospects. Search Business
                Development to find older records.
              </p>
            )}
            {(records || prospectRecords) && (
              <>
                {ownerFilterWaiting && !customizing && (
                  <div className="status" role="status">
                    {owners.isPending
                      ? "Loading account owners…"
                      : "The account owner filter cannot be applied until owners are available."}
                  </div>
                )}
                {(!ownerFilterWaiting ||
                  customizing ||
                  visibleProspects.length > 0) && (
                  <>
                    <p
                      className={
                        customizing || criteriaFilters
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
                          {rows.length + visibleProspects.length}{" "}
                          {rows.length + visibleProspects.length === 1
                            ? "profile"
                            : "profiles"}
                          {activeFilters && allCount !== undefined
                            ? ` of ${allCount}`
                            : ""}
                        </>
                      )}
                    </p>
                    {(
                      customizing
                        ? Boolean(records?.length)
                        : rows.length + visibleProspects.length > 0
                    ) ? (
                      (state.type === "PROSPECT" || !records?.length) &&
                      !customizing ? (
                        <ProspectResults
                          coreRows={rows}
                          rows={visibleProspects}
                          view={state.view}
                          owners={prospectiveOwnerById}
                          coreOwners={owners.error ? undefined : owners.data}
                          showAdd={permitted && state.type === "PROSPECT"}
                        />
                      ) : (
                        <PortfolioProfiles
                          catalog={records ?? []}
                          customizing={customizing}
                          onFinishCustomizing={finishCustomizing}
                          rows={rows}
                          prospects={customizing ? [] : visibleProspects}
                          prospectOwners={prospectiveOwnerById}
                          state={state}
                          filtered={activeFilters}
                          owners={owners.error ? undefined : owners.data}
                          onRefreshCatalog={() => void clients.refetch()}
                        />
                      )
                    ) : (state.type === "CLIENT" && records) ||
                      (state.type === "PROSPECT" && prospectRecords) ||
                      (state.type !== "CLIENT" &&
                        state.type !== "PROSPECT" &&
                        records &&
                        prospectRecords) ? (
                      <div className="status">
                        <h3>
                          {records?.length || prospectRecords?.length
                            ? "No profiles found"
                            : "No profiles yet"}
                        </h3>
                        <p className="muted">
                          {records?.length || prospectRecords?.length
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
                    ) : null}
                    {!customizing &&
                      rows.length + visibleProspects.length > 0 &&
                      (state.view !== "cards" ||
                        state.sort !== "saved" ||
                        activeFilters) && (
                        <p className="muted">
                          Select Customize to rearrange client profiles in their
                          saved order.
                        </p>
                      )}
                  </>
                )}
                {state.view === "cards" &&
                  permitted &&
                  state.type === "PROSPECT" &&
                  Boolean(prospectRecords) &&
                  visibleProspects.length === 0 && (
                    <Link
                      className={`${styles.addCard} ${styles.prospectAddCard}`}
                      href="/portfolio/prospects?new=1"
                    >
                      + Add prospect
                    </Link>
                  )}
                {state.view === "cards" &&
                  permitted &&
                  state.type !== "PROSPECT" &&
                  Boolean(records) && (
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
        {state.type === "PROSPECT" &&
          params.get("pipeline") === "1" &&
          prospectData && (
            <IndexPipeline
              data={prospectData}
              onClose={() => set("pipeline", "")}
            />
          )}
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
