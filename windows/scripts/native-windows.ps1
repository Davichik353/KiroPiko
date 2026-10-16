param(
    # Local install lives on D:; fall back to the classic Program Files path if needed.
    [string]$BuildToolsPath = 'D:\BuildTools',
    [ValidateSet('check', 'test', 'dev', 'build')][string]$Action = 'check'
)
$ErrorActionPreference = 'Stop'
$taskRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $taskRoot '../..'))
$taskVsPath = [System.IO.Path]::GetFullPath($BuildToolsPath)
$taskDevCmd = Join-Path $taskVsPath 'Common7/Tools/VsDevCmd.bat'
if (-not (Test-Path -LiteralPath $taskDevCmd)) {
    $taskFallback = 'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools'
    $taskFallbackCmd = Join-Path $taskFallback 'Common7/Tools/VsDevCmd.bat'
    if ($BuildToolsPath -eq 'D:\BuildTools' -and (Test-Path -LiteralPath $taskFallbackCmd)) {
        $taskVsPath = [System.IO.Path]::GetFullPath($taskFallback)
        $taskDevCmd = $taskFallbackCmd
    } else {
        throw "VsDevCmd.bat не найден: $taskDevCmd. Проверьте путь и завершение установки Build Tools."
    }
}
$taskMsvcRoot = Join-Path $taskVsPath 'VC/Tools/MSVC'
$taskMsvc = Get-ChildItem -LiteralPath $taskMsvcRoot -Directory | Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
if (-not $taskMsvc) { throw 'Не установлен компонент C++ MSVC.' }
foreach ($relative in @('bin/Hostx64/x64/cl.exe', 'bin/Hostx64/x64/link.exe', 'lib/x64/vcruntime.lib')) {
    if (-not (Test-Path -LiteralPath (Join-Path $taskMsvc.FullName $relative))) { throw "Компонент C++ неполный: отсутствует $relative." }
}
$taskCargoCommand = Get-Command cargo.exe -ErrorAction SilentlyContinue
$taskLocalRust = [System.IO.Path]::GetFullPath((Join-Path $taskRepoRoot '.tools/rust'))
$taskCargoCandidates = @()
# Prefer the repo Rust on D: so builds never depend on a full C: drive.
$taskCargoCandidates += (Join-Path $taskLocalRust 'cargo/bin/cargo.exe')
if ($taskCargoCommand) { $taskCargoCandidates += $taskCargoCommand.Source }
$taskCargoCandidates += (Join-Path $env:USERPROFILE '.cargo/bin/cargo.exe')
$taskCargo = $taskCargoCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $taskCargo) { throw 'Cargo не найден. Установите Rust через официальный rustup, затем повторите проверку.' }
# Capture VS variables without printing unrelated environment variables or keys.
if ($taskDevCmd.Contains('"') -or $taskDevCmd.Contains("`n")) { throw 'Недопустимый путь Build Tools.' }
$taskEnvironmentLines = & $env:ComSpec /d /s /c "`"$taskDevCmd`" -no_logo -arch=x64 -host_arch=x64 >nul && set"
if ($LASTEXITCODE -ne 0) { throw 'Не удалось подготовить окружение MSVC.' }
$taskNames = @('Path', 'LIB', 'INCLUDE', 'LIBPATH', 'VCToolsInstallDir', 'WindowsSdkDir', 'WindowsSDKVersion', 'UniversalCRTSdkDir', 'UCRTVersion', 'CARGO_HOME', 'RUSTUP_HOME', 'CARGO_TARGET_DIR', 'TEMP', 'TMP', 'TMPDIR')
$taskOldValues = @{}
foreach ($name in $taskNames) { $taskOldValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    foreach ($line in $taskEnvironmentLines) {
        if ($line -match '^([^=]+)=(.*)$' -and $taskNames -contains $Matches[1]) { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
    }
    $env:Path = "$(Split-Path -Parent $taskCargo);$env:Path"
    # Keep Rust caches, compile output and temp files on the project drive (D:\NOVA).
    $taskTmp = Join-Path $taskRepoRoot '.tmp'
    New-Item -ItemType Directory -Force -Path $taskTmp | Out-Null
    $env:TEMP = $taskTmp
    $env:TMP = $taskTmp
    $env:TMPDIR = $taskTmp
    $env:CARGO_TARGET_DIR = Join-Path $taskRoot 'target'
    $env:CARGO_HOME = Join-Path $taskLocalRust 'cargo'
    $env:RUSTUP_HOME = Join-Path $taskLocalRust 'rustup'
    Push-Location $taskRoot
    try {
        & $taskCargo --version
        if ($Action -in @('check', 'test')) {
            & $taskCargo build --release --locked -p coucou-hook
            if ($LASTEXITCODE -ne 0) { throw 'Не удалось собрать coucou-hook.' }
        }
        switch ($Action) {
            'check' { & $taskCargo check --workspace }
            'test' { & $taskCargo test --workspace }
            'dev' { & npm.cmd run tauri -- dev }
            'build' { & npm.cmd run pack }
        }
        if ($LASTEXITCODE -ne 0) { throw "Нативная команда завершилась с кодом $LASTEXITCODE." }
    } finally { Pop-Location }
} finally {
    foreach ($name in $taskNames) { [Environment]::SetEnvironmentVariable($name, $taskOldValues[$name], 'Process') }
}
