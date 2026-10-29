import { notFound } from "next/navigation";
import { BillDetailPage } from "@/features/modules/intelligence/BillDetailPage";
import { normalizeBillId } from "@/shared/capiro/operations/intelligence";

/**
 * Thin receiver for an identifier-only bill link. The framework may hand us an encoded
 * segment, so it is decoded once and then required to be one canonical federal bill id
 * or state bill key; anything else is a 404. Authentication, the tenant flow and the
 * bill_360 entitlement remain the gateway's and backend's business, not this route's.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  let decoded: string;
  try {
    decoded = decodeURIComponent(billId);
  } catch {
    notFound();
  }
  const canonical = normalizeBillId(decoded);
  if (!canonical) notFound();
  return <BillDetailPage billId={canonical} />;
}
