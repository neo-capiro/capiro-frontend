import {
  receiveUserPreferencesRequest,
  receiveUserPreferencesResponse,
  type UserPreferences,
  type UserPreferencesOwner,
  type UserPreferencesResponse,
} from "@capiro/meri-client/user-preferences";
import {
  PreferencesAccessLost,
  type UserPreferencesPort,
  type PreferencesReply,
} from "./transport";
import type { PreferencesJournal, PreferencesAttempt } from "./journal";

export type PreferencesView = Readonly<{
  status:
    | "empty"
    | "loading"
    | "ready"
    | "saving"
    | "saved"
    | "conflict"
    | "unknown"
    | "result-withheld"
    | "unavailable"
    | "access-lost";
  document?: UserPreferencesResponse;
  message: string;
}>;
const accessCodes = new Set([
  "UNAUTHENTICATED",
  "ACCESS_DENIED",
  "MEMBERSHIP_REVOKED",
  "MEMBERSHIP_CHANGED",
]);

function retainedView(attempt: PreferencesAttempt): PreferencesView {
  return {
    status: attempt.accessLost
      ? "access-lost"
      : attempt.status === "idle"
        ? "empty"
        : attempt.status === "pending"
          ? "unknown"
          : attempt.status,
    message: attempt.accessLost
      ? "Access changed. Personal preferences and drafts have been cleared. Reload after signing in again."
      : attempt.status === "idle"
        ? "Load your personal Meri preferences."
        : "A previous save needs read-only reconciliation. It will not be resent.",
  };
}

/** One explicit writer, retained uncertainty and read-only reconciliation. */
export class UserPreferencesController {
  private view: PreferencesView;
  private listeners = new Set<() => void>();
  private active?: AbortController;
  private disposed = false;
  constructor(
    private owner: UserPreferencesOwner,
    private port: UserPreferencesPort,
    private journal: PreferencesJournal,
  ) {
    this.view = Object.freeze(retainedView(journal.read()));
  }
  snapshot = () => this.view;
  /** StrictMode reattachment keeps prior aborted generations fenced by their signals. */
  attach() {
    this.disposed = false;
    this.show(retainedView(this.journal.read()));
    return () => this.dispose();
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private current() {
    return !this.disposed && this.journal.current();
  }
  private show(view: PreferencesView) {
    if (this.current()) {
      this.view = Object.freeze(view);
      this.listeners.forEach((listener) => listener());
    }
  }
  private lost() {
    const previous = this.journal.read();
    this.journal.write({
      status: ["result-withheld", "unknown", "saved"].includes(previous.status)
        ? previous.status
        : "access-lost",
      accessLost: true,
    });
    this.show({
      status: "access-lost",
      message:
        "Access changed. Personal preferences and drafts have been cleared. Reopen after signing in again.",
    });
  }
  private error(
    reply: Exclude<PreferencesReply, UserPreferencesResponse>,
    write: boolean,
  ) {
    const { code, outcome } = reply.error;
    if (write && outcome)
      this.journal.write({
        ...this.journal.read(),
        status:
          outcome === "RESULT_NOT_RELEASED" ? "result-withheld" : "unknown",
      });
    if (accessCodes.has(code)) {
      this.lost();
      return;
    }
    // A failed reconciliation read never proves the earlier write did not land.
    if (!write) {
      const attempt = this.journal.read();
      this.show({
        status:
          attempt.status === "idle"
            ? "unavailable"
            : attempt.status === "saved"
              ? "saved"
              : attempt.status === "result-withheld"
                ? "result-withheld"
                : "unknown",
        message:
          "Current preferences could not be verified. Any previous save remains held; no save was resent.",
      });
      return;
    }
    if (write && outcome) {
      this.show({
        status:
          outcome === "RESULT_NOT_RELEASED" ? "result-withheld" : "unknown",
        message:
          outcome === "RESULT_NOT_RELEASED"
            ? "The save completed, but its result was withheld. Read current settings before continuing."
            : "The save outcome is uncertain. Check current settings; no save will be retried.",
      });
    } else if (code === "SETTINGS_REVISION_CONFLICT") {
      this.journal.write({ status: "idle" });
      this.show({
        status: "conflict",
        message:
          "Preferences changed elsewhere. Reload current preferences before editing again.",
      });
    } else {
      if (write) this.journal.write({ status: "idle" });
      this.show({
        status: "unavailable",
        message:
          "Preferences are unavailable. Load current preferences before continuing.",
      });
    }
  }
  async load() {
    if (this.active || !this.current() || this.view.status === "access-lost")
      return;
    const attempt = this.journal.read();
    const reconciling = attempt.status !== "idle";
    const controller = new AbortController();
    this.active = controller;
    this.show({
      status: "loading",
      message: reconciling
        ? "Checking current preferences without resending the save."
        : "Loading current preferences.",
    });
    try {
      const reply = await this.port.read(controller.signal);
      if (!this.current() || controller.signal.aborted) return;
      if ("error" in reply) {
        this.error(reply, false);
        return;
      }
      if (reconciling && attempt.request) {
        try {
          await receiveUserPreferencesResponse(
            "save",
            200,
            JSON.stringify(reply),
            { owner: this.owner, request: attempt.request },
          );
        } catch {
          this.show({
            status:
              attempt.status === "result-withheld"
                ? "result-withheld"
                : "unknown",
            ...(reply.revision > attempt.request.expectedRevision
              ? { document: reply }
              : {}),
            message: `Current revision ${reply.revision} does not confirm the exact attempted save. ${reply.revision > attempt.request.expectedRevision ? "Review the current saved values and explicitly use them to resume editing." : "Writes remain held; check again before continuing."}`,
          });
          return;
        }
      } else if (reconciling) {
        this.lost();
        return;
      }
      if (!this.current() || controller.signal.aborted) return;
      this.journal.write({ status: "idle" });
      this.show({
        status: "ready",
        document: reply,
        message: reconciling
          ? "Current saved preferences match the exact attempted save."
          : "Current preferences loaded.",
      });
    } catch (error) {
      if (!this.current() || controller.signal.aborted) return;
      if (error instanceof PreferencesAccessLost) this.lost();
      else
        this.show({
          status: reconciling ? "unknown" : "unavailable",
          message:
            "Current preferences could not be verified. No save was sent.",
        });
    } finally {
      if (this.active === controller) this.active = undefined;
    }
  }
  adoptCurrent() {
    const attempt = this.journal.read();
    const document = this.view.document;
    if (
      this.active ||
      !this.current() ||
      !document ||
      !attempt.request ||
      !["unknown", "result-withheld"].includes(this.view.status) ||
      document.revision <= attempt.request.expectedRevision
    )
      return;
    this.journal.write({ status: "idle" });
    this.show({
      status: "ready",
      document,
      message:
        "Using the reviewed current saved preferences. The previous draft has not been reapplied.",
    });
  }
  async save(preferences: UserPreferences) {
    if (
      this.active ||
      !this.current() ||
      this.view.status !== "ready" ||
      !this.view.document ||
      this.journal.read().status !== "idle"
    )
      return;
    const revision = this.view.document.revision;
    const controller = new AbortController();
    this.active = controller;
    let dispatched = false;
    try {
      const request = await receiveUserPreferencesRequest(
        "save",
        JSON.stringify({ expectedRevision: revision, preferences }),
      );
      if (!this.current() || controller.signal.aborted) return;
      this.journal.write({ status: "pending", request });
      this.show({
        status: "saving",
        message: "Saving the complete captured preferences document once.",
      });
      dispatched = true;
      const reply = await this.port.save(request, controller.signal);
      if (!this.current() || controller.signal.aborted) return;
      if ("error" in reply) {
        this.error(reply, true);
        return;
      }
      // Keep the exact attempt until a separate read confirms the canonical state.
      this.journal.write({ status: "saved", request });
      this.show({
        status: "saved",
        message:
          "Save accepted. Read back current preferences to confirm the stored revision.",
      });
    } catch (error) {
      if (!this.current() || controller.signal.aborted) return;
      if (error instanceof PreferencesAccessLost) this.lost();
      else if (dispatched) {
        this.journal.write({ ...this.journal.read(), status: "unknown" });
        this.show({
          status: "unknown",
          message:
            "The save outcome is uncertain. Check current settings; no save will be retried.",
        });
      } else
        this.show({
          ...this.view,
          message:
            "Check the supported preference values, including a canonical IANA timezone, before saving.",
        });
    } finally {
      if (this.active === controller) this.active = undefined;
    }
  }
  dispose() {
    if (this.journal.read().status === "pending")
      this.journal.write({ ...this.journal.read(), status: "unknown" });
    this.disposed = true;
    this.active?.abort();
    this.active = undefined;
    this.view = Object.freeze({
      status: "access-lost",
      message:
        "This preferences view was closed. Reopen to verify current settings.",
    });
    this.listeners.clear();
  }
}
