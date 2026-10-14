import { ProductShell } from "../../shared/shell/ProductShell";
import { MeriHome } from "../../features/meri/MeriHome";
import { RequireSession } from "../../shared/session/SessionContext";

export default function MeriPage() {
  return (
    <ProductShell>
      <RequireSession>
        <MeriHome />
      </RequireSession>
    </ProductShell>
  );
}
