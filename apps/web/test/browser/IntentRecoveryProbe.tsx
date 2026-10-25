"use client";
import { useMemo, useState } from "react";
import { ConversationIntents } from "../../src/features/meri/conversation/intents/ConversationIntents";
import { createIntentsAccess } from "../../src/shared/meri-intents/access";
import context from "../../tests/fixtures/meri-intents/context.json";

/** Synthetic fixture: real decision component, receiver and encrypted browser storage. */
export function IntentRecoveryProbe() {
  const [session, setSession] = useState(0);
  const [actor, setActor] = useState(context.actorId);
  const access = useMemo(
    () =>
      createIntentsAccess(
        `action_session_${String(session).repeat(43)}`,
        new AbortController().signal,
      ),
    [session],
  );
  return (
    <>
      <h1>Synthetic intent recovery</h1>
      <button onClick={() => setSession((value) => value + 1)}>
        Replace session
      </button>
      <button
        onClick={() => {
          setActor("other");
          setSession((value) => value + 1);
        }}
      >
        Change actor
      </button>
      <ConversationIntents
        access={access}
        scope={{
          tenantId: context.tenantId,
          actorId: actor,
          conversationId: context.conversationId,
        }}
      />
    </>
  );
}
