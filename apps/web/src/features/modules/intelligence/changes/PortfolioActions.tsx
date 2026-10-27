"use client";
import { z } from "zod";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import { ResearchReviews } from "../../research-portfolios/reviews-public";
import { useResearchLocation } from "../research/ResearchNavigation";
import styles from "../intelligence.module.css";
export function PortfolioActions() {
  const { params, update } = useResearchLocation();
  const id = params.get("changesPortfolioId") || "";
  const valid = z.uuid().safeParse(id).success;
  const cursor = params.get("changesPortfolioCursor") || undefined;
  const list = useCapiroQuery(
    "research.list",
    { query: { cursor, limit: 50 } },
    { enabled: !id },
  );
  const detail = useCapiroQuery(
    "research.detail",
    { params: { id } },
    { enabled: valid },
  );
  const portfolio = detail.data?.id === id ? detail.data : undefined;
  return (
    <Panel
      title="Portfolio actions"
      description="Choose an authorized research portfolio to work its review queue. Portfolio selection is independent of the selected client."
    >
      {id ? (
        <>
          <ActionButton onClick={() => update({ changesPortfolioId: null })}>
            Choose another portfolio
          </ActionButton>
          <StatusPanel
            loading={detail.loading}
            error={
              !valid
                ? "The portfolio selection is invalid."
                : detail.error ||
                  (detail.data && !portfolio
                    ? "The portfolio response does not match this selection."
                    : undefined)
            }
            onRetry={detail.reload}
          >
            {portfolio && (
              <>
                <p className={styles.content}>
                  {portfolio.name} · {portfolio.myRole} · {portfolio.lifecycle}
                </p>
                <ResearchReviews
                  key={portfolio.id}
                  portfolio={portfolio}
                  onReload={detail.reload}
                />
              </>
            )}
          </StatusPanel>
        </>
      ) : (
        <StatusPanel
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
        >
          <DataTable
            rows={list.data?.items || []}
            rowKey={(r) => r.id}
            caption="Authorized portfolios for actions"
            columns={[
              { key: "name", label: "Portfolio", render: (r) => r.name },
              { key: "role", label: "Current role", render: (r) => r.myRole },
              { key: "status", label: "Status", render: (r) => r.lifecycle },
              {
                key: "open",
                label: "Actions",
                render: (r) => (
                  <ActionButton
                    onClick={() => update({ changesPortfolioId: r.id })}
                  >
                    Open {r.name}
                  </ActionButton>
                ),
              },
            ]}
          />
          <ActionButton
            disabled={!cursor}
            onClick={() => update({ changesPortfolioCursor: null })}
          >
            First portfolios
          </ActionButton>
          <ActionButton
            disabled={!list.data?.nextCursor}
            onClick={() =>
              update({ changesPortfolioCursor: list.data?.nextCursor || null })
            }
          >
            Next portfolios
          </ActionButton>
        </StatusPanel>
      )}
    </Panel>
  );
}
