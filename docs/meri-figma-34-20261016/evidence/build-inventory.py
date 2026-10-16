"""Read-only source/design mapping. Does not import app/test code or claim visual acceptance."""
import base64
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

here = Path(__file__).resolve().parent
repo = here.parents[2]
raw_path = here / 'current-page.xml'
metadata_bytes = raw_path.read_bytes() if raw_path.exists() else gzip.decompress((here / 'current-page.xml.gz').read_bytes())
root = ET.fromstring(metadata_bytes)
nodes = {n.attrib['id']: n for n in root.iter() if 'id' in n.attrib}
parents = {c.attrib['id']: n for n in root.iter() for c in n if 'id' in c.attrib}
meri = nodes['1064:143194']
meri_ids = {n.attrib.get('id') for n in meri.iter()}
fixtures = {}
for path in sorted((repo / 'apps/web/src/features/meri/fixtures/screens').glob('*.ts*')):
    text = path.read_text(encoding='utf-8')
    imports = {}
    for match in re.finditer(r'import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+[\"\']([^\"\']+)[\"\']', text, re.S):
        for item in (match[1] or match[2]).split(','):
            name = item.strip().removeprefix('type ').split(' as ')[-1].strip()
            if name:
                imports[name] = match[3]
    for match in re.finditer(r'\{\s*slug:\s*[\"\']([^\"\']+)[\"\'](?P<body>.*?)\n\s*\}', text, re.S):
        body = match['body']
        def field(name):
            m = re.search(r'\b' + name + r':\s*[\"\']([^\"\']+)[\"\']', body)
            return m[1] if m else None
        node = field('figmaNode')
        if not node:
            continue
        screen = re.search(r'\bScreen:\s*([^\n]+)', body)
        screen_text = screen[1].strip().rstrip(',') if screen else None
        symbols = re.findall(r'\b[A-Z]\w+', screen_text or '')
        targets = []
        for name in symbols:
            if name in imports and imports[name].startswith('.'):
                base = path.parent / imports[name]
                candidates = [Path(str(base) + ext) for ext in ['.tsx', '.ts']]
                targets.extend(p.relative_to(repo).as_posix() for p in candidates if p.is_file())
        fixtures.setdefault(node, []).append({'slug': match[1], 'figmaId': field('figmaId'),
            'title': field('title'), 'registryPath': path.relative_to(repo).as_posix(),
            'screenExpression': screen_text, 'directComponentPaths': sorted(set(targets))})

candidate_ids = set(fixtures)
for n in meri.iter():
    a = n.attrib
    if n.tag != 'frame':
        continue
    parent = parents.get(a['id'])
    if parent is None:
        continue
    name = a.get('name', '')
    if parent.attrib.get('id') == '1064:143240' and re.match(r'^\d{2}\.\d{2}', name):
        candidate_ids.add(a['id'])
    if parent.attrib.get('id') in ['1064:151091', '1064:152952', '1064:150329', '1064:150613']:
        candidate_ids.add(a['id'])

browser_text = {p.relative_to(repo).as_posix(): p.read_text(encoding='utf-8')
                for p in (repo / 'apps/web/test').rglob('*.spec.ts')}
rows = []
for node_id in sorted(candidate_ids, key=lambda s: tuple(map(int, s.split(':')))):
    node = nodes.get(node_id)
    refs = fixtures.get(node_id, [])
    if node is None:
        rows.append({'nodeId': node_id, 'status': 'REGISTERED NODE NOT PRESENT IN CURRENT PAGE READ', 'fixtures': refs})
        continue
    a = node.attrib
    width, height = float(a.get('width', 0)), float(a.get('height', 0))
    parent = parents.get(node_id)
    labels = [n.attrib.get('name', '') for n in node.iter() if n.tag == 'text']
    name = a.get('name', '')
    viewport = 'mobile-deferred' if width < 600 and re.search(r'phone|mobile|^10\.', name, re.I) else 'tablet-reference' if width == 1024 else 'desktop' if width >= 1200 else 'desktop-overlay-or-setup'
    matching_tests = sorted({p for p, t in browser_text.items() if any(ref['slug'] in t for ref in refs)})
    rows.append({'nodeId': node_id, 'name': name, 'width': width, 'height': height,
        'parentId': parent.attrib.get('id') if parent is not None else None,
        'figmaUrl': f'https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id={node_id.replace(":", "-")}',
        'viewport': viewport, 'fixtures': refs, 'currentLabels': labels,
        'currentTextFingerprint': hashlib.sha256(json.dumps(labels, ensure_ascii=False).encode()).hexdigest(),
        'directBrowserReferencePaths': matching_tests,
        'status': 'MAPPED SOURCE ONLY; VISUAL/BEHAVIOR COMPARISON PENDING' if refs else 'UNMAPPED CURRENT DESIGN NODE; INVESTIGATE',
        'acceptance': ['Current high-fidelity design context and screenshot before editing',
                       'Desktop rendered geometry/assets and keyboard interaction at exact frame viewport',
                       'Loading/empty/error/permission/uncertainty states preserve authoritative API behavior',
                       'Synthetic fixture acceptance does not qualify live service'],
    })

components = [{'nodeId': n.attrib['id'], 'name': n.attrib.get('name'), 'type': n.tag,
               'parentId': parents[n.attrib['id']].attrib['id'], 'width': n.attrib.get('width'),
               'height': n.attrib.get('height')}
              for n in meri.iter() if n.tag in ['symbol']]
summary = {'source': '8c50fc49ee1f125bd841d3eb3b8959d7d5daec45',
    'fileKey': 'IXJzJUkXcUTkySHir5JNea', 'capturedDate': '2026-10-16',
    'method': 'Actual current page XML plus static registry/import/test-source inspection; not visual equality or runtime execution.',
    'currentMetadataSha256': hashlib.sha256(metadata_bytes).hexdigest(),
    'rows': rows, 'registeredNodeCount': len(fixtures), 'catalogCount': len(rows),
    'unmappedCurrentNodes': [r['nodeId'] for r in rows if not r.get('fixtures')],
    'missingRegisteredNodes': [r['nodeId'] for r in rows if r['nodeId'] not in nodes],
    'localComponentSymbols': components,
    'unchangedDesignClaim': False, 'completedVisualAcceptance': False}
(here.parent / 'CURRENT-INVENTORY.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

# Preserve the actual screenshot as its own PNG, without base64 in the readable context record.
context_path = here / 'home-design-context.json'
context = json.loads(context_path.read_text(encoding='utf-8'))
images = [c for c in context['result']['content'] if c.get('type') == 'image']
for index, content in enumerate(images):
    image_path = here / f'home-design-target-{index}.png'
    image_path.write_bytes(base64.b64decode(content['data']))
    content.clear()
    content.update({'type': 'retained-image', 'path': image_path.name,
                    'sha256': hashlib.sha256(image_path.read_bytes()).hexdigest()})
if images:
    context_path.write_text(json.dumps(context, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({k: summary[k] for k in ['registeredNodeCount', 'catalogCount', 'missingRegisteredNodes', 'unmappedCurrentNodes']}, ensure_ascii=False))

# These two actual entry screens deliberately live outside the generic fixture registry.
manual = {
 '1064:144075': ['apps/web/src/features/meri/fixtures/MeriHomeFixture.tsx', 'apps/web/src/features/meri/MeriHome.tsx', 'apps/web/src/features/meri/MeriSuggestions.tsx', 'apps/web/src/features/meri/MeriComposer.tsx'],
 '1064:144239': ['apps/web/src/features/meri/MeriCitedAnswer.tsx'],
 '1064:150601': ['apps/web/src/features/meri/screens/artifacts/DocumentOverlays.tsx'],
 '1064:150603': ['apps/web/src/features/meri/screens/artifacts/DocumentOverlays.tsx'],
 '1064:150607': ['apps/web/src/features/meri/screens/artifacts/DocumentComments.tsx', 'apps/web/src/features/meri/screens/artifacts/useCommentThread.ts'],
 '1064:150609': ['apps/web/src/features/meri/screens/artifacts/DocumentOverlays.tsx'],
 '3034:38179': ['apps/web/src/features/meri/MeriCitedAnswer.tsx', 'apps/web/src/features/meri/screens/sources/CopyToast.tsx'],
}
prototype = json.loads((here / 'current-prototype-patterns.json').read_text(encoding='utf-8'))
screen_indices = {r[0]: i for i, r in enumerate(prototype['screens'])}
for r in rows:
    node = r['nodeId']
    r['codePaths'] = sorted(set(manual.get(node, []) + [ref['registryPath'] for ref in r.get('fixtures', [])] +
                                [p for ref in r.get('fixtures', []) for p in ref['directComponentPaths']]))
    assert all((repo / p).is_file() for p in r['codePaths'])
    r['metadataNameFingerprint'] = r.pop('currentTextFingerprint', None)
    r['metadataLabelLimit'] = 'XML text names can be truncated; not full text, DOM or pixel equality.'
    r['prototypePatternIndices'] = [i for i, pattern in enumerate(prototype['patterns'])
                                   if screen_indices.get(node, -1) in pattern[5]]
    r['plannedDesktopAcceptanceId'] = 'meri-current-desktop:' + node
    r['actualCurrentParity'] = 'DEFERRED' if r.get('viewport') == 'mobile-deferred' else 'UNRUN'
    r['implementationGap'] = 'I05'
    if node in manual:
        r['status'] = 'SOURCE ENTRY/OVERLAY CANDIDATE MAPPED; ACTUAL CURRENT STATE/PARITY UNRUN'
    if node == '1064:150614':
        r['status'] = 'NO REGISTERED CLIENT-CONTEXT ENTRY; IMPLEMENTATION/CONTRACT REVIEW REQUIRED'
summary['unmappedCurrentNodes'] = [r['nodeId'] for r in rows if not r.get('codePaths')]
summary['prototypePatterns'] = len(prototype['patterns'])
summary['prototypeReactionInstances'] = sum(p[3] for p in prototype['patterns'])
summary['prototypeScope'] = 'Full Meri subtree; pattern screen indices identify186numbered standalone roots, including deferred mobile/tablet. Setup/component-only reactions remain in the graph even without a standalone screen index.'
(here.parent / 'CURRENT-INVENTORY.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

lines = ['# Current screen and state map — 16 October 2026', '',
         'All rows come from the actual current Meri page read and source references. A mapped row is not visual or runtime acceptance. Mobile rows are catalogued for completeness and remain deferred. The JSON sibling retains current metadata labels, geometry, prototype pattern indices, source paths, direct browser-source references and a distinct planned acceptance ID for every row.', '',
         '| Frame / state | Current node | Viewport | Code entry / owner | Actual current parity |',
         '| --- | --- | --- | --- | --- |']
for r in rows:
    name = r.get('name', r['nodeId']).replace('|', '\\|')
    owner = '<br>'.join('`' + p + '`' for p in r.get('codePaths', [])) or 'Missing: investigate client-context entry; do not invent its backend.'
    lines.append(f'| {name} | [{r["nodeId"]}]({r.get("figmaUrl", "")}) | {r.get("viewport", "unknown")} | {owner} | {r["actualCurrentParity"]} |')
(here.parent / 'SCREEN-STATE-MAP.md').write_text('\n'.join(lines) + '\n', encoding='utf-8', newline='\n')

# Extract remaining actual design screenshots without re-encoding image pixels.
for path in here.glob('*-design-context.json'):
    context = json.loads(path.read_text(encoding='utf-8'))
    for index, content in enumerate(context['result']['content']):
        if content.get('type') != 'image':
            continue
        image_path = here / (path.stem + f'-{index}.png')
        image_path.write_bytes(base64.b64decode(content['data']))
        content.clear()
        content.update({'type': 'retained-image', 'path': image_path.name,
                        'sha256': hashlib.sha256(image_path.read_bytes()).hexdigest()})
    path.write_text(json.dumps(context, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

compressed = gzip.compress(metadata_bytes, mtime=0)
assert gzip.decompress(compressed) == metadata_bytes
(here / 'current-page.xml.gz').write_bytes(compressed)
if raw_path.exists():
    raw_path.unlink()  # Only this newly captured raw file; exact bytes preserved in deterministic gzip.
print(json.dumps({'catalog':len(rows),'registered':len(fixtures),'unmapped':summary['unmappedCurrentNodes'],
                  'patterns':summary['prototypePatterns'],'reactionInstances':summary['prototypeReactionInstances'],
                  'metadataRawBytes':len(metadata_bytes),'metadataGzipBytes':len(compressed)}))
