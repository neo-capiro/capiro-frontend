"use client";
import { useState } from "react";
import type {
  IntentsDecideResponse,
  IntentsProposal,
} from "@capiro/meri-client/intents";
import type { IntentsAccess } from "@/shared/meri-intents/access";
import type { ListState } from "./useIntentList";
import { isResearchShareProposal } from "./research-share-view";

type Result = { sharePath: string; commandSha256: string };

/** Fresh capability addresses live only in this identity's mounted view, never in history or recovery. */
export function useResearchShareResults(
  key: string,
  access: IntentsAccess,
  list: ListState,
) {
  const [stored, setStored] = useState({
    key,
    access,
    list,
    values: {} as Record<string, Result>,
  });
  let values =
    stored.key === key && stored.access === access ? stored.values : {};
  if (stored.key !== key || stored.access !== access || stored.list !== list) {
    if (
      list.status === "disabled" ||
      (list.status === "unavailable" && list.accessLost)
    )
      values = {};
    else if (list.status === "ready")
      values = Object.fromEntries(
        Object.entries(values).filter(([id, result]) =>
          list.items.some(
            (item) =>
              item.state === "prepared" &&
              item.kind === "research_share" &&
              "proposal" in item &&
              item.proposal.proposalId === id &&
              item.proposal.commandSha256 === result.commandSha256 &&
              item.proposalStatus === "succeeded",
          ),
        ),
      );
    setStored({ key, access, list, values });
  }
  return {
    results: Object.entries(values).map(([proposalId, value]) => ({
      proposalId,
      ...value,
    })),
    accept(
      proposal: IntentsProposal,
      decision: "approved" | "rejected",
      reply: IntentsDecideResponse,
    ) {
      if (
        decision !== "approved" ||
        !isResearchShareProposal(proposal) ||
        proposal.operation !== "publish_research_portfolio_share_link" ||
        reply.status !== "research_share_decided" ||
        reply.proposalStatus !== "succeeded" ||
        !reply.oneTimeResult
      )
        return;
      const sharePath = reply.oneTimeResult.sharePath;
      setStored((previous) => ({
        key,
        access,
        list,
        values: {
          ...(previous.key === key && previous.access === access
            ? previous.values
            : {}),
          [proposal.proposalId]: {
            sharePath,
            commandSha256: proposal.commandSha256,
          },
        },
      }));
    },
    dismiss(id: string) {
      setStored((previous) => {
        const next = { ...previous.values };
        delete next[id];
        return { ...previous, values: next };
      });
    },
  };
}
