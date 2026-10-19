import { useQueryClient } from "@tanstack/react-query";
import { createSetupReadLifetime } from "../../lib/setup-state-read";
import { SETUP_STATE_KEY } from "../../lib/setup-overlay-lifetime";
import { useOnboardAttempt } from "../../lib/use-onboard-attempt";
import React from "react";
import { errorMessage } from "../funnel/shared";
import {
  useSetupApi,
  type SetupState,
  type SetupTaskKey,
} from "../../lib/setup";
export function useSetupActions(S: SetupState, refetch: () => Promise<void>) {
  const setupApi = useSetupApi();
  const cache = useQueryClient();
  const lifetime = React.useMemo(() => {
    void setupApi;
    return createSetupReadLifetime(cache);
  }, [cache, setupApi]);
  React.useLayoutEffect(() => lifetime.subscribe(), [lifetime]);
  const currentImport = React.useCallback(
    () =>
      lifetime.current() &&
      cache.getQueryData<SetupState>(SETUP_STATE_KEY)?.importMode === "self",
    [cache, lifetime],
  );
  const inviteWrite = useOnboardAttempt(
    setupApi,
    "it-invitation",
    lifetime.current,
  );
  const importTask = useOnboardAttempt(
    setupApi,
    "complete-import-task",
    currentImport,
  );
  const memoryTask = useOnboardAttempt(
    setupApi,
    "complete-memory-task",
    lifetime.current,
  );
  const tasks = S.tasks;
  const [newIt, setNewIt] = React.useState("");
  const [addingAnother, setAddingAnother] = React.useState(false);
  const [sendingInvite, setSendingInvite] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [itError, setItError] = React.useState<string | null>(null);
  const latestSentInvite =
    [...S.itInvites].reverse().find((i) => i.status === "sent") ??
    S.itInvites[S.itInvites.length - 1];

  const sendItInvite = async () => {
    if (!newIt.includes("@") || sendingInvite || inviteWrite.blocked()) return;
    setSendingInvite(true);
    setItError(null);
    try {
      await inviteWrite.run(
        `Send IT invitation to ${newIt.trim()}`,
        async (guard) => {
          await guard.wait(() => setupApi.createItInvite(newIt.trim()));
          await guard.wait(() => refetch());
          setNewIt("");
          setAddingAnother(false);
        },
      );
    } catch (err) {
      setItError(errorMessage(err));
    } finally {
      setSendingInvite(false);
    }
  };

  const resendItInvite = async () => {
    if (!latestSentInvite || resending || inviteWrite.blocked()) return;
    setResending(true);
    setItError(null);
    try {
      await inviteWrite.run(
        "Resend and rotate the selected IT invitation link",
        async (guard) => {
          await guard.wait(() => setupApi.resendItInvite(latestSentInvite.id));
          await guard.wait(() => refetch());
        },
      );
    } catch (err) {
      setItError(errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const transitionToDone = async (task: SetupTaskKey) => {
    const from = tasks[task];
    if (from === "done" || from === "skipped") {
      await refetch();
      return;
    }
    const write =
      task === "import" ? importTask : task === "firm_ai" ? memoryTask : null;
    if (!write || write.blocked()) return;
    try {
      await write.run(`Complete the ${task} setup task`, async (guard) => {
        await guard.wait(() => setupApi.transitionTask(task, from, "done"));
        await guard.wait(() => refetch());
      });
    } catch (err) {
      setItError(errorMessage(err));
    }
  };

  return {
    inviteWrite,
    importTask,
    memoryTask,
    latestSentInvite,
    newIt,
    setNewIt,
    addingAnother,
    setAddingAnother,
    sendingInvite,
    resending,
    itError,
    setItError,
    sendItInvite,
    resendItInvite,
    transitionToDone,
    setupApi,
  };
}
export type SetupActions = ReturnType<typeof useSetupActions>;
