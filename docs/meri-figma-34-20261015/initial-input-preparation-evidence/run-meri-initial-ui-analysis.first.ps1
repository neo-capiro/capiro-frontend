param([ValidateSet('format','structure')][string]$Stage)
$ErrorActionPreference = 'Stop'
$initialUiRoot = 'C:\Users\neoma\Documents\Codex\2026-10-15\task-7\meri-ui-initial-input'
$initialUiEvidence = 'C:\Users\neoma\Documents\Codex\2026-10-15\task-7\evidence'
$initialUiBefore = (& python (Join-Path $initialUiEvidence 'history-memory.py')) | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $initialUiBefore.availableMiB -lt 768 -or $initialUiBefore.commitHeadroomMiB -lt 768) { throw 'Fresh light-analysis capacity unavailable; no Node launched' }
$initialUiArgs = @('--max-old-space-size=256','../evidence/check-meri-initial-ui-structure.mjs')
if ($Stage -eq 'format') {
  $initialUiFiles = @(& git -C $initialUiRoot diff --name-only) + @(& git -C $initialUiRoot ls-files --others --exclude-standard)
  $initialUiFiles = @($initialUiFiles | Where-Object { $_ -match '^apps/web/.*\.(ts|tsx)$' })
  $initialUiArgs = @('--max-old-space-size=128','../meri-ui-input/node_modules/prettier/bin/prettier.cjs','--write') + $initialUiFiles
}
$initialUiInfo = [System.Diagnostics.ProcessStartInfo]::new('C:\Program Files\nodejs\node.exe')
$initialUiInfo.WorkingDirectory = $initialUiRoot
$initialUiInfo.CreateNoWindow = $true
$initialUiInfo.UseShellExecute = $false
$initialUiInfo.RedirectStandardOutput = $true
$initialUiInfo.RedirectStandardError = $true
foreach ($initialUiArg in $initialUiArgs) { $initialUiInfo.ArgumentList.Add($initialUiArg) }
$initialUiStart = [DateTimeOffset]::UtcNow
$initialUiProcess = [System.Diagnostics.Process]::Start($initialUiInfo)
$initialUiStdout = $initialUiProcess.StandardOutput.ReadToEndAsync()
$initialUiStderr = $initialUiProcess.StandardError.ReadToEndAsync()
$initialUiPeak = 0L
$initialUiTimeout = $false
while (-not $initialUiProcess.WaitForExit(200)) {
  $initialUiProcess.Refresh()
  if (-not $initialUiProcess.HasExited) { $initialUiPeak = [Math]::Max($initialUiPeak,$initialUiProcess.WorkingSet64) }
  if (([DateTimeOffset]::UtcNow-$initialUiStart).TotalSeconds -ge 60) { $initialUiTimeout=$true; $initialUiProcess.Kill($true); $initialUiProcess.WaitForExit(); break }
}
[System.IO.File]::WriteAllText((Join-Path $initialUiEvidence "initial-ui-$Stage.stdout.log"),$initialUiStdout.GetAwaiter().GetResult())
[System.IO.File]::WriteAllText((Join-Path $initialUiEvidence "initial-ui-$Stage.stderr.log"),$initialUiStderr.GetAwaiter().GetResult())
$initialUiReceipt = [ordered]@{stage=$Stage;argv=$initialUiArgs;outerDeadlineSeconds=60;freshNormalMemory=$initialUiBefore;pid=$initialUiProcess.Id;startedAt=$initialUiStart.ToString('o');endedAt=[DateTimeOffset]::UtcNow.ToString('o');exit=$initialUiProcess.ExitCode;terminal=$initialUiProcess.HasExited;timeout=$initialUiTimeout;sampledPeakWorkingSetBytes=$initialUiPeak;compilerBrowserInstallDatabaseProvider=$false;sourceAnalysisOnly=$true}
$initialUiReceipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $initialUiEvidence "initial-ui-$Stage.result.json") -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $initialUiEvidence "initial-ui-$Stage.stdout.log")
Get-Content -LiteralPath (Join-Path $initialUiEvidence "initial-ui-$Stage.stderr.log")
$initialUiReceipt | ConvertTo-Json -Depth 6
if ($initialUiTimeout) { exit 125 }
exit $initialUiProcess.ExitCode
