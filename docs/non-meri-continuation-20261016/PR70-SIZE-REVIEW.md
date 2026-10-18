# PR70 conversation host size review

The PR70 image qualification stopped at the architecture gate on `MeriConversationHost` in `apps/web/src/features/meri/conversation/MeriConversationHost.tsx`. The function has 84 nonblank lines; its exact fingerprint is `6056bf65ed132090737b083f9892a902004af27b369ff142e6a56aa82fcf4efc`. This review covers that source only. The existing PR60 review of `CoreResolvedConversation` remains separate.

`MeriConversationHost` is a presentation and selection boundary. It checks whether conversations are enabled, rejects an invalid URL selector, requires a verified account and current selected client, refuses an archived client, and checks the configured preview client. It then mounts either the Core resolution child for New Chat or the existing-conversation child. The refusal order keeps both paths closed before Core creation or Meri session issuance.

It does not make a Core request, validate a receipt, handle a bearer, persist a chat intent, or issue a Meri session. `CoreResolvedConversation`, the shared first-chat resolver, and `useConversationSession` own those lifetimes. The additional lines are explicit unavailable-state presentation within one boundary. Extracting those guards or messages solely to fall below 80 lines would obscure the order without creating a cohesive new owner.

`apps/web/tests/meri-first-chat-host.test.ts` covers current and explicit conversation selection, configured-client refusal, and archived-client refusal before either downstream call. The architecture record in `scripts/architecture/reviewed-size-findings.json` binds this conclusion to the exact function fingerprint. Any source change requires a fresh review. This review does not lower the threshold or waive dependency, cycle, or other architecture errors.
