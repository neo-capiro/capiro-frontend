import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "../../src/shared/portfolio/api/provider";
import { FilesPage } from "../../src/features/portfolio/files/FilesPage";
import { filesKey } from "../../src/features/portfolio/files/file-reader";
import { clientId } from "../../tests/browser/fixtures";
function Files() {
  const cache = useQueryClient();
  const [shown, setShown] = useState(true);
  return (
    <>
      <button onClick={() => setShown(!shown)}>Toggle file view</button>
      <button
        onClick={() =>
          cache.setQueryData(["identity"], {
            user: { id: "replacement-user", email: "synthetic@example.test" },
            tenant: { id: "tenant-test", name: "Synthetic" },
            role: "standard_user",
          })
        }
      >
        Replace file reader
      </button>
      <button
        onClick={() =>
          void cache.invalidateQueries({ queryKey: filesKey(clientId) })
        }
      >
        Refresh files
      </button>
      {shown && <FilesPage clientId={clientId} destinations={{}} />}
    </>
  );
}
export function FileBatchProbe() {
  return (
    <DataProvider>
      <Files />
    </DataProvider>
  );
}
