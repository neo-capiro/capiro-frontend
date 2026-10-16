/** Receiving types; runtime validation uses the exact backend 6ce5cacd JSON Schema. */
export type OperationalRevision = { id: string; version: number };
export type OperationalSelection = {
  kind:
    | "strategy"
    | "planner_project"
    | "planner_task"
    | "outreach_session"
    | "meeting"
    | "budget_package"
    | "defense_budget_cycle";
  id: string;
};
export type OperationalOwnerVersion =
  | { kind: "counter"; value: number }
  | { kind: "timestamp"; value: string }
  | { kind: "unversioned" };
export type OperationalScope = {
  clientId: string;
  objectiveId: string;
  currentRevisionId: string;
  objectiveVersion: number;
  objectiveStatus: "draft" | "in_review" | "ready";
  ownerUserId: string | null;
};
export type OperationalProvenance =
  | {
      kind: "manual";
      associationId: string;
      linkedRevision: OperationalRevision;
      linkedAt: string;
      via: OperationalSelection;
    }
  | {
      kind: "application_receipt";
      receiptId: string;
      sourceRevision: OperationalRevision;
    };
export type OperationalCycle = {
  fiscalYear: number;
  authorityTrack: string | null;
  basis: "human_annotation";
  context: {
    kind: "budget_package" | "defense_budget_cycle";
    id: string;
  } | null;
};
export type OperationalResource<
  Kind extends OperationalSelection["kind"] = OperationalSelection["kind"],
> = {
  selection: { kind: Kind; id: string };
  title: string | null;
  ownerVersion: OperationalOwnerVersion;
  observedAt: string;
};
export type OperationalStrategy = {
  resource: OperationalResource<"strategy">;
  provenance: OperationalProvenance[];
  cycles: OperationalCycle[];
  savedVersions: {
    receiptId: string;
    sourceRevision: OperationalRevision;
    id: string;
    digest: string;
    generatedJobId: string | null;
  }[];
  strategyType:
    | "appropriations"
    | "authorization"
    | "regulatory"
    | "coalition"
    | "procurement"
    | "earmark"
    | "amendment";
};
export type OperationalProject = {
  resource: OperationalResource<"planner_project">;
  provenance: OperationalProvenance[];
};
export type OperationalMeeting = {
  resource: OperationalResource<"meeting">;
  provenance: OperationalProvenance[];
  startsAt: string;
  endsAt: string | null;
};
export type OperationalDecision =
  | {
      kind: "planner_approval";
      task: OperationalResource<"planner_task">;
      approval: "pending";
      provenance: OperationalProvenance[];
    }
  | {
      kind: "outreach_proposal";
      session: OperationalResource<"outreach_session">;
      proposalId: string;
      state: "pending";
      title: string;
      provenance: OperationalProvenance[];
    };
export type OperationalRow =
  | OperationalStrategy
  | OperationalProject
  | OperationalMeeting
  | OperationalDecision;
export type OperationalCoverage =
  | "complete"
  | "partial"
  | "unbound"
  | "unavailable"
  | "not_implemented";
export type OperationalReason =
  | "association_reader_missing"
  | "membership_not_established"
  | "owner_unavailable"
  | "authorization_limited"
  | "pagination_drift"
  | "unsupported_question_lifecycle"
  | "unsupported_window_metric"
  | "unsupported_feasibility_metric"
  | "source_unverifiable";
export type OperationalSection<Row> = {
  observedAt: string;
  snapshotId: string | null;
  coverage: OperationalCoverage;
  reasons: OperationalReason[];
  total: number | null;
  nextCursor: string | null;
  items: Row[];
};
export type OperationalSectionName =
  | "strategies"
  | "projects"
  | "decisions"
  | "engagements";
export type OperationalCursors = Record<OperationalSectionName, string | null>;
export type OperationalReadRequest = {
  schemaVersion: 1;
  clientId: string;
  objectiveId: string;
  limit: number;
  cursors: OperationalCursors;
};
export type OperationalAction =
  | {
      kind: "edit_objective" | "request_review" | "confirm_ready";
      expectedObjectiveVersion: number;
    }
  | {
      kind: "open_resource";
      resource: OperationalSelection;
      ownerVersion: OperationalOwnerVersion;
      contentView: "current";
    }
  | { kind: "review_planner_approval"; taskId: string; taskVersion: number }
  | {
      kind: "review_outreach_proposal";
      sessionId: string;
      proposalId: string;
      expectedStateVersion: number;
    }
  | {
      kind: "open_generated_strategy";
      strategyId: string;
      generatedJobId: string;
      strategyVersionId: string;
      strategyVersionDigest: string;
      sourceRevision: OperationalRevision;
      contentView: "current";
    };
export type OperationalRead = {
  schemaVersion: 1;
  observedAt: string;
  asOf: string;
  projectionDigest: string;
  scope: OperationalScope;
  associationSetVersion: number | null;
  /** The initial producer has no applied-composite reader. Available projections fail closed. */
  automation: {
    availability: "not_implemented" | "unavailable";
    projection: null;
  };
  sections: {
    strategies: OperationalSection<OperationalStrategy>;
    projects: OperationalSection<OperationalProject>;
    decisions: OperationalSection<OperationalDecision>;
    questions: OperationalSection<never>;
    engagements: OperationalSection<OperationalMeeting>;
  };
  plannerMetrics: {
    observedAt: string;
    asOf: string;
    coverage: OperationalCoverage;
    reasons: OperationalReason[];
    taskCount: number | null;
    doneCount: number | null;
    overdueCount: number | null;
  };
  actions: OperationalAction[];
};
type AssociationBase = {
  schemaVersion: 1;
  requestId: string;
  clientId: string;
  objectiveId: string;
  expectedObjectiveVersion: number;
  expectedAssociationSetVersion: number;
};
export type OperationalAssociationCommand = AssociationBase &
  (
    | {
        action: "link";
        resource: OperationalSelection;
        cycles: OperationalCycle[];
      }
    | { action: "unlink"; associationId: string }
  );
export type OperationalAssociationReceipt = {
  schemaVersion: 1;
  requestId: string;
  clientId: string;
  objectiveId: string;
  commandRevision: OperationalRevision;
  associationLinkedRevision: OperationalRevision;
  action: "link" | "unlink";
  outcome: "linked" | "unlinked" | "unchanged";
  associationId: string;
  resultSetVersion: number;
  payloadDigest: string;
  committedAt: string;
};
export type OperationalAssociationLookup = {
  schemaVersion: 1;
  requestId: string;
  clientId: string;
  objectiveId: string;
};
export type OperationalFailure = {
  schemaVersion: 1;
  status: 400 | 401 | 403 | 404 | 409 | 422 | 503;
  code:
    | "MALFORMED_REQUEST"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "NOT_AVAILABLE"
    | "RECEIPT_NOT_AVAILABLE"
    | "OBJECTIVE_VERSION_CONFLICT"
    | "ASSOCIATION_VERSION_CONFLICT"
    | "CURSOR_STALE"
    | "REQUEST_CONFLICT"
    | "UNSUPPORTED_RESOURCE"
    | "OWNER_UNAVAILABLE"
    | "RECEIPT_UNVERIFIABLE";
  outcome: "rejected" | "unknown";
  requestId: string | null;
};
export type OperationalPageContext = Partial<
  Record<
    OperationalSectionName,
    {
      cursor: string;
      scope: OperationalScope;
      asOf: string;
      associationSetVersion: number | null;
      snapshotId: string | null;
      total: number | null;
      seenKeys: string[];
    }
  >
>;
export type OperationalCurrentObjective = {
  id: string;
  clientId: string;
  version: number;
  status: OperationalScope["objectiveStatus"];
};
