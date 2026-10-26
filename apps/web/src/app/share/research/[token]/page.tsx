import type { Metadata } from "next";
import { ResearchShareRecipient } from "../../../../features/modules/research-portfolios/share/ResearchShareRecipient";

export const metadata: Metadata = {
  title: "Research portfolio",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ResearchSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ResearchShareRecipient key={token} token={token} />;
}
