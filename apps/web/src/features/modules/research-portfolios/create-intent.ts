import { z } from "zod";
import { researchPortfolioOperations } from "../../../shared/capiro/operations/research-portfolios";

const bodySchema =
  researchPortfolioOperations["research.create"].request.shape.body.required();
const draftSchema = bodySchema.omit({ idempotencyKey: true });
const storedBodySchema = bodySchema.extend({ idempotencyKey: z.uuid() });
const opaqueId = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value === value.trim());
const scopeSchema = z.strictObject({ tenantId: opaqueId, actorId: opaqueId });
const wizardSchema = z.strictObject({
  version: z.literal(1),
  scope: scopeSchema,
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  draft: z.strictObject({
    name: z.string().max(240),
    purpose: z.string().max(4000).nullable(),
    mode: z.enum(["manual", "rules", "hybrid"]),
  }),
});
export type ResearchPortfolioWizard = Pick<
  z.infer<typeof wizardSchema>,
  "draft" | "step"
>;
const recordFields = {
  version: z.literal(1),
  scope: scopeSchema,
  body: storedBodySchema,
};
const recordSchema = z.discriminatedUnion("state", [
  z.strictObject({ ...recordFields, state: z.literal("pending") }),
  z.strictObject({ ...recordFields, state: z.literal("confirmed") }),
  z.strictObject({ ...recordFields, state: z.literal("abandoned") }),
]);

export type ResearchPortfolioCreateDraft = z.infer<typeof draftSchema>;
export type ResearchPortfolioCreateScope = z.infer<typeof scopeSchema>;
type Record = z.infer<typeof recordSchema>;
type IntentStorage = Pick<Storage, "getItem" | "setItem">;
const prefix = "capiro-research-portfolio-create-v1:";

export class ResearchPortfolioCreateStorageError extends Error {
  constructor() {
    super("The portfolio create request could not be safely recovered.");
    this.name = "ResearchPortfolioCreateStorageError";
  }
}

export class ResearchPortfolioPendingChangeError extends Error {
  constructor() {
    super("Retry the pending portfolio request before changing its details.");
    this.name = "ResearchPortfolioPendingChangeError";
  }
}

function sameDraft(
  first: ResearchPortfolioCreateDraft,
  second: ResearchPortfolioCreateDraft,
) {
  return (
    first.name === second.name &&
    first.purpose === second.purpose &&
    first.mode === second.mode
  );
}

function storageKey(scope: ResearchPortfolioCreateScope) {
  const checked = scopeSchema.parse(scope);
  return prefix + JSON.stringify([checked.tenantId, checked.actorId]);
}

/** Browser storage is a recovery hint. Core owns replay authorization. */
function readRecord(
  scope: ResearchPortfolioCreateScope,
  storage: IntentStorage,
) {
  try {
    const raw = storage.getItem(storageKey(scope));
    if (raw === null) return null;
    const record = recordSchema.parse(JSON.parse(raw));
    if (
      record.scope.tenantId !== scope.tenantId ||
      record.scope.actorId !== scope.actorId
    )
      throw new Error("Portfolio account changed");
    return record;
  } catch {
    throw new ResearchPortfolioCreateStorageError();
  }
}

function persist(
  scope: ResearchPortfolioCreateScope,
  storage: IntentStorage,
  record: Record,
) {
  try {
    storage.setItem(storageKey(scope), JSON.stringify(record));
    const verified = readRecord(scope, storage);
    if (!verified || JSON.stringify(verified) !== JSON.stringify(record))
      throw new Error("Portfolio request changed in storage");
    return verified;
  } catch {
    throw new ResearchPortfolioCreateStorageError();
  }
}

/** One tenant-global create intent, durable across same-tab reloads. */
export class ResearchPortfolioCreateIntent {
  private inFlight = false;

  constructor(
    private readonly scope: ResearchPortfolioCreateScope,
    private readonly storage: () => IntentStorage,
    private readonly issueId: () => string = () => crypto.randomUUID(),
  ) {}

  get busy() {
    return this.inFlight;
  }

  /** Unsubmitted form values are separate from the immutable pending command. */
  wizard(): ResearchPortfolioWizard | null {
    try {
      const raw = this.storage().getItem(storageKey(this.scope) + ":draft");
      if (raw === null || raw === "null") return null;
      const saved = wizardSchema.parse(JSON.parse(raw));
      if (
        saved.scope.tenantId !== this.scope.tenantId ||
        saved.scope.actorId !== this.scope.actorId
      )
        throw new Error("Portfolio account changed");
      return { draft: saved.draft, step: saved.step };
    } catch {
      throw new ResearchPortfolioCreateStorageError();
    }
  }

  saveWizard(value: ResearchPortfolioWizard) {
    if (this.inFlight || this.pendingDraft())
      throw new ResearchPortfolioPendingChangeError();
    try {
      const saved = wizardSchema.parse({
        version: 1,
        scope: this.scope,
        ...value,
      });
      this.storage().setItem(
        storageKey(this.scope) + ":draft",
        JSON.stringify(saved),
      );
      if (
        JSON.stringify(this.wizard()) !==
        JSON.stringify({ draft: saved.draft, step: saved.step })
      )
        throw new Error("Draft changed in storage");
    } catch (error) {
      if (error instanceof ResearchPortfolioPendingChangeError) throw error;
      throw new ResearchPortfolioCreateStorageError();
    }
  }

  clearWizard() {
    try {
      this.storage().setItem(storageKey(this.scope) + ":draft", "null");
    } catch {
      throw new ResearchPortfolioCreateStorageError();
    }
  }

  pendingDraft(): ResearchPortfolioCreateDraft | null {
    const record = readRecord(this.scope, this.storage());
    if (record?.state !== "pending") return null;
    const { name, purpose, mode } = record.body;
    return { name, purpose, mode };
  }

  /** Explicitly leave an uncertain request before beginning different work. */
  abandon() {
    if (this.inFlight) throw new ResearchPortfolioPendingChangeError();
    const storage = this.storage();
    const existing = readRecord(this.scope, storage);
    if (existing?.state !== "pending")
      throw new ResearchPortfolioCreateStorageError();
    persist(this.scope, storage, { ...existing, state: "abandoned" });
  }

  async submit<T>(
    draft: ResearchPortfolioCreateDraft,
    send: (body: Record["body"]) => Promise<T>,
    assertCurrent: () => void = () => {},
  ): Promise<T> {
    if (this.inFlight)
      throw new Error("Portfolio creation is already pending.");
    this.inFlight = true;
    try {
      assertCurrent();
      const normalized = draftSchema.parse(draft);
      const storage = this.storage();
      const current = readRecord(this.scope, storage);
      if (current?.state === "pending" && !sameDraft(current.body, normalized))
        throw new ResearchPortfolioPendingChangeError();
      const record =
        current?.state === "pending"
          ? current
          : persist(this.scope, storage, {
              version: 1,
              scope: scopeSchema.parse(this.scope),
              body: storedBodySchema.parse({
                ...normalized,
                idempotencyKey: z.uuid().parse(this.issueId()),
              }),
              state: "pending",
            });
      assertCurrent();
      const receipt = await send(record.body);
      assertCurrent();
      persist(this.scope, storage, { ...record, state: "confirmed" });
      return receipt;
    } finally {
      this.inFlight = false;
    }
  }
}
