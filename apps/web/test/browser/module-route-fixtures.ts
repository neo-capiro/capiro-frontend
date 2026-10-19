import type { OperationResponse } from "../../src/shared/capiro/contracts";
import type { capiroOperations } from "../../src/shared/capiro/registry";
import { testIdentity } from "./fixtures";

type ReadFixtures = {
  [Key in keyof typeof capiroOperations]?: OperationResponse<
    (typeof capiroOperations)[Key]
  >;
};
/** Explicit empty permitted datasets; unknown operations remain disclosed failures. */
export const moduleRouteFixtures = {
  "me.read": testIdentity,
  "clients.list": [],
  "engagement.meetings": [],
  "engagement.sessions": [],
  "engagement.outreach": [],
  "planner.bootstrap": {
    me: { id: "test-user", name: "Test User" },
    people: [],
    projects: [],
  },
  "planner.tasks": { items: [], nextCursor: null },
  "workspace.documents": { items: [], nextCursor: null },
  "strategies.list": [],
  "strategies.phases": [],
  "strategies.proposals": [],
  "directory.contacts": {
    contacts: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totals: { all: 0, house: 0, senate: 0, governors: 0, staff: 0 },
    availableStates: [],
    availableFilters: {
      chambers: [],
      parties: [],
      committees: [],
      issues: [],
      roles: [],
      states: [],
    },
  },
  "directory.favorites": [],
  "intelligence.explorer.bills": { rows: [], total: 0 },
  "intelligence.explorer.bill-facets": {
    congresses: [],
    subjects: [],
    chambers: [],
    parties: [],
    policyAreas: [],
  },
  "research.list": { items: [], nextCursor: null },
} satisfies ReadFixtures;
