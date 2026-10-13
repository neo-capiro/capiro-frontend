"""Read-only provenance replay. Does not import application or package code."""

import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
receipt = json.loads((root / "SOURCE-ORIGINS.json").read_text())
for item in receipt["sources"]:
    data = (root / "backend" / item["path"]).read_bytes()
    digest = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    assert digest == item["gitBlob"], (item["path"], digest)

context = json.loads((root / "SOURCE-VERIFICATION.json").read_text())
for item in context["contextCopies"]:
    data = (root / item["copy"]).read_bytes()
    assert len(data) == item["bytes"], item["copy"]
    assert hashlib.sha256(data).hexdigest() == item["sha256"], item["copy"]

print(json.dumps({"gitBlobsVerified": len(receipt["sources"]),
                  "contextCopiesVerified": len(context["contextCopies"]),
                  "nativeRequests": 0, "applicationExecution": False}))
