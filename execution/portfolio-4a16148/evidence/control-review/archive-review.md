# Frozen ZIP format and Windows discrepancy

The reported Windows digest is exactly reproduced by two metadata changes to the frozen ZIP: shift all4939Git members’ DOS timestamps from `2026-10-12 11:48:20` to `07:48:20` (UTC−04:00), in both local and central headers; change the appended `source-commit.txt` central-directory creator system from3to0. The resulting SHA256 is **9f3bf0962f5fa78595f87f78ac735b1ea23b2a9f18d6574771e30a179c060479**, matching the coordinator’s report. Payload, compression, CRC and length need no changes. This was a read-only, hash-only9879-position simulation; no Windows ZIP was supplied, frozen bytes were not changed and no variant archive was written.

The frozen archive is451977924bytes, SHA256 **252ccdf0d91d94a6b53e4a9d905534f2b4e325ef231481774154daa96bfacbf5**. It contains4155tracked files,784directory members and one appended marker (4940members total). The central directory starts at451252419. The EOCD comment is the exact40-character source commit. Full local observations are in `frozen-format-spec.json` and `zip-platform-fields.json`.

The producer omissions are concrete. The published recipe calls Git without fixing TZ and creates ZipInfo without fixing creator system. Git2.52.0 converts commit epoch to local DOS date/time, so host timezone affects header bytes; extended UTC timestamp stays unchanged. Its default ZIP compression level is6. [Pinned Git ZIP producer](https://raw.githubusercontent.com/git/git/v2.52.0/archive-zip.c), [Git archive options](https://git-scm.com/docs/git-archive). CPython3.12.14 chooses creator system0on Windows and3elsewhere; that value goes into the central directory. Its ZIP_DEFLATED writer uses raw zlib deflate. [Pinned CPython producer](https://raw.githubusercontent.com/python/cpython/v3.12.14/Lib/zipfile/__init__.py), [Python ZIP metadata](https://docs.python.org/3.12/library/zipfile.html).

## Minimal producer correction for root review

Keep the historical recipe and archive immutable. In a separately reviewed replacement producer, run Git with a process-local `TZ=UTC0` environment and explicitly set `i.create_system = 3` on the appended ZipInfo. Retain exact commit, entry order, marker body/newline, timestamp tuple, compression method, external attributes, new-output refusal and final expected-digest rejection. Do not accept the Windows SHA as the frozen artifact.

```python
archive_env = dict(os.environ, TZ="UTC0")
subprocess.run(git_archive_argv, check=True, env=archive_env)
# Existing ZipInfo construction and properties remain unchanged.
i.create_system = 3
```

This reviewer did not edit either producer. Small real Git probes confirm UTC0 produces11:48:20 while EST5EDT produces07:48:20; the appended platform field changes the ZIP digest independently. These probes are in `timezone-producer-control.json`. The full simulated Windows digest match establishes that compressor differences are unnecessary to explain this particular report. A corrected full Windows producer run must still reproduce the original SHA before its output is accepted.

## Exact observed format constraints

- Git4939entries: creator system0, create version0, extraction version10; flags0; epoch1791805700 in extra field hex555405000104c9cc6a; DOS timestamp fixed to UTC11:48:20. Git produces3033text regular entries with internal attribute1,1122binary regular entries with internal attribute0,784directories with external attribute16. All regular Git external attributes are0.
- Appended marker: Unix creator system3, create/extract version20, flags0, no extra/comment, timestamp2026-10-12T00:00:00, external attribute0o100644<<16, internal attribute0, compression8, body41bytes, compressed42bytes, CRC3864300443. Its local header starts451252330; creator-system byte in central directory is451977804.
- Archive compression counts:3997deflated and943stored entries. Recorded producers are Git2.52.0, Python3.12.14 and zlib1.3.2. Raw compressed byte identity is ultimately enforced by the exact final ZIP SHA, rather than assumed from CRC, output length or nominal compression level.

Library transfer remains root-owned and was not attempted by this reviewer. A failed hosted preflight proves neither a transfer nor a file-size limit.
