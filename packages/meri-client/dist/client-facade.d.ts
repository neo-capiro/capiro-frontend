import { Chat } from '@ai-sdk/react';
import type { UseChatHelpers } from '@ai-sdk/react';
import { createMeriChat } from './guarded-transport.js';
import type { CreateMeriChatOptions, MeriChatHandle } from './guarded-transport.js';
import type { MeriUIMessage } from '@capiro/meri-ui-stream/protocol';
export { createMeriChat };
export type { CreateMeriChatOptions, MeriChatHandle };
export type { AuthorizedView } from './projection.js';
/** Facade over an externally managed chat; `resume` is disabled. */
export declare function useMeriChat(chat: Chat<MeriUIMessage>): UseChatHelpers<MeriUIMessage>;
/** Subscriber detach/dispose. Never issues a durable run cancellation. */
export declare function detachMeriView(handle: MeriChatHandle): Promise<void>;
