import type { AdmittedConversationView, ConversationEvent } from '@capiro/meri-contracts/conversation-application';
import type { UIEvent } from './types.js';
export interface ConversationObservationSnapshot {
    readonly after: number;
    readonly omittedPrefix: boolean;
    readonly hasMore: boolean;
    readonly events: readonly ConversationEvent[];
    readonly runState: AdmittedConversationView['run']['state'];
}
/** Display only. Cursor provenance and event admission belong to the public receiver. */
export declare class ConversationObservation {
    readonly view: AdmittedConversationView;
    private readonly changed;
    private cursor;
    private state;
    constructor(view: AdmittedConversationView, changed: () => void);
    get snapshot(): ConversationObservationSnapshot;
    reconnect(): Readonly<{
        method: "GET";
        path: string;
        headers: Readonly<{
            "x-meri-resume-sequence": string;
        }>;
    }>;
    accept(event: UIEvent): void;
}
