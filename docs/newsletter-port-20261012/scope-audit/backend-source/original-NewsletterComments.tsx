import { useEffect, useRef, useState } from 'react';
import type { NewsletterComment } from '@capiro/shared/newsletter';
import {
  newsletterError,
  type NewsletterClient,
  type NewsletterReviewers,
  type NewsletterAccountInvitation,
} from './api.js';
import { Modal, SelectField, Tabs, TextField } from './controls.js';
import { NewsletterThreadNotifications } from './NewsletterThreadNotifications.js';

export function NewsletterComments({
  api,
  documentId,
  blockId,
  onClose,
  onAnchor,
  beforeComment,
}: {
  api: NewsletterClient;
  documentId: string;
  blockId?: string;
  onClose?: () => void;
  onAnchor?: (id: string) => void;
  beforeComment?: () => Promise<unknown>;
}) {
  const [comments, setComments] = useState<NewsletterComment[]>([]);
  const [team, setTeam] = useState<NewsletterReviewers | null>(null);
  const [tab, setTab] = useState('Open');
  const [message, setMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const [parent, setParent] = useState<string | undefined>();
  const [modal, setModal] = useState<'invite' | 'notifications' | 'thread' | null>(null);
  const [notificationTarget, setNotificationTarget] = useState<{ rootId?: string; draft: boolean }>(
    { draft: true },
  );
  const [draftUserIds, setDraftUserIds] = useState<string[] | undefined>();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');
  const [accountRole, setAccountRole] = useState<'member' | 'admin'>('member');
  const [accountInvitations, setAccountInvitations] = useState<
    Record<string, NewsletterAccountInvitation>
  >({});
  const inviteRequest = useRef<{ key: string; signature: string } | null>(null);
  const [role, setRole] = useState('commenter');
  const [mode, setMode] = useState('mentions');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [readError, setReadError] = useState('');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const composer = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const writeGeneration = useRef(0);
  const writing = useRef(false);
  const wasComposing = useRef(false);
  useEffect(() => {
    let active = true;
    let latestRead = 0;
    const refresh = async () => {
      if (writing.current) return;
      const read = ++latestRead;
      const generation = writeGeneration.current;
      try {
        const [next, reviewers] = await Promise.all([
          api.comments(documentId),
          api.reviewers(documentId),
        ]);
        if (
          active &&
          read === latestRead &&
          generation === writeGeneration.current &&
          !writing.current
        ) {
          setComments(next);
          setTeam(reviewers);
          setReadError('');
        }
      } catch (error) {
        if (
          active &&
          read === latestRead &&
          generation === writeGeneration.current &&
          !writing.current
        )
          setReadError(newsletterError(error));
      } finally {
        if (active && read === latestRead) setLoading(false);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, documentId, reload]);
  useEffect(() => {
    if (composing) composer.current?.querySelector('textarea')?.focus();
    else if (wasComposing.current) addButton.current?.focus();
    wasComposing.current = composing;
  }, [composing, parent]);
  const run = async (action: () => Promise<unknown>) => {
    if (writing.current) return;
    writing.current = true;
    writeGeneration.current++;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(newsletterError(error));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };
  const canComment = !!team && team.role !== 'viewer';
  const currentMember = team?.items.find((item) => item.userId === team.currentUserId);
  const editNotifications = () => {
    setMode(currentMember?.notifications || 'mentions');
    setModal('notifications');
  };
  const roots = comments.filter(
    (comment) => !comment.parentId && comment.resolved === (tab === 'Resolved'),
  );
  return (
    <aside className="nl-comments">
      <div className="nl-panel-head">
        <h2>Comments</h2>
        {onClose && (
          <button aria-label="Close comments" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      {team?.role === 'owner' && <button onClick={() => setModal('invite')}>Invite</button>}
      {team && (
        <button disabled={busy} onClick={editNotifications}>
          In-app notifications
        </button>
      )}
      <Tabs value={tab} values={['Open', 'Resolved']} onChange={setTab} disabled={busy} />
      {error && <p role="alert">{error}</p>}
      {readError && (
        <p role="alert">
          {readError}{' '}
          <button onClick={() => setReload((value) => value + 1)}>Refresh comments</button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading comments…</p>
      ) : (
        !roots.length &&
        !composing && (
          <p className="nl-muted">{tab === 'Open' ? 'No comments yet' : 'No resolved comments'}</p>
        )
      )}
      {roots.map((root) => (
        <article key={root.id}>
          {[root, ...comments.filter((comment) => comment.parentId === root.id)].map((comment) => (
            <div className={comment.parentId ? 'nl-comment-reply' : ''} key={comment.id}>
              <strong>{comment.authorName}</strong>
              <time>{new Date(comment.createdAt).toLocaleString()}</time>
              <p>{comment.message}</p>
            </div>
          ))}
          {root.blockId && onAnchor && (
            <button onClick={() => onAnchor(root.blockId!)}>View block</button>
          )}
          {canComment && (
            <>
              <button
                disabled={busy}
                onClick={() => {
                  setParent(root.id);
                  setDraftUserIds(undefined);
                  setMessage('');
                  setError('');
                  setComposing(true);
                }}
              >
                Reply
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setNotificationTarget({ rootId: root.id, draft: false });
                  setModal('thread');
                }}
              >
                Email notifications
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    setComments(await api.resolve(documentId, root.id, !root.resolved)),
                  )
                }
              >
                {root.resolved ? 'Reopen' : 'Resolve'}
              </button>
            </>
          )}
        </article>
      ))}
      {canComment && !composing && tab === 'Open' && (
        <button
          ref={addButton}
          disabled={busy}
          onClick={() => {
            setError('');
            setParent(undefined);
            setDraftUserIds(undefined);
            setMessage('');
            setComposing(true);
          }}
        >
          Add comment
        </button>
      )}
      {canComment && composing && (
        <div className="nl-comment-composer" ref={composer}>
          <div className="nl-comment-author">
            <span className="nl-comment-avatar" aria-hidden="true">
              {(currentMember?.name || 'Team member')
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')}
            </span>
            <strong>{currentMember?.name || 'Team member'}</strong>
          </div>
          {parent && (
            <p>
              Replying to a thread{' '}
              <button
                disabled={busy}
                onClick={() => {
                  setParent(undefined);
                  setDraftUserIds(undefined);
                  setMessage('');
                  setComposing(false);
                }}
              >
                Cancel reply
              </button>
            </p>
          )}
          <TextField
            label="Message"
            multiline
            value={message}
            onChange={setMessage}
            disabled={busy}
            placeholder="Add a comment"
          />
          {message.includes('@') && (
            <div className="nl-mention-list">
              {team?.items
                .filter((item) =>
                  item.name.toLowerCase().includes(message.split('@').pop()!.toLowerCase()),
                )
                .map((item) => (
                  <button
                    key={item.userId}
                    disabled={busy}
                    onClick={() =>
                      setMessage(message.slice(0, message.lastIndexOf('@')) + `@${item.name} `)
                    }
                  >
                    @{item.name}
                  </button>
                ))}
            </div>
          )}
          <p className="nl-muted">
            {blockId ? 'Comment on the selected block.' : 'Comment on the newsletter.'}
          </p>
          <button
            className="nl-primary"
            disabled={!message.trim() || busy}
            onClick={() =>
              void run(async () => {
                await beforeComment?.();
                setComments(
                  await (draftUserIds === undefined
                    ? api.comment(documentId, message, parent ? undefined : blockId, parent)
                    : api.comment(
                        documentId,
                        message,
                        parent ? undefined : blockId,
                        parent,
                        draftUserIds,
                      )),
                );
                setMessage('');
                setParent(undefined);
                setDraftUserIds(undefined);
                setComposing(false);
              })
            }
          >
            Comment
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setMessage('');
              setParent(undefined);
              setDraftUserIds(undefined);
              setError('');
              setComposing(false);
            }}
          >
            Cancel
          </button>
          <button
            className="nl-comment-notifications"
            disabled={busy}
            onClick={() => {
              setNotificationTarget({ rootId: parent, draft: !parent });
              setModal('thread');
            }}
          >
            Edit notifications
          </button>
        </div>
      )}
      {modal === 'thread' && team && (
        <NewsletterThreadNotifications
          key={`${documentId}:${notificationTarget.rootId || 'new'}`}
          api={api}
          documentId={documentId}
          rootId={notificationTarget.rootId}
          currentUserId={team.currentUserId}
          draftUserIds={notificationTarget.draft ? draftUserIds : undefined}
          onClose={() => setModal(null)}
          onSaved={(ids) => {
            if (notificationTarget.draft) setDraftUserIds(ids);
            setModal(null);
          }}
        />
      )}
      {modal === 'invite' && (
        <Modal
          title="Invite your team"
          onClose={() => {
            if (!writing.current) {
              setModal(null);
              setInviteEmail('');
              setInviteMessage('');
              setAccountRole('member');
              inviteRequest.current = null;
            }
          }}
        >
          <div className="nl-modal-body nl-invite-form">
            <TextField
              label="Email address"
              type="email"
              value={inviteEmail}
              disabled={busy}
              placeholder="Ex: policy@example.com"
              onChange={setInviteEmail}
            />
            <SelectField
              label="Access level"
              disabled={busy}
              value={role}
              values={[
                ['editor', 'Author — Can edit, preview and comment'],
                ['commenter', 'Can preview and comment'],
                ['viewer', 'Can preview'],
              ]}
              onChange={setRole}
            />
            <TextField
              label="A message from you (optional)"
              multiline
              value={inviteMessage}
              disabled={busy}
              placeholder="Hi. Join me in reviewing this client newsletter."
              onChange={setInviteMessage}
            />
            {team?.canInviteAccounts && (
              <>
                <SelectField
                  label="Firm account role"
                  value={accountRole}
                  disabled={busy}
                  values={[
                    ['member', 'Member'],
                    ['admin', 'Admin'],
                  ]}
                  onChange={(value) => setAccountRole(value as 'member' | 'admin')}
                />
                <p>
                  {accountRole === 'admin'
                    ? 'Admin grants firm-wide user administration. This is separate from access to this newsletter.'
                    : 'New members receive a firm-joining invitation. Existing firm roles are preserved.'}
                </p>
              </>
            )}
            <p>
              {team?.canInviteAccounts
                ? 'Invite someone to join your firm and work on this newsletter. New members receive a firm-joining email, then the newsletter invitation with your personal message after joining and gaining client access.'
                : 'Invite a firm member to work on this newsletter. People outside your firm must join through Manage users first.'}{' '}
              Newsletter requests are saved for 30 days. Client access restrictions apply.
            </p>
            <h4>Who has access</h4>
            {team?.items.map((item) => (
              <p key={item.userId}>
                {item.name} ·{' '}
                {{ owner: 'Owner', editor: 'Author', commenter: 'Can comment', viewer: 'Viewer' }[
                  item.role
                ] || item.role}
                {item.role !== 'owner' && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () =>
                        setTeam(await api.removeReviewer(documentId, item.userId)),
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </p>
            ))}
            {!!team?.pending?.length && (
              <>
                <h4>Pending newsletter access</h4>
                {team.pending.map((item) => (
                  <div key={item.id}>
                    <p>
                      {item.email} · Waiting for firm membership and client access
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(async () =>
                            setTeam(await api.cancelInvitation(documentId, item.id)),
                          )
                        }
                      >
                        Cancel invitation
                      </button>
                    </p>
                    {item.accountRole === 'admin' && <p>Requested firm account role: Admin</p>}
                    {accountInvitations[item.id] && (
                      <p role="status">{accountInvitations[item.id]!.message}</p>
                    )}
                    {team?.canInviteAccounts && (
                      <div className="nl-flex">
                        {(!accountInvitations[item.id] ||
                          accountInvitations[item.id]!.canRetry) && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const result = await api.dispatchAccountInvitation(item.id);
                                setAccountInvitations((previous) => ({
                                  ...previous,
                                  [item.id]: result,
                                }));
                                setTeam(await api.reviewers(documentId));
                              })
                            }
                          >
                            Send firm invitation
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const result = await api.accountInvitationStatus(item.id);
                              setAccountInvitations((previous) => ({
                                ...previous,
                                [item.id]: result,
                              }));
                              setTeam(await api.reviewers(documentId));
                            })
                          }
                        >
                          Check firm invitation
                        </button>
                      </div>
                    )}
                    {item.message && <blockquote>{item.message}</blockquote>}
                  </div>
                ))}
              </>
            )}
            {!!team?.pending?.length && (
              <p>
                Cancelling newsletter access retains firm invitations and firm membership. Manage
                users controls firm access.
              </p>
            )}
            <a href="/settings/team">Manage users</a>
          </div>
          <footer>
            <button
              disabled={busy}
              onClick={() => {
                setModal(null);
                setInviteEmail('');
                setInviteMessage('');
                setAccountRole('member');
                inviteRequest.current = null;
              }}
            >
              Cancel
            </button>
            <button
              className="nl-primary"
              disabled={
                !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(inviteEmail.trim()) ||
                inviteMessage.length > 2000 ||
                busy
              }
              onClick={() =>
                void run(async () => {
                  const email = inviteEmail.trim().toLowerCase(),
                    message = inviteMessage.trim();
                  const signature = JSON.stringify([documentId, email, role, message, accountRole]);
                  if (inviteRequest.current?.signature !== signature)
                    inviteRequest.current = { key: crypto.randomUUID(), signature };
                  const result = await api.inviteByEmail(documentId, {
                    email,
                    role,
                    message,
                    requestKey: inviteRequest.current.key,
                    ...(team?.canInviteAccounts ? { accountRole } : {}),
                  });
                  setTeam(result);
                  let account: NewsletterAccountInvitation | undefined;
                  if (result.invitation.status === 'pending' && team?.canInviteAccounts) {
                    try {
                      account = await api.dispatchAccountInvitation(result.invitation.id);
                      setAccountInvitations((previous) => ({
                        ...previous,
                        [account!.id]: account!,
                      }));
                      setTeam(await api.reviewers(documentId));
                    } catch (error) {
                      setInviteNotice(
                        `Newsletter request saved. ${newsletterError(error)} Use Check firm invitation before sending another request.`,
                      );
                      throw error;
                    }
                  }
                  setInviteNotice(
                    account
                      ? account.message
                      : result.invitation.status === 'pending'
                        ? 'Newsletter request saved. Add this person to your firm in Manage users; access activates after they join and have client access.'
                        : result.invitation.status === 'cancelled'
                          ? 'This invitation was cancelled. Its request was not sent again.'
                          : result.invitationEmailAvailable
                            ? 'Access saved. Invitation email queued.'
                            : 'Access saved. Invitation email delivery is currently unavailable.',
                  );
                  setInviteEmail('');
                  setInviteMessage('');
                  setAccountRole('member');
                  inviteRequest.current = null;
                  setModal(null);
                })
              }
            >
              Invite
            </button>
          </footer>
        </Modal>
      )}
      {inviteNotice && <p role="status">{inviteNotice}</p>}
      {modal === 'notifications' && (
        <Modal title="Comment notifications" onClose={() => setModal(null)}>
          <div className="nl-modal-body">
            <p>Notifications appear in your Capiro notification bell.</p>
            <SelectField
              label="Notify me about"
              value={mode}
              values={[
                ['all', 'All comments'],
                ['mentions', 'Mentions and replies'],
                ['none', 'No comments'],
              ]}
              onChange={setMode}
            />
          </div>
          <footer>
            <button onClick={() => setModal(null)}>Cancel</button>
            <button
              className="nl-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setTeam(await api.reviewNotifications(documentId, mode));
                  setModal(null);
                })
              }
            >
              Save
            </button>
          </footer>
        </Modal>
      )}
    </aside>
  );
}
