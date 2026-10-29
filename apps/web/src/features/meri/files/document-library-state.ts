import type {
  DocumentLibraryAccess,
  LibraryScope,
  LibraryVersion,
} from "../../../shared/meri-documents/library-access";
import type { ArtifactPreview } from "../../../shared/meri-documents/artifact-access";
import { DocumentDownloadUrl } from "./download-url";

type Query = { scope: LibraryScope } | { anchor: LibraryVersion };
export type DocumentLibraryState = Readonly<{
  versions: readonly LibraryVersion[];
  selected: LibraryVersion | null;
  nextCursor: string | null;
  loaded: boolean;
  busy: boolean;
  problem: string | null;
  inspection: ArtifactPreview | null;
  download: { url: string; filename: string } | null;
}>;
const empty = (): DocumentLibraryState => ({
  versions: [],
  selected: null,
  nextCursor: null,
  loaded: false,
  busy: false,
  problem: null,
  inspection: null,
  download: null,
});

/** Bounded metadata paging and local download lifetime; the borrowed port owns authority. */
export class DocumentLibraryController {
  private state = empty();
  private listeners = new Set<() => void>();
  private request: AbortController | null = null;
  private active = true;
  private headVersionId: string | null = null;
  constructor(
    private readonly port: DocumentLibraryAccess,
    private readonly query: Query,
    private readonly urls = new DocumentDownloadUrl(),
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<DocumentLibraryState>) {
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener();
  }
  attach = () => {
    this.active = true;
    return () => {
      this.active = false;
      this.request?.abort();
      this.request = null;
      this.urls.clear();
      this.state = empty();
    };
  };
  private start() {
    if (!this.active || this.state.busy) return null;
    const request = new AbortController();
    this.request = request;
    this.publish({ busy: true, problem: null });
    return request;
  }
  private current(request: AbortController) {
    return this.active && this.request === request && !request.signal.aborted;
  }
  private refused(message: string) {
    this.urls.clear();
    this.headVersionId = null;
    this.publish({ ...empty(), problem: message });
  }
  private finish(request: AbortController) {
    if (this.current(request)) {
      this.request = null;
      this.publish({ busy: false });
    }
  }
  reload = async () => {
    this.request?.abort();
    this.request = null;
    this.urls.clear();
    this.headVersionId = null;
    this.publish(empty());
    await this.loadMore();
  };
  loadMore = async () => {
    if (this.state.loaded && this.state.nextCursor === null) return;
    const request = this.start();
    if (!request) return;
    try {
      const cursor = this.state.nextCursor;
      const reply =
        "scope" in this.query
          ? await this.port.list(
              { scope: this.query.scope, limit: 25, cursor },
              request.signal,
            )
          : await this.port.history(
              { versionId: this.query.anchor.versionId, limit: 25, cursor },
              request.signal,
            );
      if (!this.current(request)) return;
      if (!reply.ok) {
        this.refused(
          reply.accessDenied
            ? "Current file access was refused. Reload the library to check again."
            : "The library could not be verified. Reload before continuing.",
        );
        return;
      }
      const page = reply.value,
        previous = this.state.versions;
      const key = (version: LibraryVersion) =>
        "scope" in this.query ? version.artifactId : version.versionId;
      const seen = new Set(previous.map(key));
      if (page.versions.some((version) => seen.has(key(version))))
        throw Error("Repeated library page");
      if (page.nextCursor !== null && page.nextCursor === cursor)
        throw Error("Repeated continuation");
      if ("anchor" in this.query) {
        if (
          !("headVersionId" in page) ||
          page.artifactId !== this.query.anchor.artifactId ||
          page.anchorVersionId !== this.query.anchor.versionId ||
          (this.headVersionId !== null &&
            this.headVersionId !== page.headVersionId) ||
          (previous.length > 0 &&
            previous.at(-1)!.parentVersionId !== page.versions[0]?.versionId)
        )
          throw Error("History changed");
        this.headVersionId = page.headVersionId;
      }
      this.publish({
        versions: [...previous, ...page.versions],
        loaded: true,
        nextCursor: page.nextCursor,
      });
    } catch {
      if (this.current(request))
        this.refused(
          "The library changed or could not be verified. Reload before continuing.",
        );
    } finally {
      this.finish(request);
    }
  };
  select = (version: LibraryVersion) => {
    if (
      !this.active ||
      !this.state.versions.some((item) => item.versionId === version.versionId)
    )
      return;
    this.request?.abort();
    this.request = null;
    this.urls.clear();
    this.publish({
      selected: version,
      busy: false,
      problem: null,
      inspection: null,
      download: null,
    });
  };
  inspect = async () => {
    const selected = this.state.selected;
    if (!selected) return;
    const request = this.start();
    if (!request) return;
    try {
      const reply = await this.port.inspect(selected.versionId, request.signal);
      if (!this.current(request)) return;
      if (!reply.ok || reply.value.versionId !== selected.versionId) {
        this.refused(
          "Current file details could not be verified. Reconnect before continuing.",
        );
        return;
      }
      this.publish({ inspection: reply.value });
    } catch {
      if (this.current(request))
        this.refused("Current file details could not be verified.");
    } finally {
      this.finish(request);
    }
  };
  download = async () => {
    const selected = this.state.selected;
    if (!selected) return;
    const request = this.start();
    if (!request) return;
    this.urls.clear();
    this.publish({ download: null });
    try {
      const reply = await this.port.download(
        selected.versionId,
        request.signal,
      );
      if (!this.current(request)) return;
      if (!reply.ok) {
        this.refused(
          "Current download access could not be verified. Reconnect before continuing.",
        );
        return;
      }
      const url = this.urls.replace(
        new Blob([reply.value.bytes], { type: reply.value.mimeType }),
      );
      this.publish({ download: { url, filename: reply.value.filename } });
    } catch {
      if (this.current(request))
        this.refused("The download could not be verified.");
    } finally {
      this.finish(request);
    }
  };
}
