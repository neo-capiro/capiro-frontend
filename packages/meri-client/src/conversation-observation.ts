import {
  createConversationCursor, receiveConversationEvent, conversationReconnect,
} from '@capiro/meri-contracts/conversation-application';
import type {
  AdmittedConversationView, ConversationCursor, ConversationEvent,
} from '@capiro/meri-contracts/conversation-application';
import type { UIEvent } from './types.js';

export interface ConversationObservationSnapshot {
  readonly after: number;
  readonly omittedPrefix: boolean;
  readonly hasMore: boolean;
  readonly events: readonly ConversationEvent[];
  readonly runState: AdmittedConversationView['run']['state'];
  /** The admitted request text for this run: stored history request, or the exact submitted input. */
  readonly prompt: string | null;
}

/** Display only. Cursor provenance and event admission belong to the public receiver. */
export class ConversationObservation {
  private cursor: ConversationCursor;
  private state: ConversationObservationSnapshot;
  constructor(readonly view: AdmittedConversationView, private readonly changed: () => void, prompt: string | null = null) {
    this.cursor = createConversationCursor(view);
    const history = 'events' in view;
    const events = history ? view.events : [];
    this.state = Object.freeze({
      after: this.cursor.after,
      omittedPrefix: history && (events[0]?.sequence ?? view.nextSequence + 1) > 1,
      hasMore: this.cursor.after < view.lastSequence,
      events: Object.freeze([...events]),
      runState: view.run.state,
      prompt: history ? view.request.prompt : prompt,
    });
  }
  get snapshot() { return this.state; }
  reconnect() { return conversationReconnect(this.cursor); }
  accept(event: UIEvent) {
    const admitted = receiveConversationEvent(new TextEncoder().encode(JSON.stringify(event)), this.cursor);
    const events = [...this.state.events, admitted.event];
    const truncated = events.length > 1000;
    this.cursor = admitted.cursor;
    this.state = Object.freeze({
      after: this.cursor.after,
      omittedPrefix: this.state.omittedPrefix || truncated,
      hasMore: this.cursor.after < this.view.lastSequence,
      events: Object.freeze(truncated ? events.slice(-1000) : events),
      runState: admitted.event.type === 'run.status' ? admitted.event.data.state : this.state.runState,
      prompt: this.state.prompt,
    });
    this.changed();
  }
}
