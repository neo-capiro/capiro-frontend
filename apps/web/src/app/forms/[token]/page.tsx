import type { Metadata } from "next";
import { PublicForm } from "../../../features/modules/planner/PublicForm";
export const metadata: Metadata = { title: "Capiro request form", referrer: "no-referrer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicForm key={token} token={token} />;
}
