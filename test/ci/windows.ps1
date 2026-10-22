# CI on Windows (plan section 6, step 13; release prep items 2, 7 and 10): meme.exe on a
# Windows without WSL, reading a Claude Code and a Codex session, and how long
# it takes; then install.ps1 run as a user runs it, in both PowerShells.
#   pwsh -File test/ci/windows.ps1 -Dist dist
param([Parameter(Mandatory = $true)] [string]$Dist)
$ErrorActionPreference = 'Stop'

$Dist = (Resolve-Path $Dist).Path
$exe = Join-Path $Dist 'meme-windows-x64.exe'
$work = Join-Path $env:RUNNER_TEMP 'meme-ci'

function Meme([string[]]$Arguments) {
  $out = & $exe @Arguments 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw "meme $($Arguments -join ' ') exited with $LASTEXITCODE`n$out" }
  return $out
}
function Expect([string]$Text, [string]$Want) {
  if (-not $Text.Contains($Want)) { throw "expected '$Want' in:`n$Text" }
}

# Sessions in a home folder of their own.
$env:USERPROFILE = Join-Path $work 'home'
$env:MEME_HOME = Join-Path $work 'data'
New-Item -ItemType Directory -Force -Path $env:USERPROFILE | Out-Null
bun test/ci/sessions.ts $env:USERPROFILE
if ($LASTEXITCODE -ne 0) { throw 'could not write the sessions' }

Expect (Meme @('--version')) 'meme 0.1.0'
$ls = Meme @('ls', '-a')
Write-Host $ls
Expect $ls 'aaaa1111'
Expect $ls 'bbbb2222'
Expect (Meme @('show', 'aaaa1111')) 'Status line'
Expect (Meme @('search', 'status line', '-i', '-a')) 'aaaa1111'
Expect (Meme @('continue', 'aaaa1111', '--plain')) '# Handoff:'
Write-Host (Meme @('status'))

# Item 7: what WSL costs where it is not installed. A new mirror each time for the first run.
$wsl = Get-Command wsl -ErrorAction SilentlyContinue
$own = Test-Path (Join-Path $env:ProgramFiles 'WSL\wsl.exe')
Write-Host "wsl.exe on PATH: $([bool]$wsl); WSL's own wsl.exe: $own"
foreach ($c in @('ls', 'status')) {
  $env:MEME_HOME = Join-Path $work "time-$c"
  $first = (Measure-Command { Meme @($c) | Out-Null }).TotalMilliseconds
  $next = @(1..5 | ForEach-Object { (Measure-Command { Meme @($c) | Out-Null }).TotalMilliseconds } | Sort-Object)[2]
  Write-Host ("meme {0}: first run {1:N0} ms, then {2:N0} ms (median of 5)" -f $c, $first, $next)
}
$env:MEME_HOME = Join-Path $work 'data'

# Item 2: install.ps1 from this build, as `irm ... | iex` runs it.
$sums = Get-ChildItem -Path $Dist -Filter 'meme-windows-*.exe' | ForEach-Object { '{0}  {1}' -f (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLower(), $_.Name }
Set-Content -Path (Join-Path $Dist 'SHA256SUMS') -Value $sums -Encoding ascii
$env:MEME_FROM = $Dist
$script = (Resolve-Path 'install.ps1').Path

# Windows PowerShell 5.1, PATH included: the runner is thrown away afterwards.
$env:MEME_INSTALL_DIR = Join-Path $work 'bin51'
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Raw -LiteralPath '$script' | Invoke-Expression"
if ($LASTEXITCODE -ne 0) { throw "install.ps1 in Windows PowerShell exited with $LASTEXITCODE" }
& (Join-Path $env:MEME_INSTALL_DIR 'meme.exe') --version
$key = Get-Item 'HKCU:\Environment'
$path = $key.GetValue('Path', '', 'DoNotExpandEnvironmentNames')
if (-not ($path -split ';' -contains $env:MEME_INSTALL_DIR)) { throw "install.ps1 did not put $env:MEME_INSTALL_DIR on the user's PATH: $path" }
if ($key.GetValueKind('Path') -ne 'ExpandString') { throw "the user's PATH is now a $($key.GetValueKind('Path')), not an ExpandString" }

# PowerShell 7, PATH left alone.
$env:MEME_INSTALL_DIR = Join-Path $work 'bin7'
$env:MEME_NO_MODIFY_PATH = '1'
pwsh -NoProfile -Command "Get-Content -Raw -LiteralPath '$script' | Invoke-Expression"
if ($LASTEXITCODE -ne 0) { throw "install.ps1 in PowerShell 7 exited with $LASTEXITCODE" }
& (Join-Path $env:MEME_INSTALL_DIR 'meme.exe') --version
Write-Host 'Windows checks passed.'
