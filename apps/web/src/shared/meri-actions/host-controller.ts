import type { ActionAttemptJournal } from "./attempt-journal";
import type { ActionContext } from "./session-receipt";
import type { ActionSessionHints } from "./session-bootstrap";
import { OpaqueSessionController } from "./opaque-session-controller";
import { actionTransport } from "./workflow-transport";
import { GovernedActionWorkflow } from "./workflow-adapter";

type Options = {
  hints: ActionSessionHints;
  journal: (context: ActionContext) => ActionAttemptJournal;
  fetcher?: typeof fetch;
  now?: () => number;
};

/** Recommendation workflow composition over the shared opaque connection lifetime. */
export class ActionHostController extends OpaqueSessionController<GovernedActionWorkflow> {
  constructor(options: Options) {
    super({
      hints: options.hints,
      fetcher: options.fetcher,
      now: options.now,
      createPort: ({ session, signal, ...lifetime }) =>
        new GovernedActionWorkflow({
          session,
          transport: actionTransport(
            session.credential,
            signal,
            options.fetcher,
          ),
          journal: options.journal(session.context),
          ...lifetime,
        }),
    });
  }
}
