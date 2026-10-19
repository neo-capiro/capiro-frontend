#!/usr/bin/env python3
"""Verify all context package bytes; never executes preserved source."""
import argparse
import json
import sys
from context_common import PreservationError, verify_package


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package")
    parser.add_argument("--expected-manifest-sha256")
    parser.add_argument("--history-bundle")
    args = parser.parse_args()
    try:
        _, summary = verify_package(args.package, args.expected_manifest_sha256, args.history_bundle)
        print(json.dumps(summary, sort_keys=True))
    except (PreservationError, OSError, ValueError, KeyError) as error:
        print("Verification refused: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
