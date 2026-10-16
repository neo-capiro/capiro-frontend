import datetime, hashlib, json, os, pathlib, tarfile

root = pathlib.Path.cwd()
evidence = root.parent / 'evidence'
archive = root / 'vendor/capiro-meri-contracts-0.1.7.tgz'
sha = lambda raw: hashlib.sha256(raw).hexdigest()
assert sha(archive.read_bytes()) == '8f0c2e1435122c22f2a1ed7427dd744f361bc598e178f2ef842acd6f91b78daa'
copies = [root / 'apps/web/node_modules/@capiro/meri-contracts', root / 'packages/meri-client/node_modules/@capiro/meri-contracts']
records = []
with tarfile.open(archive, mode='r:gz') as packed:
    entries = packed.getmembers()
    assert len(entries) == 35
    for base in copies:
        assert json.loads((base / 'package.json').read_text())['version'] == '0.1.7'
        rows = []
        for item in entries:
            assert item.isfile() and item.name.startswith('package/') and '..' not in pathlib.PurePosixPath(item.name).parts
            name = item.name.removeprefix('package/')
            expected = packed.extractfile(item).read()
            actual = (base / name).read_bytes()
            assert expected == actual, f'Installed contract drift: {base}/{name}'
            rows.append({'path': name, 'bytes': len(actual), 'sha256': sha(actual)})
        records.append({'path': str(base), 'resolved': str(base.resolve(strict=True)), 'rows': rows})
link = root / 'node_modules/@capiro/meri-client'
assert os.path.normcase(str(link.resolve(strict=True))) == os.path.normcase(str((root / 'packages/meri-client').resolve(strict=True)))
assert json.loads((root / 'node_modules/@capiro/meri-contracts/package.json').read_text())['version'] == '0.1.0'
assert sha((root / 'package-lock.json').read_bytes()) == '836ff4f6acde1857c6b66ccafe72d69250f7793a3efa090978f5563bc7dd3149'
result = {'schema': 'meri-input-installed-consumer-byte-binding/1', 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'source': '845cebade818b8ceef1568574662196d813d14d0', 'archiveSha256': sha(archive.read_bytes()), 'consumerCopies': records, 'sdkWorkspaceRealpath': str(link.resolve(strict=True)), 'historicalRootContractVersion': '0.1.0', 'sourceModulesExecuted': False, 'semanticTests': 'UNRUN at this byte check'}
target = evidence / 'input845-installed-consumer-bytes.json'
assert not target.exists()
target.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'receipt': str(target), 'sha256': sha(target.read_bytes()), 'entriesPerCopy': 35, 'physicalCopies': len(records), 'sdkWorkspaceRealpath': result['sdkWorkspaceRealpath'], 'packageCodeExecuted': False}))
