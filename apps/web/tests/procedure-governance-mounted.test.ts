import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProcedureGovernanceHost } from "../src/features/meri/procedures/ProcedureGovernanceHost";

/**
 * Mounted render of the real host and the real 09.04 surface. This workspace mounts components with
 * `renderToStaticMarkup` (jsdom and @testing-library/react are not resolvable here), so effects do not
 * run: the asynchronous lifetime itself is covered by tests/procedure-governance-host.test.ts, and this
 * file proves what the composition renders for a given current account.
 *
 * Only the host's outer collaborators are substituted — the current-account read, the scoped Capiro
 * client, the stored-row read and the Meri dialog primitive. The account gate, the role gate, the
 * unknown-outcome hold and the mutation controls are the real components.
 */

type Identity = {
  data:
    | { tenant: { id: string }; user: { id: string }; role: string }
    | undefined;
  error: unknown;
  isFetching: boolean;
};

const observed = vi.hoisted(() => ({
  identity: {
    data: {
      tenant: { id: "tenant-1" },
      user: { id: "user-1" },
      role: "user_admin",
    },
    error: null as unknown,
    isFetching: false,
  },
  rows: [] as unknown[],
  loading: false,
  error: null as string | null,
  reload: () => undefined,
  blocked: false,
  retired: [] as unknown[],
}));

const setIdentity = (identity: Identity) => {
  observed.identity = identity as typeof observed.identity;
};

/** The account scope key as it appears in the rendered attribute (React escapes the quotes). */
const accountKey = (userId: string, role: string) =>
  JSON.stringify(["tenant-1", userId, role]).replace(/"/g, "&quot;");

vi.mock("../src/shared/portfolio/auth/identity", () => ({
  canAdminister: () => false,
  useIdentity: () => observed.identity,
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: async () => ({}) }),
}));
vi.mock("../src/shared/meri-procedures/client", () => ({
  createProcedureGovernanceClient: () => ({
    list: async () => observed.rows,
    create: async () => ({}),
    update: async () => ({}),
    setEnabled: async () => ({}),
    remove: async () => ({}),
    restore: async () => ({}),
    dryRun: async () => ({}),
    unknownCustody: () => [],
    requiresReadback: () => observed.blocked,
    retireStaleCommands: () => observed.retired,
    retiredCount: () => observed.retired.length,
    commands: [],
  }),
}));
vi.mock("../src/features/meri/conversation/evidence/useCurrentRead", () => ({
  useCurrentRead: () => ({
    value: observed.rows,
    error: observed.error,
    loading: observed.loading,
    reload: observed.reload,
  }),
}));
vi.mock("../src/features/meri/ui/MeriDialog", () => ({
  MeriDialog: () => null,
}));
vi.mock("../src/features/meri/ui/meri-ui.module.css", () => ({ default: {} }));
vi.mock("../src/features/meri/ui/surfaces.module.css", () => ({ default: {} }));

type Row = {
  id: string;
  skillId: string;
  name: string;
  skill: unknown;
  version: number;
  versions: Array<{ version: number; savedAt: string }>;
  enabled: boolean;
  runnable: boolean;
  procedureDigest: string | null;
  procedureScopes: string[];
  validationErrors: string[];
  createdAt: string;
  updatedAt: string;
};

function storedRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    skillId: "custom_procedure",
    name: "Custom procedure",
    skill: {
      id: "custom_procedure",
      name: "Custom procedure",
      triggers: ["custom_procedure"],
    },
    version: 3,
    versions: [{ version: 2, savedAt: "2026-10-26T00:00:00.000Z" }],
    enabled: true,
    runnable: true,
    procedureDigest: "a".repeat(64),
    procedureScopes: ["client"],
    validationErrors: [],
    createdAt: "2026-10-25T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z",
    ...overrides,
  };
}

const mount = () =>
  renderToStaticMarkup(createElement(ProcedureGovernanceHost));

it("renders the stored rows for the current Core account with available controls", () => {
  setIdentity({
    data: {
      tenant: { id: "tenant-1" },
      user: { id: "user-1" },
      role: "user_admin",
    },
    error: null,
    isFetching: false,
  });
  observed.rows = [storedRow()];
  observed.loading = false;
  observed.error = null;
  observed.blocked = false;
  const markup = mount();
  expect(markup).toContain('data-account-key="');
  expect(markup).toContain(accountKey("user-1", "user_admin"));
  expect(markup).toContain("Firm procedures and their stored versions");
  expect(markup).toContain("Custom procedure");
  expect(markup).toContain("v3");
  expect(markup).toContain("a".repeat(12));
  // The operator can act on this account: no control is held.
  expect(markup).not.toContain("disabled");
  expect(markup).not.toContain("requires the current Core user_admin");
  expect(markup).not.toContain(
    "result of the last firm procedure change is unknown",
  );
});

it("renders a different account scope key, so no previous account's surface carries over", () => {
  setIdentity({
    data: {
      tenant: { id: "tenant-1" },
      user: { id: "user-2" },
      role: "capiro_admin",
    },
    error: null,
    isFetching: false,
  });
  observed.rows = [];
  observed.loading = false;
  observed.error = null;
  observed.blocked = false;
  const markup = mount();
  expect(markup).toContain(accountKey("user-2", "capiro_admin"));
  expect(markup).not.toContain(accountKey("user-1", "user_admin"));
});

it("denies every visible control to a role that cannot govern, and never claims to read", () => {
  setIdentity({
    data: {
      tenant: { id: "tenant-1" },
      user: { id: "user-3" },
      role: "standard_user",
    },
    error: null,
    isFetching: false,
  });
  observed.rows = [storedRow()];
  // Even with a read apparently in flight, the surface must not present itself as reading rows this
  // role may not read: the host issues no read at all without the current admin role.
  observed.loading = true;
  observed.blocked = false;
  const markup = mount();
  expect(markup).toContain("requires the current Core user_admin");
  expect(markup).not.toContain("Reading the stored firm procedures");
  expect(markup).toContain("disabled");
});

it("holds every control while an unknown outcome still needs a read-back", () => {
  setIdentity({
    data: {
      tenant: { id: "tenant-1" },
      user: { id: "user-1" },
      role: "user_admin",
    },
    error: null,
    isFetching: false,
  });
  observed.rows = [storedRow()];
  observed.loading = false;
  observed.blocked = true;
  const markup = mount();
  expect(markup).toContain(
    "result of the last firm procedure change is unknown",
  );
  expect(markup).toContain("Check current stored state");
  expect(markup).toContain("disabled");
});

it("renders the reading and failure states for the current account", () => {
  setIdentity({
    data: {
      tenant: { id: "tenant-1" },
      user: { id: "user-1" },
      role: "user_admin",
    },
    error: null,
    isFetching: false,
  });
  observed.rows = [];
  observed.blocked = false;
  observed.loading = true;
  expect(mount()).toContain("Reading the stored firm procedures");

  observed.loading = false;
  observed.error = "UNAVAILABLE";
  expect(mount()).toContain("could not be read: UNAVAILABLE");
  observed.error = null;
});

it("verifies the current account first and fails closed when it cannot be verified", () => {
  setIdentity({ data: undefined, error: null, isFetching: true });
  const verifying = mount();
  expect(verifying).toContain("Verifying the current Core account");
  expect(verifying).not.toContain("Firm procedures and their stored versions");

  setIdentity({
    data: undefined,
    error: new Error("identity unavailable"),
    isFetching: false,
  });
  const failed = mount();
  expect(failed).toContain("current Core account could not be verified");
  expect(failed).not.toContain("Firm procedures and their stored versions");
});
