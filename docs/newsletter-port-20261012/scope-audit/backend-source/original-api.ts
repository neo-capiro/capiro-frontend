import { useMemo } from 'react';
import type { AxiosInstance } from 'axios';
import { useApi } from '../../../../lib/use-api.js';
import type {
  NewsletterCampaign,
  NewsletterCapabilities,
  NewsletterComment,
  NewsletterLibraryItem,
  NewsletterStage,
  NewsletterCheck,
  NewsletterBrandKit,
  NewsletterFont,
  NewsletterSavedSurvey,
  NewsletterSurveyDefinition,
} from '@capiro/shared/newsletter';
export const NEWSLETTER_BASE = '/workspace-api/newsletters';
export function createNewsletterClient(api: AxiosInstance) {
  const d = (id: string) => `${NEWSLETTER_BASE}/documents/${encodeURIComponent(id)}`;
  return {
    brandKit: async () => (await api.get<NewsletterBrandKit>(`${NEWSLETTER_BASE}/brand-kit`)).data,
    saveBrandKit: async (kit: NewsletterBrandKit) =>
      (await api.patch<NewsletterBrandKit>(`${NEWSLETTER_BASE}/brand-kit`, kit)).data,
    uploadFont: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post<NewsletterFont>(`${NEWSLETTER_BASE}/brand-kit/fonts`, form)).data;
    },
    list: async () =>
      (await api.get<{ items: NewsletterCampaign[] }>(`${NEWSLETTER_BASE}/documents`)).data.items,
    create: async (templateId?: string) =>
      (await api.post<NewsletterCampaign>(`${NEWSLETTER_BASE}/documents`, { templateId })).data,
    get: async (id: string) => (await api.get<NewsletterCampaign>(d(id))).data,
    save: async (document: NewsletterCampaign) =>
      (
        await api.patch<NewsletterCampaign>(d(document.id), {
          revision: document.revision,
          name: document.name,
          config: document.config,
          design: document.design,
        })
      ).data,
    stage: async (id: string, revision: number) =>
      (await api.post<NewsletterStage>(`${d(id)}/stage`, { revision })).data,
    surveys: async (id: string) =>
      (await api.get<{ items: NewsletterSavedSurvey[] }>(`${d(id)}/surveys`)).data.items,
    saveSurvey: async (
      id: string,
      input: {
        name: string;
        definition: NewsletterSurveyDefinition;
        id?: string;
        revision?: number;
      },
    ) => (await api.post<NewsletterSavedSurvey>(`${d(id)}/surveys`, input)).data,
    preview: async (id: string, liveMergeTags = false) =>
      (
        await api.post<{ html: string; plainText: string; checks: NewsletterCheck[] }>(
          `${d(id)}/preview`,
          { liveMergeTags },
        )
      ).data,
    capabilities: async () =>
      (await api.get<NewsletterCapabilities>(`${NEWSLETTER_BASE}/capabilities`)).data,
    library: async (kind: 'section' | 'template') =>
      (await api.get<{ items: NewsletterLibraryItem[] }>(`${NEWSLETTER_BASE}/library/${kind}`)).data
        .items,
    saveLibrary: async (id: string, name: string, folder: string, sectionId?: string) =>
      (await api.post<NewsletterLibraryItem>(`${d(id)}/library`, { name, folder, sectionId })).data,
    updateLibrary: async (id: string, name: string, folder: string) =>
      (await api.patch(`${NEWSLETTER_BASE}/library/items/${id}`, { name, folder })).data,
    removeLibrary: async (id: string) =>
      (await api.delete(`${NEWSLETTER_BASE}/library/items/${id}`)).data,
    comments: async (id: string) =>
      (await api.get<{ items: NewsletterComment[] }>(`${d(id)}/comments`)).data.items,
    review: async (id: string) =>
      (
        await api.get<{
          id: string;
          name: string;
          role: string;
          html: string;
          comments: NewsletterComment[];
        }>(`${d(id)}/review`)
      ).data,
    reviewers: async (id: string) =>
      (await api.get<NewsletterReviewers>(`${d(id)}/reviewers`)).data,
    invite: async (id: string, userId: string, role: string) =>
      (await api.post<NewsletterReviewers>(`${d(id)}/reviewers`, { userId, role })).data,
    inviteByEmail: async (
      id: string,
      input: {
        email: string;
        role: string;
        message: string;
        requestKey: string;
        accountRole?: 'member' | 'admin';
      },
    ) =>
      (
        await api.post<
          NewsletterReviewers & {
            invitation: { id: string; email: string; status: 'ready' | 'pending' | 'cancelled' };
          }
        >(`${d(id)}/invitations`, input)
      ).data,
    dispatchAccountInvitation: async (invitationId: string) =>
      (
        await api.post<NewsletterAccountInvitation>(
          `/workspace/newsletter-account-invitations/${encodeURIComponent(invitationId)}/dispatch`,
          {},
          { timeout: 45000 },
        )
      ).data,
    accountInvitationStatus: async (invitationId: string) =>
      (
        await api.get<NewsletterAccountInvitation>(
          `/workspace/newsletter-account-invitations/${encodeURIComponent(invitationId)}`,
          { timeout: 35000 },
        )
      ).data,
    cancelInvitation: async (id: string, invitationId: string) =>
      (
        await api.delete<NewsletterReviewers>(
          `${d(id)}/invitations/${encodeURIComponent(invitationId)}`,
        )
      ).data,
    removeReviewer: async (id: string, userId: string) =>
      (await api.delete<NewsletterReviewers>(`${d(id)}/reviewers/${encodeURIComponent(userId)}`))
        .data,
    reviewNotifications: async (id: string, mode: string) =>
      (await api.patch<NewsletterReviewers>(`${d(id)}/review-notifications`, { mode })).data,
    threadNotifications: async (id: string, commentId?: string) =>
      (
        await api.get<NewsletterThreadNotifications>(
          commentId
            ? `${d(id)}/comments/${encodeURIComponent(commentId)}/notifications`
            : `${d(id)}/thread-notifications`,
        )
      ).data,
    saveThreadNotifications: async (id: string, commentId: string, userIds: string[]) =>
      (
        await api.patch<NewsletterThreadNotifications>(
          `${d(id)}/comments/${encodeURIComponent(commentId)}/notifications`,
          { userIds },
        )
      ).data,
    comment: async (
      id: string,
      message: string,
      blockId?: string,
      parentId?: string,
      notifyUserIds?: string[],
    ) =>
      (
        await api.post<{ items: NewsletterComment[] }>(`${d(id)}/comments`, {
          message,
          blockId,
          parentId,
          ...(notifyUserIds === undefined ? {} : { notifyUserIds }),
        })
      ).data.items,
    resolve: async (id: string, commentId: string, resolved: boolean) =>
      (
        await api.patch<{ items: NewsletterComment[] }>(`${d(id)}/comments/${commentId}`, {
          resolved,
        })
      ).data.items,
    assets: async () =>
      (await api.get<{ items: NewsletterAsset[] }>(`${NEWSLETTER_BASE}/assets`)).data.items,
    assetPage: async (query: NewsletterAssetQuery) =>
      (await api.get<NewsletterAssetPage>(`${NEWSLETTER_BASE}/assets`, { params: query })).data,
    stockImageStatus: async () =>
      (await api.get<NewsletterStockStatus>(`${NEWSLETTER_BASE}/stock-images/status`)).data,
    stockImages: async (search: string, page: number) =>
      (
        await api.get<NewsletterStockPage>(`${NEWSLETTER_BASE}/stock-images`, {
          params: { search, page },
        })
      ).data,
    importStockImage: async (id: number) =>
      (
        await api.post<NewsletterAsset>(
          `${NEWSLETTER_BASE}/stock-images/${id}/import`,
          {},
          { timeout: 35_000 },
        )
      ).data,
    assetFolders: async () =>
      (await api.get<{ items: NewsletterAssetFolder[] }>(`${NEWSLETTER_BASE}/asset-folders`)).data
        .items,
    createAssetFolder: async (name: string, assetIds?: string[]) =>
      (
        await api.post<NewsletterAssetFolder>(`${NEWSLETTER_BASE}/asset-folders`, {
          name,
          ...(assetIds ? { assetIds } : {}),
        })
      ).data,
    renameAssetFolder: async (id: string, name: string) =>
      (
        await api.patch<NewsletterAssetFolder>(
          `${NEWSLETTER_BASE}/asset-folders/${encodeURIComponent(id)}`,
          { name },
        )
      ).data,
    deleteAssetFolder: async (id: string) =>
      (await api.delete(`${NEWSLETTER_BASE}/asset-folders/${encodeURIComponent(id)}`)).data,
    moveAssets: async (ids: string[], folderId: string | null) =>
      (await api.post<{ moved: number }>(`${NEWSLETTER_BASE}/assets/move`, { ids, folderId })).data,
    assetDetails: async (id: string) =>
      (await api.get<NewsletterAssetDetails>(`${NEWSLETTER_BASE}/assets/${encodeURIComponent(id)}`))
        .data,
    assetRevisions: async (id: string, page = 1) =>
      (
        await api.get<NewsletterAssetRevisionPage>(
          `${NEWSLETTER_BASE}/assets/${encodeURIComponent(id)}/revisions`,
          {
            params: { page, pageSize: 10 },
          },
        )
      ).data,
    saveImageRevision: async (
      file: File,
      sourceUrl: string,
      original?: File,
      documentId?: string,
    ) => {
      const form = new FormData();
      form.append('file', file);
      const sourceToken = newsletterImageToken(sourceUrl);
      if (sourceToken) form.append('sourceToken', sourceToken);
      else if (original) form.append('original', original);
      if (documentId) form.append('documentId', documentId);
      return (await api.post<NewsletterAsset>(`${NEWSLETTER_BASE}/assets/revisions`, form)).data;
    },
    renameAsset: async (id: string, name: string) =>
      (
        await api.patch<NewsletterAsset>(`${NEWSLETTER_BASE}/assets/${encodeURIComponent(id)}`, {
          name,
        })
      ).data,
    deleteAssets: async (ids: string[]) =>
      (await api.post<{ deleted: number }>(`${NEWSLETTER_BASE}/assets/delete`, { ids })).data,
    importAsset: async (url: string, folderId?: string) =>
      (
        await api.post<NewsletterAsset>(
          `${NEWSLETTER_BASE}/assets/import`,
          { url, ...(folderId ? { folderId } : {}) },
          { timeout: 20_000 },
        )
      ).data,
    upload: async (file: File, folderId?: string) => {
      const form = new FormData();
      form.append('file', file);
      if (folderId) form.append('folderId', folderId);
      return (await api.post<NewsletterAsset>(`${NEWSLETTER_BASE}/assets`, form)).data;
    },
    write: async (id: string, prompt: string, text: string, kind: string) =>
      (await api.post<{ text: string }>(`${d(id)}/write`, { prompt, text, kind })).data.text,
    generateAltText: async (id: string, file?: File, sourceUrl?: string) => {
      const form = new FormData();
      const sourceToken = sourceUrl ? newsletterImageToken(sourceUrl) : null;
      if (sourceToken) form.append('sourceToken', sourceToken);
      else if (file) form.append('file', file);
      return (
        await api.post<{ text: string }>(`${d(id)}/generate-alt-text`, form, { timeout: 80_000 })
      ).data.text;
    },
    refineImage: async (
      id: string,
      file: File,
      prompt: string,
      count: 1 | 4,
      sourceUrl?: string,
    ) => {
      const form = new FormData();
      form.append('file', file);
      form.append('prompt', prompt);
      form.append('count', String(count));
      const sourceToken = sourceUrl ? newsletterImageToken(sourceUrl) : null;
      if (sourceToken) form.append('sourceToken', sourceToken);
      return (
        await api.post<{ items: NewsletterAsset[] }>(`${d(id)}/refine-image`, form, {
          timeout: 200_000,
        })
      ).data.items;
    },
    htmlCheck: async (id: string, revision: number) =>
      (
        await api.post<NewsletterHtmlReport>(
          `${d(id)}/html-check`,
          { revision },
          { timeout: 100_000 },
        )
      ).data,
    videoThumbnail: async (id: string, url: string) =>
      (
        await api.post<NewsletterVideoThumbnail>(
          `${d(id)}/video-thumbnail`,
          { url },
          { timeout: 45_000 },
        )
      ).data,
    linkPreview: async (id: string, url: string) =>
      (await api.post<NewsletterLinkPreview>(`${d(id)}/link-preview`, { url }, { timeout: 35_000 }))
        .data,
  };
}
export interface NewsletterLinkPreview {
  sourceUrl: string;
  title: string;
  description: string;
  imageUrl: string;
  warnings: string[];
}
export interface NewsletterVideoThumbnail {
  sourceUrl: string;
  provider: 'youtube' | 'vimeo';
  title: string;
  imageUrl: string;
}
export interface NewsletterHtmlReport {
  provider: string;
  revision: number;
  checkedAt: string;
  issues: string[];
  report: Record<string, unknown>;
}
export interface NewsletterAsset {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  altText?: string;
}
export interface NewsletterStockStatus {
  provider: 'pexels';
  available: boolean;
  reason: string | null;
}
export interface NewsletterStockImage {
  id: number;
  title: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  width: number;
  height: number;
}
export interface NewsletterStockPage {
  provider: 'pexels';
  items: NewsletterStockImage[];
  page: number;
  pageSize: number;
  total: number;
}
export interface NewsletterAssetDetails extends NewsletterAsset {
  createdAt: string;
  sizeBytes: number;
  revisionNumber?: number;
  currentRevision?: boolean;
}
export interface NewsletterAssetRevisionPage {
  items: NewsletterAssetDetails[];
  page: number;
  pageSize: number;
  total: number;
}
export function newsletterImageToken(url: string): string | null {
  try {
    const parsed = new URL(url, 'https://app.capiro.ai');
    return (
      parsed.pathname.match(/^\/workspace-api\/newsletters\/assets\/file\/([a-f0-9]{64})$/)?.[1] ||
      null
    );
  } catch {
    return null;
  }
}
export interface NewsletterAssetFolder {
  id: string;
  name: string;
}
export interface NewsletterAssetQuery {
  page: number;
  pageSize: 10 | 25 | 50 | 100;
  search: string;
  sort: 'newest' | 'oldest' | 'name-asc' | 'name-desc';
  folder?: string;
}
export interface NewsletterAssetPage {
  items: NewsletterAsset[];
  page: number;
  pageSize: number;
  total: number;
}
export interface NewsletterReviewers {
  currentUserId: string;
  role: string;
  items: { userId: string; name: string; email: string; role: string; notifications: string }[];
  available: { clerkUserId: string; name: string; email: string }[];
  pending?: {
    id: string;
    email: string;
    role: string;
    accountRole?: 'member' | 'admin';
    message?: string;
    expiresAt: string;
  }[];
  invitationEmailAvailable?: boolean;
  canInviteAccounts?: boolean;
}
export interface NewsletterAccountInvitation {
  id: string;
  status: string;
  accountRole: string;
  message: string;
  canRetry: boolean;
}
export interface NewsletterThreadNotifications {
  rootId: string | null;
  userIds: string[];
  items: { userId: string; name: string; email: string }[];
  editable: boolean;
  emailAvailable: boolean;
}
export type NewsletterClient = ReturnType<typeof createNewsletterClient>;
export function useNewsletterApi() {
  const api = useApi();
  return useMemo(() => createNewsletterClient(api), [api]);
}
export function newsletterError(error: unknown): string {
  const e = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = e.response?.data?.message;
  return Array.isArray(message)
    ? message.join(' ')
    : message || e.message || 'The request could not be completed.';
}
