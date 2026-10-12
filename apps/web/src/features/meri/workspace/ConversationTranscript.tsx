'use client';

import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@capiro/ui/conversation';
import { Message, MessageContent } from '@capiro/ui/message';
import type { WorkspaceView } from './workspace-view';
import styles from './workspace.module.css';

export function ConversationTranscript({ messages }: Pick<WorkspaceView, 'messages'>) {
  return <section aria-labelledby="sample-transcript-title" className={styles.transcriptPanel}>
    <h2 id="sample-transcript-title">Sample conversation</h2>
    <Conversation className={styles.log} aria-label="Sample Meri conversation" aria-live="polite" aria-relevant="additions text" initial="instant" resize="instant">
      <ConversationContent className={styles.messages} scrollClassName={styles.scroll} tabIndex={0} aria-label="Sample message history">
        {messages.length === 0 ? <ConversationEmptyState title="No sample response yet" description="Choose a sample state or apply the next sample event." className={styles.empty} /> : messages.map(message => <Message key={message.messageId} from="assistant" className={styles.message}><MessageContent className={styles.messageContent}><p className={styles.identity}>Meri · Sample response</p><p className={styles.response}>{message.text}</p></MessageContent></Message>)}
      </ConversationContent>
      <ConversationScrollButton className={styles.scrollButton} aria-label="Scroll to latest sample message" />
    </Conversation>
  </section>;
}
