param([ValidateSet('install','sdk','sdk-runtime','ui-runtime')] [string]$Stage)
$ErrorActionPreference = 'Stop'
$meri845Released = $false
if (-not $meri845Released) { throw 'HOLD: exact sealed845 sequence awaits Qualification queue release; no process started' }
$meri845Root = 'C:\Users\neoma\Documents\Codex\2026-10-15\task-7\meri-ui-input'
$meri845Evidence = 'C:\Users\neoma\Documents\Codex\2026-10-15\task-7\evidence'
$meri845Source = '845cebade818b8ceef1568574662196d813d14d0'
$meri845Lock = '836ff4f6acde1857c6b66ccafe72d69250f7793a3efa090978f5563bc7dd3149'
$meri845Profile = Get-Content -Raw -LiteralPath (Join-Path $meri845Evidence 'MERI-INPUT-845-CHANGED-RUNTIME-SEALED.json') | ConvertFrom-Json
$meri845Stages = @($meri845Profile.stages)
$meri845Index = [Array]::IndexOf(@($meri845Stages.name),$Stage)
if ($meri845Index -lt 0) { throw 'Unknown sealed stage; no process started' }
$meri845Spec = $meri845Stages[$meri845Index]
if ((& git -C $meri845Root rev-parse HEAD).Trim() -ne $meri845Source) { throw 'Source pin mismatch; no process started' }
if ((Get-FileHash -LiteralPath (Join-Path $meri845Root 'package-lock.json')).Hash.ToLowerInvariant() -ne $meri845Lock) { throw 'Lock mismatch; no process started' }
$meri845Status = @(& git -C $meri845Root status --porcelain)
$meri845Allowed = if ($meri845Index -ge 2) { @(' M packages/meri-client/dist/conversation-client.js') } else { @() }
if (@($meri845Status | Where-Object { $_ -notin $meri845Allowed }).Count) { throw 'Unexpected source delta; no process started' }
$meri845ResultPath = Join-Path $meri845Evidence "input845-$Stage.result.json"
if (Test-Path -LiteralPath $meri845ResultPath) { throw 'Stage already has a terminal receipt; no automatic retry' }
if ($meri845Index -gt 0) {
  $meri845PriorPath = Join-Path $meri845Evidence "input845-$($meri845Stages[$meri845Index-1].name).result.json"
  $meri845Prior = Get-Content -Raw -LiteralPath $meri845PriorPath | ConvertFrom-Json
  if ($meri845Prior.exitCode -ne 0 -or -not $meri845Prior.rootExited -or $meri845Prior.forcedCleanupPids.Count -or $meri845Prior.remainingDirectChildren.Count -or $meri845Prior.monitorFailure -or $meri845Prior.pressureStop -or $meri845Prior.timedOut -or -not $meri845Prior.scopeValid) { throw 'Prior stage not terminal clean0; no process started' }
}
if ($meri845Index -ge 2) {
  $meri845Compiled = Get-Content -Raw -LiteralPath (Join-Path $meri845Evidence 'input845-sdk.result.json') | ConvertFrom-Json
  $meri845Output = (Get-FileHash -LiteralPath (Join-Path $meri845Root 'packages/meri-client/dist/conversation-client.js')).Hash.ToLowerInvariant()
  if ($meri845Compiled.generatedAfterSha256 -ne $meri845Output) { throw 'Compiled runtime identity mismatch; no test process started' }
}
$meri845Memory = (& python (Join-Path $meri845Evidence 'history-memory.py')) | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Normal memory unavailable; no process started' }
$meri845Guard = [ordered]@{at=[DateTimeOffset]::UtcNow.ToString('o');availableMiB=$meri845Memory.availableMiB;commitHeadroomMiB=$meri845Memory.commitHeadroomMiB;requiredStartCommitMiB=$meri845Spec.normalStartCommitMiB;requiredStartPhysicalMiB=$meri845Spec.normalStartPhysicalMiB;remainingFloorMiB=$meri845Spec.remainingFloorMiB}
$meri845Guard | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $meri845Evidence "input845-$Stage.capacity.json") -Encoding utf8NoBOM
if ($meri845Memory.commitHeadroomMiB -lt $meri845Spec.normalStartCommitMiB -or $meri845Memory.availableMiB -lt $meri845Spec.normalStartPhysicalMiB) { throw 'Capacity HOLD; no process started' }
$meri845Working = if ($meri845Spec.cwd) { Join-Path $meri845Root $meri845Spec.cwd } else { $meri845Root }
$meri845BeforeOutput = (Get-FileHash -LiteralPath (Join-Path $meri845Root 'packages/meri-client/dist/conversation-client.js')).Hash.ToLowerInvariant()
$meri845StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
$meri845StartInfo.FileName = 'C:\Program Files\nodejs\node.exe'
$meri845StartInfo.WorkingDirectory = $meri845Working
$meri845StartInfo.UseShellExecute = $false
$meri845StartInfo.CreateNoWindow = $true
$meri845StartInfo.RedirectStandardOutput = $true
$meri845StartInfo.RedirectStandardError = $true
foreach ($meri845Argument in @($meri845Spec.argv | Select-Object -Skip 1)) { $meri845StartInfo.ArgumentList.Add([string]$meri845Argument) }
$meri845StartInfo.Environment['NODE_OPTIONS'] = '--max-old-space-size=' + $(if ($Stage -eq 'ui-runtime') { '384' } else { [string]$meri845Spec.heapMiB })
$meri845StartInfo.Environment['npm_config_cache'] = 'C:\Users\neoma\Documents\Codex\2026-10-15\task-7\npm-cache'
$meri845StartInfo.Environment['npm_config_update_notifier'] = 'false'
$meri845Started = [DateTimeOffset]::UtcNow
$meri845Process = [System.Diagnostics.Process]::Start($meri845StartInfo)
$meri845Process.Id | Set-Content -LiteralPath (Join-Path $meri845Evidence "input845-$Stage.pid")
$meri845Stdout = $meri845Process.StandardOutput.ReadToEndAsync()
$meri845Stderr = $meri845Process.StandardError.ReadToEndAsync()
$meri845Known = @{}
$meri845Samples = @()
$meri845Peak = 0L
$meri845Timeout = $false
$meri845Pressure = $false
$meri845MonitorFailure = $null
try {
  while (-not $meri845Process.WaitForExit(500)) {
    $meri845NowMemory = (& python (Join-Path $meri845Evidence 'history-memory.py')) | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Native normal memory monitor failed' }
    $meri845Snapshot = @(Get-CimInstance Win32_Process -OperationTimeoutSec 3 | Select-Object ProcessId,ParentProcessId,Name,CommandLine)
    $meri845Pids = @($meri845Process.Id)
    do {
      $meri845More = @($meri845Snapshot | Where-Object { $_.ParentProcessId -in $meri845Pids -and $_.ProcessId -notin $meri845Pids } | Select-Object -ExpandProperty ProcessId)
      $meri845Pids += $meri845More
    } while ($meri845More.Count)
    $meri845WorkingBytes = 0L
    foreach ($meri845Pid in $meri845Pids) {
      $meri845Owned = Get-Process -Id $meri845Pid -ErrorAction SilentlyContinue
      if ($meri845Owned) {
        $meri845Command = ($meri845Snapshot | Where-Object ProcessId -eq $meri845Pid | Select-Object -First 1).CommandLine
        if ($meri845Pid -ne $meri845Process.Id -and $meri845Owned.ProcessName -eq 'node' -and ($Stage -ne 'ui-runtime' -or $meri845Command -notmatch '--max-old-space-size=768(?:\s|$)')) { throw 'Unexpected owned Node child/profile; stop stage' }
        $meri845Known[$meri845Pid] = [ordered]@{pid=$meri845Pid;name=$meri845Owned.ProcessName;startedUtcTicks=$meri845Owned.StartTime.ToUniversalTime().Ticks;commandLine=$meri845Command}
        $meri845WorkingBytes += $meri845Owned.WorkingSet64
      }
    }
    $meri845Peak = [Math]::Max($meri845Peak,$meri845WorkingBytes)
    $meri845Samples += [ordered]@{at=[DateTimeOffset]::UtcNow.ToString('o');availableMiB=$meri845NowMemory.availableMiB;commitHeadroomMiB=$meri845NowMemory.commitHeadroomMiB;ownedPids=$meri845Pids;aggregateWorkingSetBytes=$meri845WorkingBytes}
    if ($meri845NowMemory.commitHeadroomMiB -lt $meri845Spec.remainingFloorMiB -or $meri845NowMemory.availableMiB -lt $meri845Spec.remainingFloorMiB) { $meri845Pressure=$true; $meri845Process.Kill($true); $meri845Process.WaitForExit(); break }
    if (([DateTimeOffset]::UtcNow-$meri845Started).TotalSeconds -ge $meri845Spec.hardWallSeconds) { $meri845Timeout=$true; $meri845Process.Kill($true); $meri845Process.WaitForExit(); break }
  }
} catch {
  $meri845MonitorFailure = $_.Exception.Message
  if (-not $meri845Process.HasExited) { $meri845Process.Kill($true); $meri845Process.WaitForExit() }
}
$meri845Forced = @()
foreach ($meri845KnownProcess in $meri845Known.Values) {
  $meri845Remaining = Get-Process -Id $meri845KnownProcess.pid -ErrorAction SilentlyContinue
  if ($meri845Remaining -and $meri845Remaining.StartTime.ToUniversalTime().Ticks -eq $meri845KnownProcess.startedUtcTicks) { $meri845Forced += $meri845KnownProcess.pid; $meri845Remaining.Kill($true); $meri845Remaining.WaitForExit() }
}
$meri845Children = @(Get-CimInstance Win32_Process -OperationTimeoutSec 3 -Filter "ParentProcessId = $($meri845Process.Id)" | Select-Object ProcessId,ParentProcessId,Name)
[System.IO.File]::WriteAllText((Join-Path $meri845Evidence "input845-$Stage.stdout.log"),$meri845Stdout.GetAwaiter().GetResult(),[System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $meri845Evidence "input845-$Stage.stderr.log"),$meri845Stderr.GetAwaiter().GetResult(),[System.Text.UTF8Encoding]::new($false))
$meri845AfterStatus = @(& git -C $meri845Root status --porcelain)
$meri845AfterLock = (Get-FileHash -LiteralPath (Join-Path $meri845Root 'package-lock.json')).Hash.ToLowerInvariant()
$meri845AfterOutput = (Get-FileHash -LiteralPath (Join-Path $meri845Root 'packages/meri-client/dist/conversation-client.js')).Hash.ToLowerInvariant()
$meri845AllowedAfter = if ($meri845Index -ge 1) { @(' M packages/meri-client/dist/conversation-client.js') } else { @() }
$meri845ScopeValid = $meri845AfterLock -eq $meri845Lock -and @($meri845AfterStatus | Where-Object { $_ -notin $meri845AllowedAfter }).Count -eq 0
$meri845Receipt = [ordered]@{source=$meri845Source;stage=$Stage;profileSha256=(Get-FileHash -LiteralPath (Join-Path $meri845Evidence 'MERI-INPUT-845-CHANGED-RUNTIME-SEALED.json')).Hash.ToLowerInvariant();workingDirectory=$meri845Working;argv=$meri845Spec.argv;startedAt=$meri845Started.ToString('o');endedAt=[DateTimeOffset]::UtcNow.ToString('o');rootPid=$meri845Process.Id;exitCode=$meri845Process.ExitCode;rootExited=$meri845Process.HasExited;nodeVersion=(Get-Item 'C:\Program Files\nodejs\node.exe').VersionInfo.ProductVersion;capacity=$meri845Guard;ownedProcesses=@($meri845Known.Values);sampledAggregatePeakWorkingSetBytes=$meri845Peak;memorySamples=$meri845Samples;timedOut=$meri845Timeout;pressureStop=$meri845Pressure;monitorFailure=$meri845MonitorFailure;forcedCleanupPids=$meri845Forced;remainingDirectChildren=$meri845Children;generatedBeforeSha256=$meri845BeforeOutput;generatedAfterSha256=$meri845AfterOutput;afterSourceStatus=$meri845AfterStatus;lockUnchanged=($meri845AfterLock -eq $meri845Lock);scopeValid=$meri845ScopeValid;synthetic=$true;browserNextProviderDatabase=$false;automaticNextStage=$false}
$meri845Receipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $meri845ResultPath -Encoding utf8NoBOM
$meri845Receipt | Select-Object stage,source,rootPid,exitCode,rootExited,sampledAggregatePeakWorkingSetBytes,timedOut,pressureStop,monitorFailure,forcedCleanupPids,remainingDirectChildren,scopeValid,generatedAfterSha256,afterSourceStatus | ConvertTo-Json -Depth 5
if ($meri845Timeout -or $meri845Pressure -or $meri845MonitorFailure -or $meri845Forced.Count -or $meri845Children.Count -or -not $meri845ScopeValid) { exit 125 }
exit $meri845Process.ExitCode
