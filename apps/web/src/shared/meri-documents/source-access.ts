import type {
  ArtifactAccess,
  ArtifactPreview,
  ArtifactReply,
} from "./artifact-access";

export const sourceViewMaxBytes = 256 * 1024;
type NativeSource = Extract<ArtifactPreview, { kind: "native-file" }>;
const extensions = new Set([
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "jsx",
  "ts",
  "tsx",
  "json",
  "py",
  "r",
  "sql",
  "sh",
  "bash",
  "ps1",
  "txt",
  "md",
  "csv",
  "yaml",
  "yml",
  "xml",
  "svg",
  "c",
  "h",
  "cpp",
  "hpp",
  "java",
  "go",
  "rs",
]);

/** This is a display policy, never an execution or data-authority grant. */
export function supportsSourceView(
  preview: ArtifactPreview,
): preview is NativeSource {
  return (
    preview.kind === "native-file" &&
    extensions.has(preview.filename.split(".").at(-1)?.toLowerCase() ?? "")
  );
}

/** Download freshly rechecks the exact immutable version and verifies its bytes. */
export async function readArtifactSource(
  access: ArtifactAccess,
  preview: NativeSource,
  signal: AbortSignal,
): Promise<ArtifactReply<string>> {
  if (signal.aborted) return { ok: false, code: "CANCELLED" };
  if (!supportsSourceView(preview))
    return { ok: false, code: "SOURCE_UNSUPPORTED" };
  if (preview.bytes > sourceViewMaxBytes)
    return { ok: false, code: "SOURCE_TOO_LARGE" };
  const reply = await access.download(preview.versionId, signal);
  if (signal.aborted) return { ok: false, code: "CANCELLED" };
  if (!reply.ok) return reply;
  if (
    reply.value.filename !== preview.filename ||
    reply.value.bytes.byteLength !== preview.bytes
  )
    return { ok: false, code: "SOURCE_MISMATCH" };
  if (reply.value.bytes.byteLength > sourceViewMaxBytes)
    return { ok: false, code: "SOURCE_TOO_LARGE" };
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      reply.value.bytes,
    );
    // Binary/control-bearing files stay downloadable; they are not presented as source text.
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text))
      return { ok: false, code: "SOURCE_NOT_TEXT" };
    return { ok: true, value: text };
  } catch {
    return { ok: false, code: "SOURCE_NOT_UTF8" };
  }
}
