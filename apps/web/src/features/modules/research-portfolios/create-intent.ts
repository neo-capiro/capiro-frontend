export type ResearchPortfolioCreateDraft = {
  name: string;
  purpose: string | null;
  mode: "manual" | "rules" | "hybrid";
};

type Attempt = {
  key: string;
  draft: ResearchPortfolioCreateDraft;
};

/** Keep one server idempotency key for an uncertain create until its intent changes. */
export class ResearchPortfolioCreateIntent {
  private attempt?: Attempt;
  private pending = false;

  constructor(
    private readonly newKey: () => string = () => crypto.randomUUID(),
  ) {}

  get busy() {
    return this.pending;
  }

  async submit<T>(
    draft: ResearchPortfolioCreateDraft,
    send: (
      body: ResearchPortfolioCreateDraft & { idempotencyKey: string },
    ) => Promise<T>,
  ): Promise<T> {
    if (this.pending) throw new Error("Portfolio creation is already pending.");
    this.pending = true;
    try {
      // Match the research.create request schema's name trimming before
      // deciding whether a retry is still the same server-side operation.
      const normalized = { ...draft, name: draft.name.trim() };
      if (
        !this.attempt ||
        this.attempt.draft.name !== normalized.name ||
        this.attempt.draft.purpose !== normalized.purpose ||
        this.attempt.draft.mode !== normalized.mode
      ) {
        this.attempt = { key: this.newKey(), draft: normalized };
      }
      const receipt = await send({
        ...this.attempt.draft,
        idempotencyKey: this.attempt.key,
      });
      this.attempt = undefined;
      return receipt;
    } finally {
      this.pending = false;
    }
  }
}
