import { useOnboardAttempt } from "./use-onboard-attempt";
import { useLocalOnboardRecord } from "./use-local-record";
import {
  importClientSelection,
  InterruptedImport,
} from "./import-client-selection";
import type { CapiroApi, ImportResult } from "./capiro-api";

type ImportEvidence = {
  requested: number[];
  receipt: ImportResult;
  unknownIds: number[];
  unattemptedIds: number[];
};
const empty = (): ImportResult => ({
  created: 0,
  items: [],
  skipped: [],
  capMessage: null,
});
export function useClientImport(api: CapiroApi) {
  const attempt = useOnboardAttempt(api, "client-import");
  const [evidence, save] = useLocalOnboardRecord<ImportEvidence>(
    "client-import-receipts",
  );
  const run = (selected: number[]) =>
    attempt.run(
      `Import ${selected.length} reviewed client IDs`,
      async (guard) => {
        const requested = [...selected];
        let receipt = empty();
        let offset = 0;
        save({ requested, receipt, unknownIds: [], unattemptedIds: requested });
        try {
          const result = await importClientSelection(requested, async (ids) => {
            // Unknown is installed before dispatch so closing the view preserves it.
            guard.assertCurrent();
            save({
              requested,
              receipt,
              unknownIds: ids,
              unattemptedIds: requested.slice(offset + ids.length),
            });
            const next = await guard.wait(() => api.importClientChunk(ids));
            receipt = {
              created: receipt.created + next.created,
              items: [...receipt.items, ...next.items],
              skipped: [...receipt.skipped, ...next.skipped],
              capMessage: null,
            };
            offset += ids.length;
            save({
              requested,
              receipt,
              unknownIds: [],
              unattemptedIds: requested.slice(offset),
            });
            return next;
          });
          guard.assertCurrent();
          save({
            requested,
            receipt: result,
            unknownIds: [],
            unattemptedIds: requested.slice(offset),
          });
          return result;
        } catch (error) {
          if (guard.current() && error instanceof InterruptedImport)
            save({
              requested,
              receipt: error.partial,
              unknownIds: error.unknownIds,
              unattemptedIds: error.unattemptedIds,
            });
          throw error;
        }
      },
    );
  return { ...attempt, evidence, run };
}
