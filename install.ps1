# Install meme on Windows, in PowerShell:
#
#   irm https://github.com/jordonjill/meme/releases/latest/download/install.ps1 | iex
#
# It downloads meme.exe for this CPU, checks it against the release's
# SHA256SUMS, puts it in %USERPROFILE%\.local\bin, adds that folder to your
# PATH if it is not there yet, and runs `meme install`.
#
#   $env:MEME_VERSION = 'v0.1.0'     that release instead of the latest
#   $env:MEME_INSTALL_DIR = '<dir>'   instead of %USERPROFILE%\.local\bin
#   $env:MEME_NO_MODIFY_PATH = '1'    leave PATH alone
#   $env:MEME_FROM = '<dir>'          take the files from a folder (a build in dist\, say)

function Install-Meme {
  # Run through `iex`, this is the user's own PowerShell: errors are thrown, never `exit`, which would close it.
  $ErrorActionPreference = 'Stop'
  $repo = 'jordonjill/meme'

  # The x64 build needs AVX2; an older CPU gets the baseline build. Windows on Arm runs x64 programs too.
  if (-not ('MemeInstall.Cpu' -as [type])) {
    Add-Type -Namespace MemeInstall -Name Cpu -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(uint feature);'
  }
  $avx2 = [MemeInstall.Cpu]::IsProcessorFeaturePresent(40)
  $file = if ($avx2) { 'meme-windows-x64.exe' } else { 'meme-windows-x64-baseline.exe' }

  $base = if ($env:MEME_VERSION) { "https://github.com/$repo/releases/download/$env:MEME_VERSION" } else { "https://github.com/$repo/releases/latest/download" }
  # MEME_RELEASE_URL: somewhere else, for the tests.
  if ($env:MEME_RELEASE_URL) { $base = $env:MEME_RELEASE_URL }

  $tmp = Join-Path ([IO.Path]::GetTempPath()) ("meme-install-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    $from = if ($env:MEME_FROM) { $env:MEME_FROM } else { $base }
    Write-Host "Downloading $file from $from"
    foreach ($name in @('SHA256SUMS', $file)) {
      $to = Join-Path $tmp $name
      if ($env:MEME_FROM) {
        $src = Join-Path $env:MEME_FROM $name
        if (-not (Test-Path -LiteralPath $src)) { throw "meme install: there is no $name in $env:MEME_FROM" }
        Copy-Item -LiteralPath $src -Destination $to
      } else {
        # Windows PowerShell 5.1 may not offer TLS 1.2 by itself; the progress bar slows a download down tenfold there.
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $progress = $ProgressPreference
        $ProgressPreference = 'SilentlyContinue'
        try {
          Invoke-WebRequest -UseBasicParsing -Uri "$base/$name" -OutFile $to
        } catch {
          throw "meme install: could not download $base/$name ($($_.Exception.Message))"
        } finally {
          $ProgressPreference = $progress
        }
      }
    }

    $want = $null
    foreach ($line in Get-Content -LiteralPath (Join-Path $tmp 'SHA256SUMS')) {
      $parts = $line -split '\s+', 2
      if ($parts.Count -eq 2 -and $parts[1].TrimStart('*') -eq $file) { $want = $parts[0].ToLower() }
    }
    if (-not $want) { throw "meme install: $file is not in SHA256SUMS" }
    $got = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $tmp $file)).Hash.ToLower()
    if ($got -ne $want) { throw "meme install: $file does not match its checksum; nothing was installed" }

    $dir = if ($env:MEME_INSTALL_DIR) { $env:MEME_INSTALL_DIR } else { Join-Path $env:USERPROFILE '.local\bin' }
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $exe = Join-Path $dir 'meme.exe'
    try {
      Move-Item -Force -LiteralPath (Join-Path $tmp $file) -Destination $exe
    } catch {
      throw "meme install: could not write $exe; is meme running? ($($_.Exception.Message))"
    }
    Write-Host "Installed $exe"
  } finally {
    Remove-Item -Recurse -Force -LiteralPath $tmp -ErrorAction SilentlyContinue
  }

  # On the user's PATH: written to the registry as it is kept there (an expandable string,
  # so entries such as %USERPROFILE%\... keep working), then announced to new terminals.
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
  $userPath = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
  $entries = @($userPath -split ';' | Where-Object { $_ } | ForEach-Object { [Environment]::ExpandEnvironmentVariables($_).TrimEnd('\') })
  if ($entries -notcontains $dir.TrimEnd('\')) {
    if ($env:MEME_NO_MODIFY_PATH -eq '1') {
      Write-Host "$dir is not on your PATH; add it to run meme by name."
    } else {
      $new = if ($userPath) { $userPath.TrimEnd(';') + ";$dir" } else { $dir }
      $key.SetValue('Path', $new, [Microsoft.Win32.RegistryValueKind]::ExpandString)
      # Setting any user variable makes Windows tell running programs that the environment changed.
      [Environment]::SetEnvironmentVariable('MEME_INSTALL_REFRESH', '1', 'User')
      [Environment]::SetEnvironmentVariable('MEME_INSTALL_REFRESH', $null, 'User')
      $env:Path = "$dir;$env:Path"
      Write-Host "Added $dir to your PATH. Terminals opened from now on find meme; this one does too."
    }
  }
  $key.Close()

  Write-Host ''
  & $exe install
  if ($LASTEXITCODE -ne 0) { throw "meme install: meme install did not finish; run it again: $exe install" }
}

Install-Meme
