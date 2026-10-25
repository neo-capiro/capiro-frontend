import type { ActionAttemptJournal } from "./attempt-journal";
import type { ActionContext, ActionSessionReceipt } from "./session-receipt";
import type { ActionSessionHints } from "./session-bootstrap";
import { SessionLifetimeController } from "./opaque-session-controller";
import { bootstrapActionSession } from "./session-bootstrap";
import { actionTransport } from "./workflow-transport";
import { GovernedActionWorkflow } from "./workflow-adapter";

type Options = {
  hints: ActionSessionHints;
  journal: (context: ActionContext) => ActionAttemptJournal;
  fetcher?: typeof fetch;
  now?: () => number;
  issue?: (signal: AbortSignal) => Promise<ActionSessionReceipt>;
};

/** Recommendation workflow composition over the shared opaque connection lifetime. */
export class ActionHostController extends SessionLifetimeController<
  GovernedActionWorkflow,
  ActionSessionReceipt
> {
  constructor(options: Options) {
    super({
      issue:
        options.issue ??
        ((signal) =>
          bootstrapActionSession(
            options.hints,
            signal,
            options.fetcher,
            options.now,
          )),
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
