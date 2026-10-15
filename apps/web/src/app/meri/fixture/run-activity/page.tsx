import { ProductShell } from "../../../../shared/shell/ProductShell";
import { pendingApprovals } from "../../../../features/meri/fixtures/screens/approval-counts";
import { RunActivityFixture } from "../../../../features/meri/fixtures/RunActivityFixture";

export default function RunActivityFixturePage() {
  return (
    <ProductShell
      pendingApprovals={pendingApprovals()}
      fixture
      section="conversations"
      designTarget="443:82027"
    >
      <RunActivityFixture />
    </ProductShell>
  );
}
