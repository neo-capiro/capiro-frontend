import { z } from "zod";
import { CapiroApiError, type CapiroApi } from "../../../../shared/capiro/http";
import type { capiroOperations } from "../../../../shared/capiro/registry";
import {
  classicOutreachTemplate,
  createClassicTemplateInput,
  createdClassicTemplate,
  type ClassicOutreachTemplate,
} from "../../../../shared/capiro/operations/outreach-template-catalog";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
export type TemplateCreationState = {
  status:
    | "ready"
    | "creating"
    | "unknown"
    | "created"
    | "checking"
    | "confirmed"
    | "blocked";
  id?: string;
  error?: string;
};
const marker = z.discriminatedUnion("status", [
  z.object({ version: z.literal(1), status: z.literal("unknown") }).strict(),
  z
    .object({
      version: z.literal(1),
      status: z.literal("created"),
      id: z.uuid(),
    })
    .strict(),
]);
export const templateCreationKey = (tenantId: string, userId: string) =>
  `capiro:classic-template-create:${JSON.stringify([tenantId, userId])}`;

/** One view/actor owns one explicit POST. A tab marker survives reload without storing content. */
export function createTemplateCreationOwner(
  api: Pick<CapiroApi<typeof capiroOperations>, "request">,
  storage: Storage,
  key: string,
  publish: (state: TemplateCreationState) => void,
  confirmed: (template: ClassicOutreachTemplate) => void,
) {
  const controller = new AbortController();
  let active = false;
  let state: TemplateCreationState = { status: "ready" };
  const set = (next: TemplateCreationState) => {
    state = next;
    if (!controller.signal.aborted) publish(next);
  };
  try {
    const raw = storage.getItem(key);
    if (raw !== null) {
      const saved = marker.parse(JSON.parse(raw));
      state =
        saved.status === "created"
          ? { status: "created", id: saved.id }
          : { status: "unknown" };
    }
  } catch {
    state = {
      status: "blocked",
      error:
        "Creation status could not be read. No template has been submitted from this view.",
    };
  }
  publish(state);

  const readback = async () => {
    if (controller.signal.aborted || !state.id) return;
    const id = state.id;
    set({ status: "checking", id });
    try {
      const catalog = z
        .array(classicOutreachTemplate)
        .parse(
          await api.request(
            "engagement.campaign.templates",
            {},
            { signal: controller.signal },
          ),
        );
      controller.signal.throwIfAborted();
      const matches = catalog.filter((item) => item.id === id);
      if (matches.length !== 1 || matches[0]?.source !== "user")
        throw new Error(
          "The created template is not uniquely available in your current catalog. Check again; it has not been created again.",
        );
      storage.removeItem(key);
      set({ status: "confirmed", id });
      confirmed(matches[0]!);
    } catch (error) {
      if (!controller.signal.aborted)
        set({
          status: "created",
          id,
          error:
            error instanceof Error
              ? error.message
              : "Catalog confirmation failed. Check again without creating another template.",
        });
    }
  };
  return {
    dispose: () => controller.abort(),
    async create(input: unknown) {
      if (active || controller.signal.aborted || state.status !== "ready")
        return;
      const parsed = createClassicTemplateInput.safeParse(input);
      if (!parsed.success) {
        set({
          status: "ready",
          error: "Check the template name, prompt and field lengths.",
        });
        return;
      }
      // Persist uncertainty before the only POST. Storage failure prevents dispatch.
      try {
        if (storage.getItem(key) !== null) {
          set({
            status: "blocked",
            error:
              "Another creation needs confirmation. Reopen this view to read its status.",
          });
          return;
        }
        storage.setItem(key, JSON.stringify({ version: 1, status: "unknown" }));
      } catch {
        set({
          status: "blocked",
          error: "Creation status cannot be saved. No template was submitted.",
        });
        return;
      }
      active = true;
      set({ status: "creating" });
      try {
        const result = createdClassicTemplate.parse(
          await api.request(
            "engagement.campaign.template.create",
            { body: parsed.data },
            { signal: controller.signal },
          ),
        );
        controller.signal.throwIfAborted();
        // Keep the original unknown marker if persisting the response ID fails.
        storage.setItem(
          key,
          JSON.stringify({ version: 1, status: "created", id: result.id }),
        );
        set({ status: "created", id: result.id });
        await readback();
      } catch (error) {
        if (!controller.signal.aborted) {
          if (
            error instanceof CapiroApiError &&
            [400, 401, 403, 404, 413, 422].includes(error.status)
          ) {
            try {
              storage.removeItem(key);
              set({
                status: "ready",
                error:
                  "The server refused this creation. Check your access and template details before trying again.",
              });
            } catch {
              set({
                status: "blocked",
                error:
                  "The request was refused, but its local status could not be cleared.",
              });
            }
          } else
            set({
              status: "unknown",
              error:
                "The creation result could not be confirmed. It may have been saved. Do not submit it again; review your template catalog.",
            });
        }
      } finally {
        active = false;
      }
    },
    async check() {
      if (active || controller.signal.aborted || state.status !== "created")
        return;
      active = true;
      try {
        await readback();
      } finally {
        active = false;
      }
    },
  };
}
