import type {
  CompletedReport,
  CompletedReportSummary,
  LegacyReportClient,
} from "./client";

type State = {
  reports: CompletedReportSummary[];
  cursor: string | null;
  loaded: boolean;
  busy: boolean;
  selected: CompletedReport | null;
  problem: string | null;
};
const initial = (): State => ({
  reports: [],
  cursor: null,
  loaded: false,
  busy: false,
  selected: null,
  problem: null,
});

/** One mounted account/client view. No cross-account cache or stored report body. */
export class LegacyReportController {
  private state = initial();
  private active: AbortController | null = null;
  private mounted = false;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly client: LegacyReportClient) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  mount() {
    this.mounted = true;
    return () => {
      this.mounted = false;
      this.active?.abort();
      this.active = null;
      this.update(initial());
    };
  }
  clear() {
    if (!this.state.busy) this.update({ selected: null });
  }
  async load(refresh = false) {
    if (
      !this.mounted ||
      this.state.busy ||
      (!refresh && this.state.loaded && this.state.cursor === null)
    )
      return;
    const request = new AbortController(),
      cursor = refresh ? null : this.state.cursor;
    this.active = request;
    this.update({
      ...(refresh ? initial() : {}),
      busy: true,
      selected: null,
      problem: null,
    });
    try {
      const page = await this.client.list(cursor, request.signal);
      if (request.signal.aborted || this.active !== request || !this.mounted)
        return;
      const prior = refresh ? [] : this.state.reports;
      if (
        (page.nextCursor !== null && page.nextCursor === cursor) ||
        page.reports.some((row) => prior.some((old) => old.id === row.id))
      )
        throw Error("Repeated completed report page");
      this.update({
        reports: [...prior, ...page.reports],
        cursor: page.nextCursor,
        loaded: true,
      });
    } catch {
      if (!request.signal.aborted && this.mounted)
        this.update({
          ...initial(),
          problem:
            "Completed reports could not be verified. Refresh to check current access.",
        });
    } finally {
      if (this.active === request) {
        this.active = null;
        this.update({ busy: false });
      }
    }
  }
  async open(id: string): Promise<CompletedReport | null> {
    if (
      !this.mounted ||
      this.state.busy ||
      !this.state.reports.some((row) => row.id === id)
    )
      return null;
    const request = new AbortController();
    this.active = request;
    this.update({ busy: true, selected: null, problem: null });
    try {
      const report = await this.client.read(id, request.signal);
      if (request.signal.aborted || this.active !== request || !this.mounted)
        return null;
      this.update({ selected: report });
      return report;
    } catch {
      if (!request.signal.aborted && this.mounted)
        this.update({
          ...initial(),
          problem:
            "This report could not be verified with current access. Refresh the list before trying again.",
        });
      return null;
    } finally {
      if (this.active === request) {
        this.active = null;
        this.update({ busy: false });
      }
    }
  }
}
