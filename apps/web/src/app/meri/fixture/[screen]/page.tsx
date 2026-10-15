import { notFound } from "next/navigation";
import { ProductShell } from "../../../../shared/shell/ProductShell";
import {
  findFixtureScreen,
  fixtureScreens,
} from "../../../../features/meri/fixtures/screens/registry";
import { pendingApprovals } from "../../../../features/meri/fixtures/screens/approval-counts";

export const generateStaticParams = () =>
  fixtureScreens.map((screen) => ({ screen: screen.slug }));

export default async function FixtureScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const entry = findFixtureScreen((await params).screen);
  if (!entry) notFound();
  return (
    <ProductShell
      fixture
      designTarget={entry.figmaNode}
      section={entry.section}
      pendingApprovals={pendingApprovals(entry.slug)}
    >
      <entry.Screen />
    </ProductShell>
  );
}
