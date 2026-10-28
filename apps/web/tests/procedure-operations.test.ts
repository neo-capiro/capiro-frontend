import { describe, expect, it } from "vitest";
import {
  firmSkillWriteBody,
  meriFirmSkillOperations,
} from "../src/shared/capiro/operations/meri-firm-skills";

/**
 * The operation leaf must describe the existing user_admin-gated Core routes exactly. These are wire
 * contract assertions only — no server is contacted.
 *
 * The response fixtures below are transcribed from the actual owner
 * (apps/api/src/meri/meri-firm-skills.service.ts), not invented: `list()` emits the governance
 * projection, `create`/`update`/`setEnabled`/`restore` return the persisted row, `pushVersion` writes
 * snapshots that include `skillJson`, `remove` returns `{ deleted: true }`, and `testRun` returns the
 * dry-run resolution with no execution flag.
 */
describe("firm procedure governance operations", () => {
  it("declares the seven existing admin-gated Core firm-skill routes on the ordinary capiro path", () => {
    expect(Object.keys(meriFirmSkillOperations).sort()).toEqual(
      [
        "meri.procedures.create",
        "meri.procedures.list",
        "meri.procedures.remove",
        "meri.procedures.restore",
        "meri.procedures.setEnabled",
        "meri.procedures.test",
        "meri.procedures.update",
      ].sort(),
    );
    const wire = Object.values(meriFirmSkillOperations).map((operation) => ({
      service: operation.service,
      method: operation.method,
      path: operation.path,
      authentication: operation.authentication,
    }));
    expect(wire).toEqual(
      expect.arrayContaining([
        {
          service: "core",
          method: "GET",
          path: "/clio/firm-skills",
          authentication: undefined,
        },
        {
          service: "core",
          method: "POST",
          path: "/clio/firm-skills",
          authentication: undefined,
        },
        {
          service: "core",
          method: "PATCH",
          path: "/clio/firm-skills/:id",
          authentication: undefined,
        },
        {
          service: "core",
          method: "PATCH",
          path: "/clio/firm-skills/:id/enabled",
          authentication: undefined,
        },
        {
          service: "core",
          method: "DELETE",
          path: "/clio/firm-skills/:id",
          authentication: undefined,
        },
        {
          service: "core",
          method: "POST",
          path: "/clio/firm-skills/:id/restore",
          authentication: undefined,
        },
        {
          service: "core",
          method: "POST",
          path: "/clio/firm-skills/:id/test",
          authentication: undefined,
        },
      ]),
    );
    // These are ordinary Capiro operations: the gateway already attaches the reviewed capiro-template
    // session token, and Core verifies it before the existing user_admin guard runs. Declaring
    // `clerk-session` here would be the reviewed-exception path and defineOperation would refuse it.
    for (const operation of Object.values(meriFirmSkillOperations))
      expect(operation.authentication).not.toBe("clerk-session");
  });

  it("refuses a write body that carries no structured identity or an out-of-contract id", () => {
    expect(firmSkillWriteBody.safeParse({}).success).toBe(false);
    expect(
      firmSkillWriteBody.safeParse({
        id: "Briefing",
        name: "Briefing",
        triggers: ["custom_briefing"],
      }).success,
    ).toBe(false);
    // Five triggers is the contract maximum.
    expect(
      firmSkillWriteBody.safeParse({
        id: "custom_procedure",
        name: "Custom",
        triggers: ["a", "b", "c", "d", "e"],
      }).success,
    ).toBe(true);
    expect(
      firmSkillWriteBody.safeParse({
        id: "custom_procedure",
        name: "Custom",
        triggers: ["a", "b", "c", "d", "e", "f"],
      }).success,
    ).toBe(false);
  });

  it("carries no authority-bearing field: content cannot grant tools, effects or memory", () => {
    const keys = Object.keys(firmSkillWriteBody.shape).sort();
    expect(keys).toEqual(
      [
        "id",
        "name",
        "procedure",
        "requiredTools",
        "systemAddendum",
        "template",
        "triggers",
      ].sort(),
    );
    for (const forbidden of [
      "allowedTools",
      "effectPolicy",
      "memory",
      "capabilities",
      "allowedCapabilities",
      "scope",
      "approval",
      "expectedVersion",
    ])
      expect(keys).not.toContain(forbidden);
  });

  it("keeps the viewed version a required fence rather than payload content", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const write = {
      id: "custom_procedure",
      name: "Custom",
      triggers: ["custom_procedure"],
    };

    const update = meriFirmSkillOperations["meri.procedures.update"].request;
    expect(update.safeParse({ params: { id }, body: write }).success).toBe(
      false,
    );
    expect(
      update.safeParse({
        params: { id },
        body: { ...write, expectedVersion: 3 },
      }).success,
    ).toBe(true);

    const setEnabled =
      meriFirmSkillOperations["meri.procedures.setEnabled"].request;
    expect(
      setEnabled.safeParse({ params: { id }, body: { enabled: false } })
        .success,
    ).toBe(false);
    expect(
      setEnabled.safeParse({
        params: { id },
        body: { enabled: false, expectedVersion: 3 },
      }).success,
    ).toBe(true);

    const restore = meriFirmSkillOperations["meri.procedures.restore"].request;
    expect(
      restore.safeParse({ params: { id }, body: { version: 1 } }).success,
    ).toBe(false);
    expect(
      restore.safeParse({
        params: { id },
        body: { version: 1, expectedVersion: 3 },
      }).success,
    ).toBe(true);

    // Malformed fences are refused by the transport too, never coerced or defaulted.
    for (const body of [
      { enabled: false, expectedVersion: 0 },
      { enabled: false, expectedVersion: 1.5 },
      { enabled: false, expectedVersion: "3" },
      { enabled: false, expectedVersion: null },
    ])
      expect(setEnabled.safeParse({ params: { id }, body }).success).toBe(
        false,
      );

    // The fence is not part of the stored content: a write body may not smuggle it into the payload.
    expect(
      firmSkillWriteBody.safeParse({ ...write, expectedVersion: 3 }).success,
    ).toBe(false);

    // Delete carries the same fence as a query parameter (the controller reads it with @Query).
    const remove = meriFirmSkillOperations["meri.procedures.remove"].request;
    expect(remove.safeParse({ params: { id } }).success).toBe(false);
    expect(
      remove.safeParse({ params: { id }, query: { expectedVersion: 3 } })
        .success,
    ).toBe(true);
    expect(
      remove.safeParse({ params: { id }, query: { expectedVersion: 0 } })
        .success,
    ).toBe(false);
  });

  it("accepts the persisted row exactly as create/update/restore return it", () => {
    const persisted = {
      id: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      skillId: "custom_procedure",
      name: "Custom",
      skillJson: {
        id: "custom_procedure",
        name: "Custom",
        triggers: ["custom_procedure"],
      },
      version: 1,
      // A freshly created row has no history…
      versions: [],
      enabled: true,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: "2026-10-27T00:00:00.000Z",
      updatedAt: "2026-10-27T00:00:00.000Z",
    };
    expect(
      meriFirmSkillOperations["meri.procedures.create"].response.safeParse(
        persisted,
      ).success,
    ).toBe(true);

    // …while an updated/restored row carries the snapshots pushVersion wrote, and those include the
    // opaque historical skillJson. A decoder that only allows { version, savedAt } would reject every
    // real update/restore response.
    const withHistory = {
      ...persisted,
      version: 3,
      enabled: false,
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
    };
    for (const key of [
      "meri.procedures.update",
      "meri.procedures.setEnabled",
      "meri.procedures.restore",
    ] as const)
      expect(
        meriFirmSkillOperations[key].response.safeParse(withHistory).success,
      ).toBe(true);
  });

  it("accepts a disabled row and an invalid row the turn path would refuse", () => {
    const list = meriFirmSkillOperations["meri.procedures.list"].response;
    const parsed = list.safeParse([
      {
        id: "11111111-1111-4111-8111-111111111111",
        skillId: "custom_procedure",
        name: "Custom",
        skill: {
          id: "custom_procedure",
          name: "Custom",
          triggers: ["custom_procedure"],
        },
        version: 2,
        versions: [{ version: 1, savedAt: "2026-10-27T00:00:00.000Z" }],
        enabled: false,
        runnable: false,
        procedureDigest: null,
        procedureScopes: [],
        validationErrors: [],
        createdAt: "2026-10-27T00:00:00.000Z",
        updatedAt: "2026-10-27T00:00:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        skillId: "briefing",
        name: "Shadowed",
        skill: { id: "briefing", name: "Shadowed", triggers: ["briefing"] },
        version: 1,
        versions: [],
        enabled: true,
        runnable: false,
        procedureDigest: null,
        procedureScopes: [],
        validationErrors: ['id "briefing" is a built-in procedure identity'],
        createdAt: "2026-10-27T00:00:00.000Z",
        updatedAt: "2026-10-27T00:00:00.000Z",
      },
    ]);
    expect(parsed.success).toBe(true);
    expect(
      list.safeParse([
        {
          id: "11111111-1111-4111-8111-111111111111",
          skillId: "custom_procedure",
          name: "Custom",
          skill: {},
          version: 2,
          versions: [],
          enabled: true,
          runnable: true,
          procedureDigest: "NOT-A-DIGEST",
          procedureScopes: [],
          validationErrors: [],
          createdAt: "2026-10-27T00:00:00.000Z",
          updatedAt: "2026-10-27T00:00:00.000Z",
        },
      ]).success,
    ).toBe(false);
  });

  it("declares the deletion result the owner actually returns", () => {
    expect(
      meriFirmSkillOperations["meri.procedures.remove"].response.safeParse({
        deleted: true,
      }).success,
    ).toBe(true);
    expect(
      meriFirmSkillOperations["meri.procedures.remove"].response.safeParse({
        deleted: false,
      }).success,
    ).toBe(false);
  });

  it("keeps the dry run honest: it declares the exact identity and claims no native execution", () => {
    const response = meriFirmSkillOperations["meri.procedures.test"].response;
    // The exact MeriFirmSkillsService.testRun return. It emits no execution flag, so the surface must
    // not require one — the stored-only nature is labelled locally instead.
    const parsed = response.safeParse({
      skillId: "custom_procedure",
      canonicalId: "custom_procedure",
      version: 3,
      procedureDigest: null,
      procedureScopes: [],
      triggers: ["custom_procedure"],
      systemAddendum: undefined,
      template: undefined,
      requiredTools: undefined,
      note: "Dry run — this is the guidance/template the skill injects when a trigger fires. No tools were executed.",
    });
    expect(parsed.success).toBe(true);
    expect(Object.keys(response.shape)).not.toContain("runAsNativeSdk");
    // The dry run cannot be asked to execute anything: it takes no body at all.
    expect(
      meriFirmSkillOperations["meri.procedures.test"].request.safeParse({
        params: { id: "11111111-1111-4111-8111-111111111111" },
      }).success,
    ).toBe(true);
    expect(
      meriFirmSkillOperations["meri.procedures.test"].request.safeParse({
        params: { id: "11111111-1111-4111-8111-111111111111" },
        body: { execute: true },
      }).success,
    ).toBe(false);
  });
});
