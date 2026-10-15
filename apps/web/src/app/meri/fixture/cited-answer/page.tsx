import { ProductShell } from "../../../../shared/shell/ProductShell";
import { MeriCitedAnswer } from "../../../../features/meri/MeriCitedAnswer";

export default function CitedAnswerFixturePage() {
  return (
    <ProductShell
      fixture
      section="conversations"
      designTarget="1064:144239"
      assetSet="cited-answer"
    >
      <MeriCitedAnswer />
    </ProductShell>
  );
}
