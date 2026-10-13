import datetime, json, subprocess, sys
from pathlib import Path

directory, name, *command = sys.argv[1:]
out = Path(directory)
out.mkdir(parents=True, exist_ok=True)
log = out / (name + '.log')
receipt = out / (name + '-execution.json')
if log.exists() or receipt.exists():
    raise SystemExit('Choose a fresh gate name; existing evidence is never overwritten.')
git = lambda *args: subprocess.check_output(['git', *args], text=True).strip()
result = {'head': git('rev-parse', 'HEAD'), 'tree': git('rev-parse', 'HEAD^{tree}'),
          'statusAtStart': git('status', '--porcelain'), 'command': command,
          'startedAt': datetime.datetime.now(datetime.UTC).isoformat(), 'state': 'running'}
receipt.write_text(json.dumps(result, indent=2) + '\n')
with log.open('x') as stream:
    process = subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT)
result.update(state='finished', exitCode=process.returncode,
              finishedAt=datetime.datetime.now(datetime.UTC).isoformat(),
              headAtFinish=git('rev-parse', 'HEAD'), statusAtFinish=git('status', '--porcelain'))
receipt.write_text(json.dumps(result, indent=2) + '\n')
raise SystemExit(process.returncode)
