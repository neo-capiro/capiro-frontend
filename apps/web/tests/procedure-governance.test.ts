import { describe, expect, it, vi } from "vitest";
import type { FirmSkillGovernanceRow } from "../src/shared/capiro/operations/meri-firm-skills";
import {
  createProcedureGovernanceClient,
  type ProcedureApi,
} from "../src/shared/meri-procedures/client";
import {
  ProcedureAccountChanged,
  ProcedureRevisionConflict,
  ProcedureRoleDenied,
  ProcedureUncertainWrite,
  beginProcedureCommand,
  canGovernProcedures,
  classifyProcedureFailure,
  commandStillBelongsToAccount,
  emptyProcedureForm,
  hasProcedureFormErrors,
  mayRetryProcedure,
  procedureAccountKey,
  procedureFormBody,
  procedureStatus,
  procedureStatusLabel,
  procedureView,
  restorableVersions,
  retireStaleAccountCommands,
  validateProcedureForm,
  viewedVersionFence,
} from "../src/shared/meri-procedures/governance";

const UUID = "11111111-1111-4111-8111-111111111111";

function row(
  overrides: Partial<FirmSkillGovernanceRow> = {},
): FirmSkillGovernanceRow {
  return {
    id: UUID,
    skillId: "custom_procedure",
    name: "Custom procedure",
    skill: {
      id: "custom_procedure",
      name: "Custom procedure",
      triggers: ["custom_procedure"],
    },
    version: 3,
    versions: [
      {
        version: 2,
        skillJson: { id: "custom_procedure" },
        savedAt: "2026-10-26T00:00:00.000Z",
      },
      {
        version: 1,
        skillJson: { id: "custom_procedure" },
        savedAt: "2026-10-25T00:00:00.000Z",
      },
    ],
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

const admin = { userId: "user-1", tenantId: "tenant-1", role: "user_admin" };
const capiroAdmin = {
  userId: "user-2",
  tenantId: "tenant-1",
  role: "capiro_admin",
};
const standard = {
  userId: "user-3",
  tenantId: "tenant-1",
  role: "standard_user",
};

function api(): { api: ProcedureApi; request: ReturnType<typeof vi.fn> } {
  const request = vi.fn(async () => ({}));
  return {
    api: { request } as unknown as ProcedureApi,
    request: request as unknown as ReturnType<typeof vi.fn>,
  };
}

function client(fake: ProcedureApi) {
  return createProcedureGovernanceClient(fake, {
    attemptId: () => "attempt-1",
  });
}

describe("procedure governance status and honesty", () => {
  it("never presents a row as native SDK execution", () => {
    const view = procedureView(row());
    expect(view.runAsNativeSdk).toBe(false);
    expect(view.statusLabel).toMatch(/not native SDK execution/i);
    expect(procedureStatusLabel(row())).not.toMatch(/^Use skill$/);
  });

  it("treats a stored row the turn path would refuse as invalid, not available", () => {
    const failed = row({
      validationErrors: ['id "briefing" is a built-in procedure identity'],
      runnable: false,
    });
    expect(procedureStatus(failed)).toBe("invalid");
    expect(procedureView(failed).status).toBe("invalid");
    expect(procedureView(failed).validationErrors).toEqual([
      'id "briefing" is a built-in procedure identity',
    ]);
  });

  it("distinguishes a disabled row from a servable one", () => {
    expect(procedureStatus(row({ enabled: false }))).toBe("disabled");
    expect(procedureStatus(row())).toBe("available");
  });

  it("reads stored fields defensively when the payload was tampered with", () => {
    const view = procedureView(row({ skill: "not-an-object" }));
    expect(view.triggers).toEqual([]);
    expect(view.requiredTools).toEqual([]);
  });

  it("offers only versions strictly older than the current one, newest first", () => {
    expect(restorableVersions(row()).map((entry) => entry.version)).toEqual([
      2, 1,
    ]);
    expect(restorableVersions(row({ version: 1, versions: [] }))).toEqual([]);
  });
});

describe("procedure form validation", () => {
  it("requires a contract-shaped id, name and 1-5 triggers", () => {
    const errors = validateProcedureForm(emptyProcedureForm());
    expect(errors.id).toBeDefined();
    expect(errors.name).toBeDefined();
    expect(errors.triggers).toBeDefined();
    expect(hasProcedureFormErrors(errors)).toBe(true);
    expect(
      hasProcedureFormErrors(
        validateProcedureForm({
          id: "custom_procedure",
          name: "Custom",
          triggers: "custom_procedure, second_trigger",
          requiredTools: "get_client_context",
          systemAddendum: "",
        }),
      ),
    ).toBe(false);
  });

  it("caps triggers and tools and builds a structured body without authority fields", () => {
    expect(
      validateProcedureForm({
        id: "custom_procedure",
        name: "Custom",
        triggers: "a, b, c, d, e, f",
        requiredTools: "",
        systemAddendum: "",
      }).triggers,
    ).toBeDefined();
    const body = procedureFormBody({
      id: " custom_procedure ",
      name: " Custom ",
      triggers: "custom_procedure",
      requiredTools: " get_client_context , query_tasks ",
      systemAddendum: " Guidance ",
    });
    expect(body).toEqual({
      id: "custom_procedure",
      name: "Custom",
      triggers: ["custom_procedure"],
      requiredTools: ["get_client_context", "query_tasks"],
      systemAddendum: "Guidance",
    });
    expect(Object.keys(body)).not.toContain("allowedTools");
  });
});

describe("current account and role authority", () => {
  it("admits exactly the roles the Core route guard admits", () => {
    expect(canGovernProcedures(admin)).toBe(true);
    expect(canGovernProcedures(capiroAdmin)).toBe(true);
    expect(canGovernProcedures(standard)).toBe(false);
    expect(canGovernProcedures(null)).toBe(false);
    expect(
      canGovernProcedures({
        userId: "",
        tenantId: "tenant-1",
        role: "user_admin",
      }),
    ).toBe(false);
  });

  it("refuses to build a command for a role that cannot govern", () => {
    expect(() =>
      beginProcedureCommand(
        standard,
        "meri.procedures.update",
        row(),
        "attempt-1",
      ),
    ).toThrow(ProcedureRoleDenied);
  });

  it("retires pending results when the current account changes instead of replaying them", () => {
    const command = beginProcedureCommand(
      admin,
      "meri.procedures.update",
      row(),
      "attempt-1",
    );
    expect(commandStillBelongsToAccount(command, admin)).toBe(true);
    expect(commandStillBelongsToAccount(command, standard)).toBe(false);
    const { retained, retired } = retireStaleAccountCommands(
      [command],
      standard,
    );
    expect(retained).toEqual([]);
    expect(retired).toHaveLength(1);
    expect(procedureAccountKey(admin)).not.toEqual(
      procedureAccountKey(standard),
    );
    expect(new ProcedureAccountChanged().message).toMatch(/retired/i);
  });
});

describe("viewed-version fence, revision conflict and UNKNOWN outcomes", () => {
  it("carries the version the operator viewed and refuses a row with no usable version", () => {
    expect(viewedVersionFence(row())).toBe(3);
    expect(viewedVersionFence(row({ version: 1 }))).toBe(1);
    // A missing or malformed version must fail, never fall back to "whatever the row is now".
    expect(() => viewedVersionFence({ version: 0 })).toThrow(
      ProcedureRevisionConflict,
    );
    expect(() => viewedVersionFence({ version: -1 })).toThrow(
      ProcedureRevisionConflict,
    );
    expect(() => viewedVersionFence({ version: 1.5 })).toThrow(
      ProcedureRevisionConflict,
    );
    expect(() => viewedVersionFence({ version: Number.NaN })).toThrow(
      ProcedureRevisionConflict,
    );
  });

  it("classifies outcomes so only a definite rejection may be retried", () => {
    expect(classifyProcedureFailure(409)).toBe("conflict");
    expect(classifyProcedureFailure(403)).toBe("denied");
    expect(classifyProcedureFailure(400)).toBe("rejected");
    expect(classifyProcedureFailure(500)).toBe("unknown");
    expect(classifyProcedureFailure(null)).toBe("unknown");
    const command = beginProcedureCommand(
      admin,
      "meri.procedures.update",
      row(),
      "attempt-1",
    );
    expect(mayRetryProcedure(command, 400)).toBe(true);
    expect(mayRetryProcedure(command, 500)).toBe(false);
    expect(mayRetryProcedure({ ...command, state: "unknown" }, 400)).toBe(
      false,
    );
    expect(new ProcedureUncertainWrite().message).toMatch(/not replayed/i);
  });
});

describe("governance client dispatches the existing ordinary owner", () => {
  it("lists through the existing admin operation with no session-admission gate", async () => {
    const { api: fake, request } = api();
    request.mockResolvedValueOnce([]);
    await expect(client(fake).list()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledWith(
      "meri.procedures.list",
      {},
      { signal: undefined },
    );
  });

  it("carries the viewed version on the enabled and delete mutations", async () => {
    const { api: fake, request } = api();
    const governed = client(fake);

    await governed.setEnabled(admin, row(), false);
    expect(request).toHaveBeenLastCalledWith(
      "meri.procedures.setEnabled",
      { params: { id: UUID }, body: { enabled: false, expectedVersion: 3 } },
      { signal: undefined },
    );

    await governed.remove(admin, row());
    expect(request).toHaveBeenLastCalledWith(
      "meri.procedures.remove",
      { params: { id: UUID }, query: { expectedVersion: 3 } },
      { signal: undefined },
    );
  });

  it("refuses to dispatch a mutation when the viewed version is unusable", async () => {
    const { api: fake, request } = api();
    const governed = client(fake);
    await expect(
      governed.setEnabled(admin, row({ version: 0 }), false),
    ).rejects.toThrow(ProcedureRevisionConflict);
    await expect(
      governed.update(admin, row({ version: 0 }), {
        id: "custom_procedure",
        name: "Custom",
        triggers: ["custom_procedure"],
      }),
    ).rejects.toThrow(ProcedureRevisionConflict);
    expect(request).not.toHaveBeenCalled();
  });

  it("restores one exact stored version and refuses a version that is not restorable", async () => {
    const { api: fake, request } = api();
    const governed = client(fake);
    await governed.restore(admin, row(), 2);
    expect(request).toHaveBeenCalledWith(
      "meri.procedures.restore",
      { params: { id: UUID }, body: { version: 2, expectedVersion: 3 } },
      { signal: undefined },
    );
    expect(() => governed.restore(admin, row(), 3)).toThrow(
      ProcedureRevisionConflict,
    );
    expect(() => governed.restore(admin, row(), 0)).toThrow(
      ProcedureRevisionConflict,
    );
  });

  it("offers no mutation to a role that cannot govern", async () => {
    const { api: fake, request } = api();
    const governed = client(fake);
    await expect(governed.setEnabled(standard, row(), false)).rejects.toThrow(
      ProcedureRoleDenied,
    );
    await expect(governed.remove(standard, row())).rejects.toThrow(
      ProcedureRoleDenied,
    );
    await expect(
      governed.update(standard, row(), {
        id: "custom_procedure",
        name: "C",
        triggers: ["c"],
      }),
    ).rejects.toThrow(ProcedureRoleDenied);
    await expect(
      governed.create(standard, { id: "x_y", name: "X", triggers: ["x_y"] }),
    ).rejects.toThrow(ProcedureRoleDenied);
    expect(request).not.toHaveBeenCalled();
  });

  it("binds an update to the exact row identity and viewed version", async () => {
    const { api: fake, request } = api();
    request.mockResolvedValueOnce({ version: 4 });
    const governed = client(fake);
    await governed.update(admin, row(), {
      id: "custom_procedure",
      name: "Custom",
      triggers: ["custom_procedure"],
    });
    expect(request).toHaveBeenCalledWith(
      "meri.procedures.update",
      {
        params: { id: UUID },
        body: {
          id: "custom_procedure",
          name: "Custom",
          triggers: ["custom_procedure"],
          expectedVersion: 3,
        },
      },
      { signal: undefined },
    );
    expect(governed.commands).toHaveLength(0);
  });

  it("holds an UNKNOWN outcome as uncertain and never replays the request", async () => {
    const { api: fake, request } = api();
    request.mockRejectedValueOnce(
      Object.assign(new Error("gateway"), { status: 502 }),
    );
    const governed = client(fake);
    await expect(governed.setEnabled(admin, row(), false)).rejects.toThrow(
      ProcedureUncertainWrite,
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(governed.commands).toHaveLength(1);
    expect(governed.commands[0]?.state).toBe("unknown");
  });

  it("clears a definite rejection so the operator can correct the input", async () => {
    const { api: fake, request } = api();
    request.mockRejectedValueOnce(
      Object.assign(new Error("invalid"), { status: 400 }),
    );
    const governed = client(fake);
    await expect(
      governed.create(admin, {
        id: "custom_procedure",
        name: "Custom",
        triggers: ["custom_procedure"],
      }),
    ).rejects.toThrow(/refused/i);
    expect(governed.commands).toHaveLength(0);
  });

  it("maps a 409 to a revision conflict rather than a silent overwrite", async () => {
    const { api: fake, request } = api();
    request.mockRejectedValueOnce(
      Object.assign(new Error("conflict"), { status: 409 }),
    );
    const governed = client(fake);
    await expect(governed.remove(admin, row())).rejects.toThrow(
      ProcedureRevisionConflict,
    );
    expect(governed.commands).toHaveLength(0);
  });

  it("runs the dry run on the existing owner without claiming execution", async () => {
    const { api: fake, request } = api();
    // The real testRun return. It carries no `runAsNativeSdk`: this route executes no tools, and the
    // surface must not require a field the owner never emits.
    request.mockResolvedValueOnce({
      skillId: "custom_procedure",
      canonicalId: "custom_procedure",
      version: 3,
      procedureDigest: null,
      procedureScopes: [],
      triggers: ["custom_procedure"],
      note: "Dry run",
    });
    const governed = client(fake);
    const result = (await governed.dryRun(admin, row())) as { note: string };
    expect(result.note).toBe("Dry run");
    expect(request).toHaveBeenCalledWith(
      "meri.procedures.test",
      { params: { id: UUID } },
      { signal: undefined },
    );
  });
});
