import { ProductShell } from "../../../shared/shell/ProductShell";
import { RequireSession } from "../../../shared/session/SessionContext";
import { readConversationConfig } from "../../../shared/meri-conversations/config";
import { MeriRunsHost } from "../../../features/meri/runs/MeriRunsHost";

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const config = readConversationConfig(process.env);
  const params = await searchParams;
  const selection =
    typeof params.conversationId === "string" &&
    typeof params.runId === "string"
      ? { conversationId: params.conversationId, runId: params.runId }
      : undefined;
  return (
    <ProductShell
      section="runs"
      conversationEnabled={config.enabled}
      firstChatBootstrapEnabled={config.firstChatBootstrapEnabled}
    >
      <RequireSession>
        <MeriRunsHost enabled={config.enabled} selection={selection} />
      </RequireSession>
    </ProductShell>
  );
}
