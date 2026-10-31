"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { requireMeriTabStorage } from "../../../shared/meri-conversations/tab-journal";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import {
  receiveResearchConversation,
  researchLaunchOwner,
} from "./research-launch";
import { useConversationSession } from "./useConversationSession";
import { ConversationView } from "./ConversationView";
import type { ResearchSelection } from "../../../shared/meri-conversations/research-context";

export function ResearchConversationHost(props: {
  account: ConversationAccount;
  conversationId?: string;
  portfolioId?: string;
  canCreate: boolean;
}) {
  return props.conversationId ? (
    <ReadResearchConversation
      {...props}
      conversationId={props.conversationId}
    />
  ) : props.portfolioId && props.canCreate ? (
    <CreateResearchConversation
      account={props.account}
      portfolioId={props.portfolioId}
    />
  ) : (
    <p role="alert">Research conversation creation is unavailable.</p>
  );
}

function ReadResearchConversation({
  account,
  conversationId,
  portfolioId,
}: {
  account: ConversationAccount;
  conversationId: string;
  portfolioId?: string;
}) {
  const query = useCapiroQuery("meri.research.conversation.read", {
    params: { id: conversationId },
  });
  let research: ResearchSelection | undefined;
  if (!query.loading && !query.error && query.data) {
    try {
      research = receiveResearchConversation(query.data, account, {
        conversationId,
        portfolioId,
      });
    } catch {
      /* Never fall through to General or another selected client. */
    }
  }
  if (query.loading)
    return <p role="status">Confirming Research conversation…</p>;
  if (!research)
    return (
      <section role="alert">
        <p>This Research conversation could not be verified.</p>
        <button onClick={query.reload}>Retry conversation</button>
      </section>
    );
  return (
    <ConnectedResearchConversation
      key={JSON.stringify(research)}
      account={account}
      research={research}
    />
  );
}

function ConnectedResearchConversation({
  account,
  research,
}: {
  account: ConversationAccount;
  research: ResearchSelection;
}) {
  const session = useConversationSession(
    account,
    null,
    research.conversationId,
    research,
  );
  return (
    <ConversationView
      session={session}
      scope={`Research · ${research.scope.researchPortfolioName}`}
    />
  );
}

function useResearchLaunch({
  account,
  portfolioId,
}: {
  account: ConversationAccount;
  portfolioId: string;
}) {
  const api = useCapiro(),
    router = useRouter();
  const [owner] = useState(() => {
    try {
      const storage = requireMeriTabStorage();
      return storage
        ? researchLaunchOwner(account, portfolioId, storage)
        : undefined;
    } catch {
      return undefined;
    }
  });
  const [state, setState] = useState(() => {
    try {
      return owner ? (owner.read()?.state ?? "new") : "unavailable";
    } catch {
      return "unavailable";
    }
  });
  const sending = useRef(false),
    lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  function open(conversationId: string) {
    router.replace(
      conversationHref(
        { scopeKind: "research_portfolio", clientId: null },
        conversationId,
      ),
    );
  }
  async function create() {
    if (!owner || sending.current || !lifetime.current || state !== "new")
      return;
    sending.current = true;
    setState("unknown");
    const signal = lifetime.current.signal;
    try {
      const result = await owner.create(
        () =>
          api.request(
            "meri.research.conversation.create",
            { body: { researchPortfolioId: portfolioId } },
            { signal },
          ),
        signal,
      );
      if (!signal.aborted) {
        setState("created");
        open(result.conversationId);
      }
    } catch {
      if (!signal.aborted) setState("unknown");
    } finally {
      sending.current = false;
    }
  }
  return { owner, state, open, create };
}

function CreateResearchConversation({
  account,
  portfolioId,
}: {
  account: ConversationAccount;
  portfolioId: string;
}) {
  const { owner, state, open, create } = useResearchLaunch({
    account,
    portfolioId,
  });
  return (
    <section aria-label="Research conversation">
      <h2>Ask Meri about this Research Portfolio</h2>
      {state === "new" ? (
        <button onClick={() => void create()}>
          Start Research conversation
        </button>
      ) : state === "created" ? (
        <button
          onClick={() => {
            const saved = owner?.read();
            if (saved?.state === "created") open(saved.conversationId);
          }}
        >
          Open Research conversation
        </button>
      ) : (
        <p role="status">
          {state === "unavailable"
            ? "This tab cannot safely retain the conversation."
            : "Creation has not been confirmed here. Check conversation history before starting another chat."}
        </p>
      )}
      <Link href="/meri/conversations">Conversation history</Link>
    </section>
  );
}
