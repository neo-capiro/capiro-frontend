import { receiveOfficeDownload } from "@capiro/meri-contracts/office-application";
import { withActionDeadline } from "../meri-actions/bounded-json";
import { createLinkTransport } from "../meri-documents/link-transport";
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
 * admits the truthful edited-XLSX inspection and verifies the immutable bytes. */
export function createOfficeBrowserPort(
  options: Parameters<typeof createOfficeTransport>[0],
) {
  const local = new AbortController(),
    lifetime = AbortSignal.any([options.lifetime, local.signal]);
  const port = createOfficeTransport({ ...options, lifetime });
  const links = createLinkTransport(
    options.credential,
    lifetime,
    options.fetcher,
  );
  let active = 0;
  return {
    request: port.request,
    pending: () => active > 0 || port.pending(),
    dispose() {
      local.abort();
      port.dispose();
    },
    async download(versionId: string, caller: AbortSignal) {
      active++;
      try {
        return await withActionDeadline([caller, lifetime], (signal) => {
          const check = () => {
            signal.throwIfAborted();
            if (!options.isCurrent()) throw new Error("Office context changed");
          };
          check();
          return downloadFile(
            port,
            links,
            versionId,
            signal,
            check,
            options.onAccessLost,
          );
        });
      } finally {
        active--;
      }
    },
  };
}
export type OfficeBrowserPort = ReturnType<typeof createOfficeBrowserPort>;
