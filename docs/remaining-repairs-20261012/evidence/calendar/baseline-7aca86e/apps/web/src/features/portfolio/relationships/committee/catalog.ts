import { committeeLabel, type Committee } from "../directory-contracts";

export type CommitteeBranch = { chamber: string; officeId?: number } | null;
export type CommitteeOption = {
  key: string;
  label: string;
  detail: string;
  committee?: Committee;
  branch?: NonNullable<CommitteeBranch>;
  childCount: number;
};

/** Parent chains must be complete before a staged ID can be reviewed. */
export function validateCommitteeCatalog(rows: Committee[]) {
  const byId = new Set(rows.map((row) => row.id));
  const byOffice = new Map(rows.map((row) => [row.officeId, row]));
  if (byId.size !== rows.length || byOffice.size !== rows.length)
    throw new Error(
      "The committee catalog contains conflicting identities. Reload it.",
    );
  for (const row of rows) {
    const seen = new Set<number>([row.officeId]);
    let parentId = row.parentOfficeId;
    while (parentId !== null) {
      const parent = byOffice.get(parentId);
      if (!parent || seen.has(parentId) || parent.chamber !== row.chamber)
        throw new Error(
          "The committee hierarchy is incomplete or changed. Reload it.",
        );
      seen.add(parentId);
      parentId = parent.parentOfficeId;
    }
  }
  return rows;
}

export function committeeOptions(
  rows: Committee[],
  branch: CommitteeBranch,
  query: string,
): CommitteeOption[] {
  const search = query.trim().toLocaleLowerCase();
  if (!search && !branch)
    return [...new Set(rows.map((row) => row.chamber))]
      .sort((a, b) => a.localeCompare(b))
      .map((chamber) => ({
        key: `chamber:${chamber}`,
        label: chamber || "Chamber not supplied",
        detail: "",
        branch: { chamber },
        childCount: rows.filter(
          (row) => row.chamber === chamber && row.parentOfficeId === null,
        ).length,
      }));
  return rows
    .filter((row) =>
      search
        ? committeeLabel(row, rows).toLocaleLowerCase().includes(search)
        : row.chamber === branch?.chamber &&
          row.parentOfficeId === (branch.officeId ?? null),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((row) => {
      const childCount = rows.filter(
        (child) => child.parentOfficeId === row.officeId,
      ).length;
      return {
        key: row.id,
        label: row.name,
        detail: committeeLabel(row, rows),
        committee: row,
        childCount,
        ...(childCount
          ? { branch: { chamber: row.chamber, officeId: row.officeId } }
          : {}),
      };
    });
}

export function parentCommitteeBranch(
  rows: Committee[],
  branch: CommitteeBranch,
): CommitteeBranch {
  if (!branch || branch.officeId === undefined) return null;
  const parentOfficeId = rows.find(
    (row) => row.officeId === branch.officeId,
  )?.parentOfficeId;
  return {
    chamber: branch.chamber,
    ...(parentOfficeId !== null && parentOfficeId !== undefined
      ? { officeId: parentOfficeId }
      : {}),
  };
}
