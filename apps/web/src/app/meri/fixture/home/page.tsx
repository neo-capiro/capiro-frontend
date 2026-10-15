import { ProductShell } from "../../../../shared/shell/ProductShell";
import { MeriHomeFixture } from "../../../../features/meri/fixtures/MeriHomeFixture";

export default function HomeFixturePage() {
  return (
    <ProductShell fixture section="conversations">
      <MeriHomeFixture />
    </ProductShell>
  );
}
