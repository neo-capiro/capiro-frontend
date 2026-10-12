#!/usr/bin/env python3
"""Tiny isolated synthetic controls; never creates a successor archive or calls cloud tools."""
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import struct
import subprocess
import warnings
import zipfile

ROOT = Path(__file__).resolve().parent
CANONICAL = Path('/workspace/capiro-p1-successor/docs/successor-p1-20261012/packaging/source_archive.py')


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def setup_repository():
    repository = ROOT / 'synthetic-git'
    repository.mkdir(exist_ok=True)
    subprocess.run(['git', 'init', '--bare', '--quiet', str(repository)], check=True)
    env = dict(os.environ, GIT_AUTHOR_NAME='Synthetic reviewer', GIT_AUTHOR_EMAIL='synthetic@example.test',
               GIT_COMMITTER_NAME='Synthetic reviewer', GIT_COMMITTER_EMAIL='synthetic@example.test',
               GIT_AUTHOR_DATE='2026-10-12T00:00:00Z', GIT_COMMITTER_DATE='2026-10-12T00:00:00Z')
    def git(*args, data=None):
        return subprocess.check_output(['git', '--no-replace-objects', '-C', str(repository), *args], input=data, env=env).strip().decode()
    def blob(data):
        return git('hash-object', '-w', '--stdin', data=data)
    def tree(entries):
        return git('mktree', data=''.join(f'{mode} {kind} {oid}\t{name}\n' for mode, kind, oid, name in entries).encode())
    source = tree([('100644', 'blob', blob(b'export const synthetic = true;\n'), 'synthetic.ts')])
    web = tree([('040000', 'tree', source, 'src')])
    apps = tree([('040000', 'tree', web, 'web')])
    top = tree([('100644', 'blob', blob(b'Synthetic archive review\n'), 'README.md'),
                ('100755', 'blob', blob(b'#!/bin/sh\nprintf synthetic\\n\n'), 'run.sh'),
                ('040000', 'tree', apps, 'apps')])
    commit = git('commit-tree', top, data=b'Synthetic source fixture only\n')
    return repository, commit


def rebuild(original, output, change):
    with zipfile.ZipFile(original) as archive:
        entries = [(copy.copy(info), archive.read(info)) for info in archive.infolist()]
    entries = change(entries)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        with zipfile.ZipFile(output, 'w') as archive:
            for info, data in entries:
                archive.writestr(info, data)


def info(name, mode=0o100644, creator=3):
    value = zipfile.ZipInfo(name)
    value.create_system = creator
    value.external_attr = mode << 16
    return value


def main():
    canonical = module('canonical_archive', CANONICAL)
    independent_path = ROOT / 'verify-source-zip.py'
    independent = module('independent_archive', independent_path)
    repository, commit = setup_repository()
    directory = ROOT / 'synthetic-zips'
    directory.mkdir(exist_ok=True)
    original = directory / 'valid.zip'
    if original.exists():
        original.unlink()
    canonical.create(repository, commit, original)
    cases = []
    def variant(name, expected, change):
        path = directory / (name + '.zip')
        rebuild(original, path, change)
        cases.append((name, expected, path))
    def modify(path, transform):
        def change(entries):
            return [transform(item, data) if item.filename == path else (item, data) for item, data in entries]
        return change
    cases.append(('canonical-valid', True, original))
    def alternate(entries):
        for item, _ in entries:
            item.date_time = (2025, 6, 7, 8, 9, 10)
            item.compress_type = zipfile.ZIP_STORED
            item.comment = b'harmless member comment'
        return list(reversed(entries))
    variant('valid-metadata-order-compression', True, alternate)
    def dos_regular(item, data):
        item.create_system = 0
        item.external_attr = 0x20
        return item, data
    variant('valid-dos-regular', True, modify('README.md', dos_regular))
    variant('valid-optional-directory', True, lambda rows: rows + [(info('apps/', 0o040755), b'')])
    variant('missing-file', False, lambda rows: [row for row in rows if row[0].filename != 'README.md'])
    variant('extra-file', False, lambda rows: rows + [(info('unexpected.txt'), b'x')])
    variant('duplicate-file', False, lambda rows: rows + [next(row for row in rows if row[0].filename == 'README.md')])
    variant('duplicate-marker', False, lambda rows: rows + [next(row for row in rows if row[0].filename == 'source-commit.txt')])
    variant('traversal', False, lambda rows: rows + [(info('../escape.txt'), b'x')])
    variant('absolute-path', False, lambda rows: rows + [(info('/escape.txt'), b'x')])
    variant('backslash-path', False, lambda rows: rows + [(info('apps\\escape.txt'), b'x')])
    variant('unexpected-directory', False, lambda rows: rows + [(info('unexpected/', 0o040755), b'')])
    variant('nonempty-directory', False, lambda rows: rows + [(info('apps/', 0o040755), b'x')])
    variant('symlink-file', False, modify('README.md', lambda item, data: (info(item.filename, 0o120644), data)))
    variant('symlink-marker', False, modify('source-commit.txt', lambda item, data: (info(item.filename, 0o120644), data)))
    variant('wrong-mode', False, modify('run.sh', lambda item, data: (info(item.filename), data)))
    variant('wrong-payload-same-size', False, modify('README.md', lambda item, data: (item, b'X' + data[1:])))
    variant('wrong-marker-same-size', False, modify('source-commit.txt', lambda item, data: (item, b'0' * 40 + b'\n')))
    def dos_directory_conflict(item, data):
        item.external_attr |= 0x10
        return item, data
    variant('file-dos-directory-conflict', False, modify('README.md', dos_directory_conflict))
    def dos_executable(item, data):
        item.create_system = 0
        return item, data
    variant('dos-creator-executable-bits', False, modify('run.sh', dos_executable))
    prefix = io.BytesIO()
    with zipfile.ZipFile(prefix, 'w') as archive:
        archive.writestr(info('../unindexed.txt'), b'extra unverified source')
    prefixed = directory / 'hidden-prefixed-archive.zip'
    prefixed.write_bytes(prefix.getvalue() + original.read_bytes())
    cases.append(('hidden-prefixed-archive', False, prefixed))
    trailing = directory / 'trailing-unindexed-bytes.zip'
    trailing.write_bytes(original.read_bytes() + b'unverified extra bytes')
    cases.append(('trailing-unindexed-bytes', False, trailing))
    results = []
    for name, expected, path in cases:
        row = {'case': name, 'expectedAccept': expected, 'archiveSHA256': hashlib.sha256(path.read_bytes()).hexdigest()}
        for label, verifier in [('canonical', canonical.verify), ('independent', independent.verify_zip)]:
            try:
                verifier(repository, commit, path)
                accepted, error = True, None
            except Exception as error_value:
                accepted, error = False, type(error_value).__name__ + ': ' + str(error_value)
            row[label] = {'accepted': accepted, 'passed': accepted == expected, 'error': error}
        results.append(row)
    # Replacing the pathname after ZIP verification must not bind unverified bytes.
    valid_bytes = original.read_bytes()
    invalid_bytes = (directory / 'wrong-payload-same-size.zip').read_bytes()
    race_path = directory / 'changed-after-zip-close.zip'
    exit_method = zipfile.ZipFile.__exit__
    race = {'case': 'pathname-mutated-after-zip-close', 'expectedAccept': False}
    for label, verifier in [('canonical', canonical.verify), ('independent', independent.verify_zip)]:
        race_path.write_bytes(valid_bytes)
        def replace_on_exit(self, *args):
            result = exit_method(self, *args)
            race_path.write_bytes(invalid_bytes)
            return result
        try:
            zipfile.ZipFile.__exit__ = replace_on_exit
            try:
                receipt = verifier(repository, commit, race_path)
                race[label] = {'accepted': True, 'passed': False, 'receiptArchiveSHA256': receipt['archiveSHA256'],
                               'boundUnverifiedBytes': receipt['archiveSHA256'] == hashlib.sha256(invalid_bytes).hexdigest()}
            except Exception as error:
                race[label] = {'accepted': False, 'passed': True, 'error': type(error).__name__ + ': ' + str(error)}
        finally:
            zipfile.ZipFile.__exit__ = exit_method
    results.append(race)
    summary = {'canonicalSHA256': hashlib.sha256(CANONICAL.read_bytes()).hexdigest(),
               'independentSHA256': hashlib.sha256(independent_path.read_bytes()).hexdigest(),
               'syntheticCommit': commit, 'syntheticRepository': str(repository),
               'successorArchiveCreated': False, 'awsCalls': 0, 'providerCalls': 0,
               'results': results, 'canonicalPassed': sum(r['canonical']['passed'] for r in results),
               'independentPassed': sum(r['independent']['passed'] for r in results), 'total': len(results)}
    (ROOT / 'adversarial-results.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps({key: value for key, value in summary.items() if key != 'results'}, indent=2))
    print(json.dumps([row for row in results if not row['canonical']['passed']], indent=2))


if __name__ == '__main__':
    main()
