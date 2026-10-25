import {
  editableDocument,
  saveRequest,
  tenantSettingsRequest,
  TenantSettingsFailure,
  type ModelLimits,
  type TenantDocument,
} from "./client";

type Status =
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "conflict"
  | "unknown"
  | "denied"
  | "unavailable";
type View = { status: Status; message: string; document?: TenantDocument };
const loading: View = {
  status: "loading",
  message: "Loading current workspace limits.",
};

/** View lifetime only. The canonical owner retains policy, CAS and durable writes. */
export class TenantSettingsController {
  private view: View = loading;
  private listeners = new Set<() => void>();
  private active = false;
  private request: AbortController | null = null;
  private uncertain = false;
  constructor(
    private readonly send: typeof tenantSettingsRequest = tenantSettingsRequest,
  ) {}
  snapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(view: View) {
    this.view = view;
    for (const listener of this.listeners) listener();
  }
  attach() {
    this.active = true;
    void this.load();
    return () => {
      this.active = false;
      this.request?.abort();
      this.request = null;
      this.view = loading;
    };
  }
  async load() {
    if (!this.active || this.request) return;
    const request = new AbortController();
    this.request = request;
    this.publish(loading);
    try {
      const document = await this.send("read", {}, request.signal);
      if (!this.active || request.signal.aborted) return;
      if (!editableDocument(document)) {
        this.publish({
          status: "denied",
          message:
            "A current workspace administrator is required to view and change model limits.",
        });
        return;
      }
      this.publish({
        status: "ready",
        document,
        message: this.uncertain
          ? "Current saved limits loaded. The earlier save outcome was uncertain; review these values before making any further change."
          : "Current workspace limits loaded.",
      });
      this.uncertain = false;
    } catch (error) {
      if (!this.active || request.signal.aborted) return;
      this.publish(
        error instanceof TenantSettingsFailure && error.kind === "access"
          ? {
              status: "denied",
              message:
                "Current account access was refused. Workspace limits are unavailable.",
            }
          : {
              status: "unavailable",
              message:
                "Current workspace limits could not be loaded. No editable defaults have been substituted.",
            },
      );
    } finally {
      if (this.request === request) this.request = null;
    }
  }
  async save(model: ModelLimits) {
    if (
      !this.active ||
      this.request ||
      this.view.status !== "ready" ||
      !this.view.document
    )
      return;
    const document = this.view.document;
    const body = saveRequest(document, model);
    const request = new AbortController();
    this.request = request;
    this.publish({
      status: "saving",
      document,
      message:
        "Saving workspace limits. Wait for confirmation before leaving this page.",
    });
    try {
      const saved = await this.send("save", body, request.signal);
      if (!this.active || request.signal.aborted) return;
      if (
        saved.revision !== document.revision + 1 ||
        saved.defaultTimezone !== document.defaultTimezone ||
        JSON.stringify(saved.capabilityPolicy) !==
          JSON.stringify(document.capabilityPolicy) ||
        saved.model?.monthlyCapMicroUsd !== model.monthlyCapMicroUsd ||
        saved.model?.maxBudgetMicroUsd !== model.maxBudgetMicroUsd ||
        saved.model?.maxTurns !== model.maxTurns
      )
        throw new Error("Unconfirmed settings response");
      this.publish({
        status: "saved",
        document: saved,
        message:
          "Workspace limits saved. Reload current limits before making another change.",
      });
    } catch (error) {
      if (!this.active || request.signal.aborted) return;
      this.failedSave(error, document);
    } finally {
      if (this.request === request) this.request = null;
    }
  }
  private failedSave(error: unknown, document: TenantDocument) {
    const kind =
      error instanceof TenantSettingsFailure ? error.kind : "unavailable";
    if (kind === "access") {
      this.publish({
        status: "denied",
        message:
          "Current administrator access was refused. The save was not confirmed; workspace limits have been hidden.",
      });
    } else if (kind === "conflict") {
      this.publish({
        status: "conflict",
        document,
        message:
          "Workspace settings changed elsewhere. Reload current limits and review them before saving again.",
      });
    } else if (kind === "invalid") {
      this.publish({
        status: "conflict",
        document,
        message:
          "The settings owner refused these values. Reload current limits and review them before saving again.",
      });
    } else {
      this.uncertain = true;
      this.publish({
        status: "unknown",
        document,
        message:
          "The save outcome is uncertain. It may have completed. Reload current limits to check; the save will not be retried automatically.",
      });
    }
  }
}
