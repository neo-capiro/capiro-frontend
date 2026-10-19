# Reproducing the original archive on Windows

The accepted input remains 451977924 bytes with SHA-256 `252ccdf0d91d94a6b53e4a9d905534f2b4e325ef231481774154daa96bfacbf5`. The Windows result `9f3bf0962f5fa78595f87f78ac735b1ea23b2a9f18d6574771e30a179c060479` is not accepted as that input.

Independent read-only simulation reproduces the entire reported Windows digest by changing only metadata: the local and central DOS timestamps of all 4939 Git members shift from 11:48:20 UTC to 07:48:20, and the appended marker's central-directory creator system changes from 3 to 0. That is 9879 metadata-byte patches, with payloads, compression, CRCs and total size unchanged. This establishes a complete explanation for the reported hash, although the actual Windows ZIP was not transferred here.

The historical producer and original ZIP remain unchanged. The separately reviewed `reproduce-source.py` runs the same Git archive command with process-local `TZ=UTC0` and explicitly sets the appended marker's `create_system=3`. It preserves the fixed commit, entry order, compression choices, exact marker body, attributes and timestamp. It refuses an existing output and rejects any resulting digest/size mismatch. No upload or cloud command is part of reproduction.

```text
python reproduce-source.py PATH_TO_CHECKOUT NEW_OUTPUT_ZIP
```

Use Python 3.11+ with the companion `prepare.py` from this same reviewed execution packet. A full local run launched with a non-UTC parent timezone reproduced the original exact digest, length and CRCs. The Windows producer must still demonstrate that exact digest itself before custody can be accepted. Matching extracted files, CRCs or length alone is insufficient.

Observed format constraints:

- Source commit and EOCD archive comment: `4a1614886fd98bb42d529f1ef59b3d01d7ff9173`.
- 4940 members: 4155 tracked Git blobs, 784 Git directories, then `source-commit.txt`. Preserve Git's member order. Central directory offset 451252419.
- Git timestamps: DOS 2026-10-12T11:48:20, extended UTC epoch 1791805700, extra field hex `555405000104c9cc6a`. Git creator system 0, create version 0, extraction version 10; all flags 0.
- Git entries: 3033 text files have internal attribute 1; 1122 binary files have internal attribute 0; all Git regular-file external attributes 0. 784 directories have external attribute 16.
- Marker: body is the exact ASCII commit plus one LF, 41 bytes. Timestamp 2026-10-12T00:00:00; creator system 3; create/extract version 20; internal attribute 0; external attribute `0o100644 << 16`; flags 0; no extra field or per-member comment; DEFLATE compression, 42 compressed bytes, CRC 3864300443.
- Across the entire archive: 3997 deflated and 943 stored entries. Recorded producer versions: Git 2.52.0, Python 3.12.14, zlib 1.3.2. The final hash remains authoritative if another toolchain differs.

Git's ZIP producer uses local time for DOS headers; Python's default ZIP creator system depends on the host. The correction makes both explicit. [Pinned Git producer](https://raw.githubusercontent.com/git/git/v2.52.0/archive-zip.c), [pinned CPython producer](https://raw.githubusercontent.com/python/cpython/v3.12.14/Lib/zipfile/__init__.py)

Library handover remains unconfirmed: the required supported upload helper failed twice during hosted-app network preflight, before upload preparation. No Library ID or upload-size limit was returned. These source/reproduction receipts are not a claim that the original ZIP was transferred. No alternative storage relay was used.
