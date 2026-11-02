import { conversationApplicationMetadata as protocol, receiveConversationRequest, receiveConversationResponse, } from "@capiro/meri-contracts/conversation-application";
import { conversationInputMetadata, conversationInputView, receiveConversationInputRequest, receiveConversationInputResponse, } from "@capiro/meri-contracts/conversation-input";
import { conversationInitialInputMetadata, receiveConversationInitialInputRequest, receiveConversationInitialInputResponse, receiveAllocatedConversationInputResponse, } from "@capiro/meri-contracts/conversation-initial-input";
import { ConversationNetwork, ConversationUnavailable, DEFINITIVE_REFUSALS, EDGE_REFUSED, } from "./conversation-network.js";
import { ConversationObservation } from "./conversation-observation.js";
import { conversationChat } from "./conversation-chat.js";
import { stableStringify } from "./json-identity.js";
import { conversationLifecycleMetadata, receiveConversationLifecycleRequest, receiveConversationLifecycleResponse, } from "@capiro/meri-contracts/conversation-lifecycle";
export { ConversationUnavailable, DEFINITIVE_REFUSALS, EDGE_REFUSED };
/** Only the two documented detail fields travel with a refusal; nothing else from the body is retained. */
function refusal(status, error) {
    const detail = {};
    if (Array.isArray(error.sources) &&
        error.sources.length &&
        error.sources.every((source) => typeof source === "string" && source))
        detail.sources = Object.freeze([...error.sources]);
    if (error.requiredScope === "client" || error.requiredScope === "general")
        detail.requiredScope = error.requiredScope;
    return new ConversationUnavailable(error.code, status, Object.freeze(detail));
}
/**
 * An error answer the contract does not admit (a gateway page, an unexpected status/code pair)
 * keeps only its status, so a caller can still tell control not answering from a refusal. A 200
 * that fails admission stays the contract's own error.
 */
async function admitted(status, receive) {
    try {
        return await receive();
    }
    catch (cause) {
        if (status === 200)
            throw cause;
        throw new ConversationUnavailable("invalid-error-response", status);
    }
}
const EMPTY = Object.freeze({
    status: "idle",
    observation: null,
    submit: "idle",
    cancel: "idle",
    cancelReceipt: null,
    acceptedRequest: null,
});
const DISPOSED = Object.freeze({
    ...EMPTY,
    status: "disposed",
});
const HIDDEN = Object.freeze({
    ...EMPTY,
    status: "unavailable",
});
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value));
/** Display-only copy; mutable consumers must never gain a reference to private admitted facts. */
const requestSnapshot = (request) => {
    const copy = structuredClone(request);
    for (const value of Object.values(copy))
        if (value && typeof value === "object")
            Object.freeze(value);
    return Object.freeze(copy);
};
/** One server-selected run/context. No new turn or durable cancel is implied by observation. */
class ConversationConnection {
    network;
    context;
    state = EMPTY;
    view;
    observation;
    handle;
    intent;
    // Correlation only: this synthetic tail must never replace an observed transcript/cursor.
    inputReceipt;
    initialIntent;
    allocation;
    busy = false;
    disposed = false;
    listeners = new Set();
    constructor(options) {
        this.context = Object.freeze({ ...options.context });
        this.network = new ConversationNetwork(options, () => this.clear());
    }
    getSnapshot = () => {
        if (this.disposed)
            return DISPOSED;
        try {
            this.network.check();
            return this.state;
        }
        catch {
            return this.disposed ? DISPOSED : HIDDEN;
        }
    };
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    publish(patch) {
        if (this.disposed)
            return;
        this.state = Object.freeze({ ...this.state, ...patch });
        for (const listener of this.listeners)
            listener();
    }
    detach() {
        const handle = this.handle;
        handle?.transport.close();
        if (handle)
            void handle.chat
                .dispose()
                .catch(() => { })
                .finally(() => {
                handle.chat.messages = [];
                handle.chat.clearError();
            });
        this.handle = undefined;
    }
    clear() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.detach();
        this.view = undefined;
        this.observation = undefined;
        this.intent = undefined;
        this.inputReceipt = undefined;
        this.initialIntent = undefined;
        this.allocation = undefined;
        this.state = DISPOSED;
        for (const listener of this.listeners)
            listener();
    }
    dispose = () => this.network.dispose();
    start() {
        this.network.check();
        if (this.disposed || this.busy)
            throw new ConversationUnavailable("operation-unavailable");
        this.busy = true;
    }
    bind(view) {
        const binding = view.run.binding;
        for (const key of [
            "tenantId",
            "actorId",
            "conversationId",
            "runId",
        ]) {
            if (binding[key] !== this.context[key])
                throw new ConversationUnavailable("foreign-session-view");
        }
        const scopes = view.run.scopes;
        const selected = this.context.selectedClientId;
        const matches = selected === null
            ? scopes.length === 1 &&
                scopes[0]?.kind === "private-user" &&
                scopes[0].tenantId === this.context.tenantId &&
                scopes[0].resourceId === this.context.actorId
            : scopes.some((scope) => scope.tenantId === this.context.tenantId &&
                scope.kind === "client" &&
                scope.resourceId === selected);
        if (!matches)
            throw new ConversationUnavailable("foreign-client-view");
        if ("request" in view && this.intent) {
            const saved = view.request;
            const input = this.intent;
            if (saved.requestId !== input.requestId ||
                saved.prompt !== input.prompt ||
                stableStringify(saved.windowRequest) !==
                    stableStringify(input.windowRequest ?? null) ||
                stableStringify(saved.skill && {
                    skillId: saved.skill.skillId,
                    skillVersion: saved.skill.skillVersion,
                }) !== stableStringify(input.skill ?? null) ||
                (input.modelSelection !== undefined &&
                    stableStringify(saved.modelSelection) !==
                        stableStringify(input.modelSelection))) {
                throw new ConversationUnavailable("foreign-retained-request");
            }
        }
        this.detach();
        this.network.check();
        this.view = view;
        const observation = new ConversationObservation(view, () => {
            this.network.check();
            if (this.observation === observation)
                this.publish({ observation: observation.snapshot });
        }, "request" in view ? null : (this.intent?.prompt ?? null));
        this.observation = observation;
        this.publish({
            status: "ready",
            observation: observation.snapshot,
            ...("request" in view
                ? { acceptedRequest: requestSnapshot(view.request) }
                : {}),
        });
    }
    async receive(route, request, onDispatch) {
        const current = this.view;
        const response = await this.network.json(protocol.routes[route].path, bytes(request), onDispatch);
        const correlation = current ??
            (this.inputReceipt && conversationInputView(this.inputReceipt));
        const value = await admitted(response.status, () => receiveConversationResponse(route, response.status, response.bytes, request, correlation));
        this.network.check();
        if (this.disposed || this.view !== current)
            throw new ConversationUnavailable("superseded-response");
        if ("error" in value)
            throw refusal(response.status, value.error);
        return value;
    }
    retain(input, receive) {
        this.network.check();
        if (this.intent)
            throw new ConversationUnavailable("retained-submit-intent");
        const request = receive(bytes(input));
        this.start();
        this.intent = request;
        return request;
    }
    submit = async (input) => {
        this.retain(input, receiveConversationInputRequest);
        return this.sendRetained();
    };
    /** Original input only. A local identity is a proposal until the server's durable allocation. */
    submitInitial = async (input) => {
        if (this.view || this.inputReceipt)
            throw new ConversationUnavailable("initial-input-already-observed");
        this.initialIntent = this.retain(input, receiveConversationInitialInputRequest);
        return this.sendRetained();
    };
    retrySubmit = async () => {
        if (!this.intent || this.state.submit !== "unknown")
            throw new ConversationUnavailable("no-unknown-submit");
        this.start();
        return this.sendRetained(true);
    };
    inputContext() {
        return {
            tenantId: this.context.tenantId,
            actorId: this.context.actorId,
            conversationId: this.context.conversationId,
            runId: this.context.runId,
            clientId: this.context.selectedClientId,
        };
    }
    async allocateRetained(onDispatch) {
        const intent = this.initialIntent, previous = this.allocation, current = this.view;
        const response = await this.network.json(conversationInitialInputMetadata.routes.allocate.path, bytes(intent), onDispatch, conversationInitialInputMetadata.limits, "refuse");
        const value = await admitted(response.status, () => receiveConversationInitialInputResponse(response.status, response.bytes, intent, this.inputContext()));
        this.network.check();
        if (this.disposed ||
            this.initialIntent !== intent ||
            this.allocation !== previous ||
            this.view !== current) {
            throw new ConversationUnavailable("superseded-allocation-receipt");
        }
        if ("error" in value)
            throw refusal(response.status, value.error);
        if (previous &&
            stableStringify(previous.allocation) !== stableStringify(value.allocation)) {
            throw new ConversationUnavailable("INITIAL_INPUT_RECEIPT_DRIFT");
        }
        this.allocation = value;
    }
    async admitRetained(onDispatch) {
        const current = this.view, previous = this.inputReceipt, intent = this.intent;
        const initial = this.initialIntent, allocation = this.allocation;
        if (initial && !allocation)
            throw new ConversationUnavailable("no-initial-input-allocation");
        const response = await this.network.json(conversationInputMetadata.routes.admit.path, bytes(intent), onDispatch, undefined, "refuse");
        const value = await admitted(response.status, () => initial
            ? receiveAllocatedConversationInputResponse(response.status, response.bytes, initial, this.inputContext(), allocation)
            : receiveConversationInputResponse(response.status, response.bytes, intent, this.inputContext(), current ?? previous));
        this.network.check();
        if (this.disposed ||
            this.view !== current ||
            this.inputReceipt !== previous ||
            this.allocation !== allocation)
            throw new ConversationUnavailable("superseded-input-receipt");
        if ("error" in value)
            throw refusal(response.status, value.error);
        this.inputReceipt = value;
        this.publish({ acceptedRequest: requestSnapshot(value.request) });
    }
    async sendRetained(previouslyUnknown = false) {
        const intent = this.intent;
        let dispatched = false;
        this.publish({ submit: "pending" });
        try {
            if (this.initialIntent)
                await this.allocateRetained(() => {
                    dispatched = true;
                });
            await this.admitRetained(() => {
                dispatched = true;
            });
            const view = await this.receive("submit", intent, () => {
                dispatched = true;
            });
            // An ACK carries no historical events. Preserve any already observed prefix and cursor.
            if (this.observation &&
                this.state.status === "ready" &&
                this.state.observation === this.observation.snapshot)
                this.view = view;
            else
                this.bind(view);
            this.publish({ submit: "observed" });
            return this.getSnapshot();
        }
        catch (error) {
            // A definitive refusal is control's own answer that nothing was dispatched: the retained
            // request is released so a changed one can follow, exactly as if it had never left.
            const refused = error instanceof ConversationUnavailable && error.definitive;
            if (refused || (!dispatched && !previouslyUnknown)) {
                this.intent = undefined;
                this.initialIntent = undefined;
                this.allocation = undefined;
            }
            this.publish({
                submit: !refused && (dispatched || previouslyUnknown) ? "unknown" : "idle",
            });
            throw error;
        }
        finally {
            this.busy = false;
        }
    }
    history = async (input = {}) => {
        const request = receiveConversationRequest("history", bytes(input));
        this.start();
        this.detach();
        this.publish({
            status: "loading",
            observation: null,
            acceptedRequest: null,
        });
        try {
            const view = await this.receive("history", request);
            this.bind(view);
            return this.getSnapshot();
        }
        catch (error) {
            this.publish({
                status: "unavailable",
                observation: null,
                acceptedRequest: null,
            });
            throw error;
        }
        finally {
            this.busy = false;
        }
    };
    cancel = async () => {
        if (!this.view)
            throw new ConversationUnavailable("no-admitted-run");
        const request = receiveConversationRequest("cancel", bytes({}));
        this.start();
        let dispatched = false;
        const previouslyUnknown = this.state.cancel === "unknown";
        this.publish({ cancel: "pending", cancelReceipt: null });
        try {
            const receipt = await this.receive("cancel", request, () => {
                dispatched = true;
            });
            this.publish({ cancel: "observed", cancelReceipt: receipt });
            return receipt;
        }
        catch (error) {
            this.publish({
                cancel: dispatched || previouslyUnknown ? "unknown" : "idle",
            });
            throw error;
        }
        finally {
            this.busy = false;
        }
    };
    /** The same private admitted view validates lifecycle receipts; callers cannot inject one. */
    async lifecycle(route, input) {
        const current = this.view;
        if (!current || this.state.status !== "ready")
            throw new ConversationUnavailable("no-admitted-run");
        const request = receiveConversationLifecycleRequest(route, bytes(input));
        this.start();
        this.publish({ status: "loading" });
        try {
            const response = await this.network.json(conversationLifecycleMetadata.routes[route].path, bytes(request));
            const receipt = await receiveConversationLifecycleResponse(route, response.status, response.bytes, request, current);
            this.network.check();
            if (this.disposed || this.view !== current)
                throw new ConversationUnavailable("superseded-response");
            return receipt;
        }
        finally {
            this.busy = false;
            this.publish({ status: "ready" });
        }
    }
    control = (input) => this.lifecycle("control", input);
    inspectCheckpoint = (input) => this.lifecycle("inspect", input);
    openChat = () => {
        this.network.check();
        const observation = this.observation;
        if (this.busy || this.state.status !== "ready" || !observation)
            throw new ConversationUnavailable("no-current-observation");
        if (!this.handle || this.handle.transport.isClosed) {
            this.handle = conversationChat(this.network, observation, () => !this.disposed &&
                this.observation === observation &&
                this.state.status === "ready");
        }
        return this.handle;
    };
}
/** Public handle deliberately exposes no credential, branded view or cursor injection. */
export function createMeriConversation(options) {
    const connection = new ConversationConnection(options);
    return Object.freeze({
        getSnapshot: connection.getSnapshot,
        subscribe: connection.subscribe,
        submit: connection.submit,
        submitInitial: connection.submitInitial,
        retrySubmit: connection.retrySubmit,
        history: connection.history,
        cancel: connection.cancel,
        control: connection.control,
        inspectCheckpoint: connection.inspectCheckpoint,
        openChat: connection.openChat,
        dispose: connection.dispose,
    });
}
/** Clarifying questions: pending projection from the run's durable events, answer mapping and the answer control. */
export { pendingQuestion, questionOutcome, questionAnswers, answerControl, } from "./conversation-questions.js";
