import { ProductShell } from "../../../../shared/shell/ProductShell";
import { RunActivityFixture } from "../../../../features/meri/fixtures/RunActivityFixture";

export default function RunActivityFixturePage() {
  return (
    <ProductShell fixture section="conversations" designTarget="443:82027">
      <RunActivityFixture />
    </ProductShell>
  );
}
