import ClientPane from "../../ClientPane";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Only this synthetic page slows down, so a real Next navigation stays pending long
  // enough to observe what a second selection does during that window.
  if (params.reviewDelay === "1")
    await new Promise((resolve) => setTimeout(resolve, 800));
  return <ClientPane />;
}
