"use client";

import { useRouter } from "next/navigation";
import { SettingsTabs } from "../components";

export function TenantTabs({ section }: { section: string }) {
  const router = useRouter();
  return (
    <SettingsTabs
      label="Tenant management"
      value={section}
      onChange={(value) => router.push(`/settings/${value}`)}
      items={[
        { id: "hq-tenants", label: "Tenants" },
        { id: "hq-personnel", label: "Personnel Merge Queue" },
        { id: "hq-ai-keys", label: "AI Keys & Usage" },
      ]}
    />
  );
}
