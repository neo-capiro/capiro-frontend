import { createApiClient } from "../src/shared/portfolio/api/http";
export {
  commentRecord,
  commentPage,
} from "../src/shared/federal-register/comment-deadline-fixtures";

export function commentApi(
  respond: (url: URL, options?: RequestInit) => unknown | Promise<unknown>,
) {
  const requests: URL[] = [];
  const api = createApiClient(async (input, options) => {
    const url = new URL(String(input), "http://127.0.0.1");
    requests.push(url);
    if (options?.method !== "GET") throw new Error("Unexpected comment write");
    const result = await respond(url, options);
    if (result instanceof Response) return result;
    // The old route legitimately has no dates beyond its fixed upcoming window.
    return Response.json(
      url.pathname.endsWith("/upcoming-deadlines") ? [] : result,
    );
  });
  return { api, requests };
}
