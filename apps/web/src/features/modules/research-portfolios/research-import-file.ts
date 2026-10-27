/** The Core CSV parser owns validation. This bounded header read only offers column mapping. */
export function csvHeaders(text: string): string[] {
  const headers: string[] = [];
  let value = "",
    quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n" || char === "\r")) {
      headers.push(value.replace(/^\uFEFF/, ""));
      value = "";
      if (char !== ",") return headers;
    } else value += char;
  }
  if (quoted) throw new Error("The CSV header has an unfinished quoted value.");
  headers.push(value.replace(/^\uFEFF/, ""));
  return headers;
}
export const worksheetFields = {
  membership: {
    required: ["target_kind", "target_id"],
    optional: ["label", "reason", "evidence", "access"],
  },
  rules: {
    required: ["readable_expression", "expression_json"],
    optional: [
      "reason",
      "access",
      "mode",
      "qualification_policy_json",
      "taxonomy_version_id",
      "template_version_id",
    ],
  },
  reviews: {
    required: ["target_kind", "target_id", "reason"],
    optional: ["decision_type", "evidence_for", "evidence_against", "access"],
  },
} as const;
export async function readImportFile(file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a CSV file between 1 byte and 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return {
    fileName: file.name,
    contentBase64: btoa(binary),
    headers: csvHeaders(text),
  };
}
