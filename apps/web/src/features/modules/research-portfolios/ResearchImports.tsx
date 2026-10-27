"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import { researchWorksheetKinds } from "../../../shared/capiro/operations/research-imports";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { readImportFile, worksheetFields } from "./research-import-file";
import styles from "./research.module.css";
import { ImportWorksheet } from "./ImportWorksheet";
export function ResearchImports({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [kind, setKind] =
    useState<(typeof researchWorksheetKinds)[number]>("membership");
  const [file, setFile] =
    useState<Awaited<ReturnType<typeof readImportFile>>>();
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<Error>();
  const [reading, setReading] = useState(false);
  const jobId = search.get("importJobId") ?? "";
  function setJobId(id: string) {
    const next = new URLSearchParams(search);
    next.set("importJobId", id);
    router.replace(`${pathname}?${next}`);
  }
  const [openId, setOpenId] = useState(jobId);
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const create = useCapiroMutation("research.imports.create");
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const fields = worksheetFields[kind];
  async function start() {
    if (!file || !editable) return;
    try {
      const job = await create.run({
        params: { id: portfolio.id },
        body: {
          operationKey,
          expectedRevision: portfolio.revision,
          worksheetKind: kind,
          fileName: file.fileName,
          mediaType: "text/csv",
          contentBase64: file.contentBase64,
          schemaVersion: `${kind}-v1`,
          mapping,
        },
      });
      setJobId(job.id);
      setOpenId(job.id);
      setOperationKey(crypto.randomUUID());
      onReload();
    } catch {
      /* Keep the selected file; check the receipt before another create. */
    }
  }
  return (
    <div className={styles.stack}>
      <Panel
        title="Import worksheet"
        description="Upload a CSV, map its columns, then preview and repair rows before applying them. Original rows and each result remain in the receipt."
      >
        <div className={`${styles.content} ${styles.form}`}>
          <fieldset
            disabled={
              !editable || create.pending || reading || Boolean(create.error)
            }
          >
            <legend>CSV upload</legend>
            <label>
              Worksheet{" "}
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as typeof kind);
                  setMapping({});
                }}
              >
                {researchWorksheetKinds.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <input
              aria-label="CSV file"
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const selected = e.target.files?.[0];
                setFile(undefined);
                setMapping({});
                setError(undefined);
                if (!selected) return;
                setReading(true);
                try {
                  setFile(await readImportFile(selected));
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure
                      : new Error("Could not read CSV"),
                  );
                } finally {
                  setReading(false);
                }
              }}
            />
            {file && (
              <>
                <p>{file.fileName}</p>
                {[...fields.required, ...fields.optional].map((field) => (
                  <label key={field}>
                    {field.replaceAll("_", " ")}
                    {fields.required.some((required) => required === field)
                      ? " (required)"
                      : ""}
                    <select
                      value={mapping[field] ?? ""}
                      onChange={(e) =>
                        setMapping((current) => {
                          const next = { ...current };
                          if (e.target.value) next[field] = e.target.value;
                          else delete next[field];
                          return next;
                        })
                      }
                    >
                      <option value="">Use matching column name</option>
                      {file.headers.map((header) => (
                        <option key={header}>{header}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </>
            )}
          </fieldset>
          <StatusPanel error={error || create.error} />
          <ActionButton
            disabled={!editable || !file || create.pending || reading}
            onClick={() => void start()}
          >
            Create import worksheet
          </ActionButton>
          <Field label="Open an import receipt" htmlFor="research-import-id">
            <TextInput
              id="research-import-id"
              value={openId}
              onChange={(e) => setOpenId(e.target.value)}
              placeholder="Import ID from your receipt"
            />
          </Field>
          <ActionButton
            disabled={!openId.trim()}
            onClick={() => setJobId(openId.trim())}
          >
            Open import
          </ActionButton>
        </div>
      </Panel>
      {jobId && (
        <ImportWorksheet
          key={`${portfolio.id}:${jobId}`}
          portfolio={portfolio}
          jobId={jobId}
          onReload={onReload}
        />
      )}
    </div>
  );
}
