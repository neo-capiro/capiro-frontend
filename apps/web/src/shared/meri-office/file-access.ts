import { receiveOfficeDownload } from "@capiro/meri-contracts/office-application";
import { withActionDeadline } from "../meri-actions/bounded-json";
import type { ConversationContext } from "../meri-conversations/session";
import { createLinkTransport } from "../meri-documents/link-transport";
import { createDocumentLibraryAccess } from "../meri-documents/library-access";
import { createOfficeTransport, type OfficeTransport } from "./transport";

async function downloadFile(
  port: OfficeTransport,
  links: ReturnType<typeof createLinkTransport>,
  versionId: string,
  signal: AbortSignal,
  check: () => void,
  accessLost: () => void,
) {
  const reply = await port.request("inspect", { versionId }, signal);
  check();
  if ("error" in reply.value) throw new Error("Office inspection unavailable");
  const link = await links.issue(versionId, signal);
  check();
  if (!link.ok) {
    if (link.accessDenied) accessLost();
    throw new Error("Office download unavailable");
  }
  const redeemed = await links.redeem(link.token, signal);
  if (!redeemed.ok) {
    check();
    if (redeemed.accessDenied) accessLost();
    throw new Error("Office download unavailable");
  }
  try {
    check();
    const file = await receiveOfficeDownload(
      redeemed.response,
      reply.value.document.version,
      { signal, maxBytes: 16 * 1024 * 1024 },
    );
    check();
    return {
      filename: file.version.filename,
      mimeType: file.version.mimeType,
      bytes: file.bytes,
    };
  } finally {
    void redeemed.response.body?.cancel().catch(() => undefined);
  }
}

/** Same native session and existing signed-link owner. Office's public receiver
 * admits the truthful edited-XLSX inspection and verifies the immutable bytes;
 * the revision history is the same immutable artifact history the library reads. */
export function createOfficeBrowserPort(
  options: Parameters<typeof createOfficeTransport>[0] & {
    context: ConversationContext;
  },
) {
  const local = new AbortController(),
    lifetime = AbortSignal.any([options.lifetime, local.signal]);
  const port = createOfficeTransport({ ...options, lifetime });
  const links = createLinkTransport(
    options.credential,
    lifetime,
    options.fetcher,
  );
  const library = createDocumentLibraryAccess({
    credential: options.credential,
    context: options.context,
    lifetime,
    onAccessLost: options.onAccessLost,
    ...(options.fetcher ? { fetcher: options.fetcher } : {}),
  });
  let active = 0;
  const bounded = <T>(
    caller: AbortSignal,
    work: (signal: AbortSignal, check: () => void) => Promise<T>,
  ) =>
    withActionDeadline([caller, lifetime], (signal) => {
      const check = () => {
        signal.throwIfAborted();
        if (!options.isCurrent()) throw new Error("Office context changed");
      };
      check();
      return work(signal, check);
    });
  return {
    request: port.request,
    pending: () => active > 0 || port.pending() || library.pending(),
    dispose() {
      local.abort();
      library.dispose();
      port.dispose();
    },
    async download(versionId: string, caller: AbortSignal) {
      active++;
      try {
        return await bounded(caller, (signal, check) =>
          downloadFile(
            port,
            links,
            versionId,
            signal,
            check,
            options.onAccessLost,
          ),
        );
      } finally {
        active--;
      }
    },
    /** The immutable revisions of the opened version's artifact, newest first, from the same owner the library reads. */
    history(versionId: string, caller: AbortSignal) {
      return bounded(caller, (signal) =>
        library.history({ versionId, limit: 50, cursor: null }, signal),
      );
    },
  };
}
export type OfficeBrowserPort = ReturnType<typeof createOfficeBrowserPort>;
