import { z } from "zod";

const personnelId = z.string().uuid();

export function isPersonnelId(id: string) {
  return personnelId.safeParse(id).success;
}

function readId(params: Pick<URLSearchParams, "getAll">, key: string) {
  const ids = params.getAll(key);
  const id = ids.length === 1 ? ids[0] : undefined;
  return id && isPersonnelId(id) ? id : null;
}

export function readPersonnelId(params: Pick<URLSearchParams, "getAll">) {
  return readId(params, "personnelId");
}

export function readPersonnelPreviewId(
  params: Pick<URLSearchParams, "getAll">,
) {
  return readId(params, "personnelPreviewId");
}
