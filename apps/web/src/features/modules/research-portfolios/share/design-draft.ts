import { z } from "zod";
import { researchDashboardLayout } from "../../../../shared/capiro/operations/research-share-schemas";
import { layoutProblems } from "./dashboard-layout";

const scopeSchema = z
  .object({
    tenantId: z.string().min(1),
    userId: z.string().min(1),
    portfolioId: z.string().min(1),
    clientId: z.string(),
    designId: z.string().min(1),
    portfolioRevision: z.number().int().nonnegative(),
    designVersion: z.number().int().nonnegative(),
  })
  .strict();
export type DesignDraftScope = z.infer<typeof scopeSchema>;
const draftSchema = z
  .object({
    schema: z.literal(1),
    scope: scopeSchema,
    updatedAt: z.number(),
    name: z.string().max(200),
    layout: researchDashboardLayout,
    pending: z.boolean(),
  })
  .strict();
export type DesignDraft = z.infer<typeof draftSchema>;
export function designDraftKey(scope: DesignDraftScope) {
  return JSON.stringify([
    "research-design-draft-v1",
    scope.tenantId,
    scope.userId,
    scope.portfolioId,
    scope.clientId,
    scope.designId,
  ]);
}
/** One editor for a design across client previews and revisions in this browser. */
export function designEditorLock(scope: DesignDraftScope) {
  return JSON.stringify([
    "research-design-editor-v1",
    scope.tenantId,
    scope.userId,
    scope.portfolioId,
    scope.designId,
  ]);
}
export type DraftRead =
  | { state: "empty" }
  | { state: "ready"; draft: DesignDraft }
  | { state: "stale" | "corrupt" };
export function readDesignDraft(
  storage: Pick<Storage, "getItem">,
  scope: DesignDraftScope,
  now = Date.now(),
): DraftRead {
  const raw = storage.getItem(designDraftKey(scope));
  if (!raw) return { state: "empty" };
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      layoutProblems(parsed.data.layout).some(
        (problem) => problem !== "Add at least one widget.",
      )
    )
      return { state: "corrupt" };
    const draft = parsed.data;
    if (
      Object.entries(scope).some(
        ([key, value]) => draft.scope[key as keyof DesignDraftScope] !== value,
      ) ||
      now - draft.updatedAt > 24 * 60 * 60 * 1000 ||
      draft.updatedAt > now + 60_000
    )
      return { state: "stale" };
    return { state: "ready", draft };
  } catch {
    return { state: "corrupt" };
  }
}
export function writeDesignDraft(
  storage: Pick<Storage, "setItem">,
  draft: DesignDraft,
) {
  const parsed = draftSchema.parse(draft);
  storage.setItem(designDraftKey(parsed.scope), JSON.stringify(parsed));
}
