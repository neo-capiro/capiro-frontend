import { useState } from "react";
import { ConversationIntents } from "../../src/features/meri/conversation/intents/ConversationIntents";
import { createIntentsAccess } from "../../src/shared/meri-intents/access";

export function MeriSharingFixture() {
  const [conversationId, setConversationId] = useState(
    "00000000-0000-4000-8000-000000000001",
  );
  const [access] = useState(() =>
    createIntentsAccess("synthetic-session", new AbortController().signal),
  );
  return (
    <>
      <button
        onClick={() =>
          setConversationId("00000000-0000-4000-8000-000000000009")
        }
      >
        Switch synthetic conversation
      </button>
      <ConversationIntents
        access={access}
        scope={{ tenantId: "tenant", actorId: "actor", conversationId }}
      />
    </>
  );
}
