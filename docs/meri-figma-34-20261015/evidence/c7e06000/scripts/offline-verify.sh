#!/bin/bash
# Evidence copy: as run, with the host worktree path replaced by <worktree> and the scratch path by <scratch>.
# Usage: offline-verify.sh COMMIT RECEIPT_JSON DEP_TARBALL WORKDIR
# Builds a fresh workspace from `git archive COMMIT packages/ui packages/qualification-elements`,
# extracts only the bound dependency files as node_modules, and runs canonical verifySSRReceipt.
set -eu
C=$1; R=$2; TB=$3; W=$4
export PATH=/opt/nvm/versions/node/v24.21.0/bin:$PATH
mkdir "$W"; mkdir "$W/node_modules"
git -C <worktree> archive "$C" packages/ui packages/qualification-elements | tar -x -C "$W"
tar -xzf "$TB" -C "$W/node_modules"
SHA=$(sha256sum "$R" | cut -d' ' -f1)
echo "commit=$C receipt_sha256=$SHA workspace_files=$(find "$W/packages" -type f | wc -l) dependency_files=$(find "$W/node_modules" -type f | wc -l)"
cd "$W/packages/qualification-elements"
node --input-type=module -e "
import { verifySSRReceipt } from './ssr-build.mjs';
const r = verifySSRReceipt({ receiptPath: process.argv[1], expectedSha256: process.argv[2] });
console.log(JSON.stringify({ verifySSRReceipt: 'passed', node: r.receipt.node, sources: r.receipt.sources.length, inputs: r.receipt.inputs.length, dependencies: r.receipt.dependencies.length, outputs: r.receipt.outputs.map(x => x.path + ':' + x.sha256) }));
" "$R" "$SHA"
