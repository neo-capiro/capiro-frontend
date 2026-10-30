import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The ordinary app entry is Meri with the canonical General scope selected. An explicit client,
 * conversation or returnTo link keeps its own destination; this only decides the bare entry.
 */
export default function HomePage() {
  redirect("/meri?scope=general");
}
