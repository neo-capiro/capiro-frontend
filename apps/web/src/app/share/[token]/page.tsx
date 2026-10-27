import type { Metadata } from "next";
import { PublicShareRecipient } from "../../../features/modules/workspace/PublicShareRecipient";

export const metadata: Metadata = {
  title: "Shared content",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicShareRecipient token={token} />;
}
