import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  commentDeadlinePage,
  commentDeadlineQuery,
} from "../../federal-register/comment-deadlines";
export const commentDeadlineOperations = {
  "calendar.commentDeadlineCalendar": defineOperation({
    service: "core",
    method: "GET",
    path: "/federal-register/comment-deadline-calendar",
    request: z.object({ query: commentDeadlineQuery }).strict(),
    response: commentDeadlinePage,
    source:
      "capirov2@46aa2164c299151225c6cdb9f3cc565fee347657 FederalRegisterController.commentDeadlineCalendar; FederalRegisterService.getCommentDeadlineCalendar; docs/frontend-product-contracts-20261013/RECEIVING-CONTRACT.md",
  }),
} as const;
