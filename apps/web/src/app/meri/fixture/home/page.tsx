import { ProductShell } from "../../../../shared/shell/ProductShell";
import { pendingApprovals } from "../../../../features/meri/fixtures/screens/approval-counts";
import { MeriHomeFixture } from "../../../../features/meri/fixtures/MeriHomeFixture";

export default function HomeFixturePage() {
  return (
    <ProductShell
      pendingApprovals={pendingApprovals()}
      fixture
      section="conversations"
    >
      <MeriHomeFixture />
    </ProductShell>
  );
}
