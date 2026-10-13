# Qualification evidence methods

`run-gate.py` wraps each command, captures raw stdout/stderr and exit status, and compares the exact HEAD/root/application tree and production/test/config diff before and after. It does not retry, skip tests or alter source. `copy-evidence.py` preserves every copied regular file byte-for-byte, rejects different existing destinations and records origin, size and SHA256. Python caches, dependencies and symlinks are excluded from packet copies.

These are recorded execution methods, not application runtime code. Final commands, exit receipts, JSON case results and source binding remain the gate authority.
