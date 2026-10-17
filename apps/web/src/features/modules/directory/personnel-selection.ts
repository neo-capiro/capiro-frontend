import { z } from "zod";

const personnelId = z.string().uuid();

export function isPersonnelId(id: string) {
  return personnelId.safeParse(id).success;
}

export function readPersonnelId(params: Pick<URLSearchParams, "getAll">) {
  const ids = params.getAll("personnelId");
  const id = ids.length === 1 ? ids[0] : undefined;
  return id && isPersonnelId(id) ? id : null;
}
