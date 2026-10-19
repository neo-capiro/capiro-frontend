import { ProductShell } from "../../../../shared/shell/ProductShell";
import { pendingApprovals } from "../../../../features/meri/fixtures/screens/approval-counts";
import { MeriCitedAnswer } from "../../../../features/meri/MeriCitedAnswer";

export default function CitedAnswerFixturePage() {
  return (
    <ProductShell
      pendingApprovals={pendingApprovals()}
      fixture
      section="conversations"
      designTarget="1064:144239"
      assetSet="cited-answer"
    >
      <MeriCitedAnswer />
    </ProductShell>
  );
}
