import {
  parseNewsletterReview,
  parseNewsletterComments,
} from "@capiro/shared/newsletter";

/** Binding comes from the route/request, never the received object's own ID. */
export const receiveReview = (value: unknown, documentId: string) =>
  parseNewsletterReview(value, { documentId });
export const receiveComments = (value: unknown, documentId: string) =>
  parseNewsletterComments(value, { documentId });

export function canEnterEditor(role: string) {
  return role === "owner" || role === "editor";
}
