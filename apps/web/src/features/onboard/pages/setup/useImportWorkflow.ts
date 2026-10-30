import { useNavigate } from "../../navigation";
import { useLocalOnboardRecord } from "../../lib/use-local-record";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import { useClientImport } from "../../lib/use-client-import";
import {
  classifyImportJobFailure,
  useImportAccountScope,
  useImportJobByRequest,
  useImportJobDetail,
  useImportJobPage,
} from "../../lib/use-import-job-reads";
import {
  deriveImportJobPanelState,
  newestImportJob,
} from "../../lib/import-job-status";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "../funnel/shared";
import { useCapiroApi, type ImportCandidate } from "../../lib/capiro-api";
const REGISTRANT_KEY = ["capiro", "registrant"] as const;
const CANDIDATES_KEY = ["capiro", "import-candidates"] as const;

export type ImportWorkflowOptions = {
  cap: number;
  imported: number;
  plan: "trial" | "paid";
  onImported: (created: number) => Promise<void>;
};
export function useImportWorkflow({
  cap,
  imported,
  plan,
  onImported,
}: ImportWorkflowOptions) {
  const api = useCapiroApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const account = useImportAccountScope();
  const importer = useClientImport(api, account.scope);
  const manual = useOnboardAttempt(api, "manual-client-create");
  const firm = useOnboardAttempt(api, "select-registrant");

  // Durable job reads: account-scoped keys, a retained request identity (reload
  // reconciliation) and one explicit selected job. Reads never submit.
  // Reading position is keyed to the account so an account switch cannot show
  // or re-open the previous account's job.
  const [selection, setSelection] = React.useState<{
    scopeKey: string;
    jobId: string | null;
  }>({ scopeKey: account.scopeKey, jobId: null });
  if (selection.scopeKey !== account.scopeKey)
    setSelection({ scopeKey: account.scopeKey, jobId: null });
  const [paging, setPaging] = React.useState<{
    scopeKey: string;
    cursor: string | null;
  }>({ scopeKey: account.scopeKey, cursor: null });
  if (paging.scopeKey !== account.scopeKey)
    setPaging({ scopeKey: account.scopeKey, cursor: null });
  const selectedJobId =
    selection.scopeKey === account.scopeKey ? selection.jobId : null;
  const olderCursor =
    paging.scopeKey === account.scopeKey ? paging.cursor : null;
  const history = useImportJobPage(api, account.scopeKey, account.ready);
  const older = useImportJobPage(
    api,
    account.scopeKey,
    account.ready && !!olderCursor,
    olderCursor ?? undefined,
  );
  const retainedLookup = useImportJobByRequest(
    api,
    account.scopeKey,
    importer.retained?.requestId ?? null,
  );
  const jobs = React.useMemo(() => {
    const seen = new Set<string>();
    const merged = [...(history.data?.jobs ?? []), ...(older.data?.jobs ?? [])];
    return merged.filter((job) => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });
  }, [history.data, older.data]);
  const newest = retainedLookup.data?.jobs[0] ?? newestImportJob(jobs);
  const activeJobId =
    selectedJobId ?? importer.lastJob?.id ?? newest?.id ?? null;
  const jobDetail = useImportJobDetail(api, account.scopeKey, activeJobId);
  const job =
    jobDetail.data ??
    retainedLookup.data?.jobs[0] ??
    jobs.find((entry) => entry.id === activeJobId) ??
    null;
  const failureSource =
    history.error ??
    older.error ??
    retainedLookup.error ??
    jobDetail.error ??
    null;
  const failure = failureSource
    ? classifyImportJobFailure(failureSource)
    : null;
  const panelState = deriveImportJobPanelState({
    ready: account.ready,
    loading:
      history.isLoading ||
      retainedLookup.isLoading ||
      (!!activeJobId && jobDetail.isLoading && !jobDetail.data),
    failure,
    totalJobs: history.data?.population.total ?? 0,
  });
  const population = history.data?.population ?? older.data?.population;
  const nextCursor = older.data?.nextCursor ?? history.data?.nextCursor ?? null;

  const refreshJobs = async () => {
    await Promise.all([
      history.refetch(),
      retainedLookup.refetch(),
      jobDetail.refetch(),
      olderCursor ? older.refetch() : Promise.resolve(),
    ]);
  };
  const loadOlderJobs = () => {
    if (nextCursor)
      setPaging({ scopeKey: account.scopeKey, cursor: nextCursor });
  };
  const selectJob = (jobId: string) =>
    setSelection({ scopeKey: account.scopeKey, jobId });

  const registrant = useQuery({
    queryKey: REGISTRANT_KEY,
    queryFn: () => api.getRegistrant(),
    retry: false,
  });
  const candidatesQuery = useQuery({
    queryKey: CANDIDATES_KEY,
    queryFn: () => api.getImportCandidates(),
    enabled:
      registrant.isSuccess &&
      !registrant.error &&
      registrant.data?.ldaRegistrantId != null,
    retry: false,
  });

  // Stage: search until the tenant has a registrant; "Change firm" overrides
  // back; "manual" is the type-it-in path for firms/clients not in LDA data.
  const [stageOverride, setStageOverride] = React.useState<
    "search" | "table" | "manual" | null
  >(null);
  const stage =
    stageOverride ??
    (registrant.data?.ldaRegistrantId != null ? "table" : "search");

  const [q, setQ] = React.useState("");
  const [submittedQ, setSubmittedQ] = React.useState("");
  const [settingFirm, setSettingFirm] = React.useState(false);
  const [sel, setSel] = React.useState<number[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Manual-add form (stage === 'manual').
  const [retainedManual, retainManual] = useLocalOnboardRecord<{
    name: string;
    website: string;
    description: string;
  }>("manual-client-draft");
  const [mName, setMName] = React.useState(retainedManual?.name ?? "");
  const [mWebsite, setMWebsite] = React.useState(retainedManual?.website ?? "");
  const [mDesc, setMDesc] = React.useState(retainedManual?.description ?? "");
  const [manualBusy, setManualBusy] = React.useState(false);
  const [manualAdded, setManualAdded] = React.useState(0);

  const search = useQuery({
    queryKey: ["capiro", "lda-registrants", submittedQ],
    queryFn: () => api.searchLdaRegistrants(submittedQ),
    enabled: submittedQ.trim().length >= 2,
    retry: false,
  });

  const currentReadError = registrant.error ?? candidatesQuery.error;
  const [selectionReadError, setSelectionReadError] =
    React.useState<unknown>(null);
  if (selectionReadError !== currentReadError) {
    setSelectionReadError(currentReadError);
    if (currentReadError) {
      setSel([]);
      setStageOverride(null);
    }
  }

  const candidates: ImportCandidate[] =
    candidatesQuery.isSuccess && !candidatesQuery.error
      ? candidatesQuery.data.candidates
      : [];
  const registrantName =
    candidatesQuery.data?.registrantName ??
    registrant.data?.ldaRegistrantName ??
    "";
  const notImported = candidates.filter((c) => c.onboardedAs == null);
  const remaining = Math.max(0, cap - imported);
  const capHit = sel.length >= remaining;

  const toggle = (id: number) => {
    if (importer.locked) return;
    setSel((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < remaining
          ? [...s, id]
          : s,
    );
  };

  const chooseFirm = async (registrantId: number) => {
    if (settingFirm || firm.blocked() || !search.isSuccess || search.error)
      return;
    setSettingFirm(true);
    setError(null);
    try {
      await firm.run("Select the reviewed LDA firm", async (guard) => {
        await guard.wait(() => api.setRegistrant(registrantId));
        await guard.wait(() =>
          queryClient.invalidateQueries({ queryKey: REGISTRANT_KEY }),
        );
        await guard.wait(() =>
          queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY }),
        );
        setSel([]);
        setStageOverride("table");
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSettingFirm(false);
    }
  };

  const refreshCurrent = async () => {
    const guard = importer.guard();
    try {
      await guard.wait(() =>
        queryClient.invalidateQueries({ queryKey: REGISTRANT_KEY }),
      );
      await guard.wait(() =>
        queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY }),
      );
      await guard.wait(() => onImported(0));
    } catch (err) {
      if (guard.current()) setError(errorMessage(err));
    }
  };
  const doImport = async (): Promise<number> => {
    if (
      importing ||
      importer.blocked() ||
      sel.length === 0 ||
      !candidatesQuery.isSuccess ||
      candidatesQuery.error
    )
      return 0;
    setImporting(true);
    setError(null);
    const guard = importer.guard();
    try {
      const result = await guard.wait(() => importer.run(sel));
      await guard.wait(() => onImported(result.created));
      await guard.wait(() =>
        queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY }),
      );
      setSel([]);
      // Keep all created/skipped/cap outcomes visible; Done closes deliberately.
      return result.created;
    } catch (err) {
      if (guard.current()) setError(errorMessage(err));
      return 0;
    } finally {
      setImporting(false);
    }
  };

  // Counts are refreshed before another creation; manualAdded is display only.
  const remainingAfterManual = Math.max(0, cap - imported);

  const doManualAdd = async () => {
    const name = mName.trim();
    if (manualBusy || manual.blocked() || !name) return;
    if (remainingAfterManual <= 0) {
      setError(
        `That's your ${cap}-profile ${plan === "paid" ? "" : "trial "}limit.`,
      );
      return;
    }
    setManualBusy(true);
    setError(null);
    try {
      retainManual({ name, website: mWebsite, description: mDesc });
      await manual.run(`Create client ${name}`, async (guard) => {
        await guard.wait(() =>
          api.createClient({
            name,
            ...(mWebsite.trim() ? { website: mWebsite.trim() } : {}),
            ...(mDesc.trim() ? { description: mDesc.trim() } : {}),
          }),
        );
        setManualAdded((n) => n + 1);
        await guard.wait(() => onImported(1)); // Current count before another creation.
        setMName("");
        setMWebsite("");
        setMDesc("");
        retainManual({ name: "", website: "", description: "" });
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setManualBusy(false);
    }
  };
  return {
    stage,
    importer,
    firm,
    refreshCurrent,
    manual,
    setStageOverride,
    error,
    setError,
    mName,
    setMName,
    mWebsite,
    setMWebsite,
    mDesc,
    setMDesc,
    manualBusy,
    manualAdded,
    search,
    remaining,
    remainingAfterManual,
    doManualAdd,
    registrant,
    q,
    setQ,
    submittedQ,
    setSubmittedQ,
    settingFirm,
    chooseFirm,
    navigate,
    candidatesQuery,
    sel,
    setSel,
    importing,
    candidates,
    registrantName,
    notImported,
    capHit,
    toggle,
    doImport,
    account,
    jobs,
    job,
    population,
    nextCursor,
    panelState,
    refreshJobs,
    loadOlderJobs,
    selectJob,
  };
}
export type ImportWorkflow = ReturnType<typeof useImportWorkflow>;
