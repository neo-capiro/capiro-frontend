"use client";
import { useState } from "react";
import type { Client } from "@/features/portfolio/index/public";
import { ClientIntakeDialog } from "@/features/portfolio/client-intake/public";
import { ProfileCompleteness } from "@/features/portfolio/profile-build/public";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
export function ClientCompleteness({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false);
  const identity = useIdentity();
  const canEdit =
    identity.isSuccess &&
    !identity.isFetching &&
    !identity.error &&
    canAdminister(identity.data?.role);
  return (
    <>
      <ProfileCompleteness
        subject={{ kind: "client", id: client.id }}
        onEdit={canEdit ? () => setEditing(true) : undefined}
      />
      <ClientIntakeDialog
        client={client}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => setEditing(false)}
      />
    </>
  );
}
