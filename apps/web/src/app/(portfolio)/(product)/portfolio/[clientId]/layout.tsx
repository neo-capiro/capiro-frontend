import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";
import { ClientFrame } from "@/features/portfolio/client-profile/public";
import { readConfig } from "@/shared/portfolio/config/config";
import { MeriCapabilitiesProvider } from "@/shared/meri-resources/CapabilityContext";
import { readMeriCapabilities } from "@/shared/meri-resources/capabilities.server";
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  if (!z.string().uuid().safeParse(clientId).success) notFound();
  return (
    <MeriCapabilitiesProvider value={readMeriCapabilities(process.env)}>
      <ClientFrame
        clientId={clientId}
        destinations={readConfig(process.env).destinations}
      >
        {children}
      </ClientFrame>
    </MeriCapabilitiesProvider>
  );
}
