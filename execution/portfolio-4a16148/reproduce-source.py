#!/usr/bin/env python3
"""Reproduce the unchanged qualified ZIP; no upload or cloud action.

Exit0: exact frozen digest, size and CRCs match. Exit1: reproduction failed.
Exit2: invalid arguments or an existing output path (always preserved).
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile

import prepare


def reproduce(checkout, output):
    # Exclusive creation preserves every earlier archive, including mismatches.
    with output.open('xb') as archive:
        # Git's ZIP DOS timestamps use localtime; keep Windows and Unix identical.
        subprocess.run(['git', '-C', str(checkout), 'archive', '--format=zip', prepare.SOURCE],
                       stdout=archive, check=True, env=dict(os.environ, TZ='UTC0'))
    with zipfile.ZipFile(output, 'a') as archive:
        marker = zipfile.ZipInfo('source-commit.txt', date_time=(2026, 10, 12, 0, 0, 0))
        marker.create_system = 3  # ZIP Unix creator, independent of Python's host OS.
        marker.compress_type = zipfile.ZIP_DEFLATED
        marker.external_attr = 0o100644 << 16
        archive.writestr(marker, prepare.SOURCE+'\n')
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None or archive.read('source-commit.txt') != (prepare.SOURCE+'\n').encode():
            raise ValueError('Archive CRC or exact source marker verification failed')
    with output.open('rb') as archive:
        digest = hashlib.file_digest(archive, 'sha256').hexdigest()
    size = output.stat().st_size
    result = {'applicationSource': prepare.SOURCE, 'sha256': digest, 'bytes': size,
              'matchesFrozenArchive': digest == prepare.ARCHIVE_SHA and size == prepare.ARCHIVE_BYTES,
              'gitArchiveTimezone': 'UTC0', 'markerCreateSystem': 3, 'cloudActions': []}
    print(json.dumps(result, indent=2))
    if not result['matchesFrozenArchive']:
        raise ValueError('Archive differs from the frozen digest; preserve it for diagnosis, do not upload')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('checkout', type=Path)
    parser.add_argument('new_output_zip', type=Path)
    args = parser.parse_args()
    if args.new_output_zip.exists():
        parser.error('Output already exists and is preserved; choose a fresh path')
    try:
        reproduce(args.checkout.resolve(), args.new_output_zip.resolve())
    except (OSError, ValueError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        parser.exit(1, str(error)+'\n')


if __name__ == '__main__':
    main()
