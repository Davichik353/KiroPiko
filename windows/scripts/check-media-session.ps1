# Read-only Windows media API probe. Does not play, pause or change volume.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
if ($null -eq $asTask) { throw 'Windows Runtime async bridge is unavailable.' }
$operation = $managerType::RequestAsync()
$task = $asTask.MakeGenericMethod($managerType).Invoke($null, @($operation))
if (-not $task.Wait(5000)) { throw 'Windows media API did not answer within 5 seconds.' }
$manager = $task.Result
$current = $manager.GetCurrentSession()
$sessions = @($manager.GetSessions() | ForEach-Object {
    [pscustomobject]@{
        source = $_.SourceAppUserModelId
        status = [string]$_.GetPlaybackInfo().PlaybackStatus
        canShuffle = $_.GetPlaybackInfo().Controls.IsShuffleEnabled
        canRepeat = $_.GetPlaybackInfo().Controls.IsRepeatEnabled
        shuffle = $_.GetPlaybackInfo().IsShuffleActive
        repeat = [string]$_.GetPlaybackInfo().AutoRepeatMode
    }
})
[pscustomobject]@{
    apiAccessible = $true
    sessions = $sessions
    currentSessionDetected = $null -ne $current
    currentSource = if ($null -ne $current) { $current.SourceAppUserModelId } else { $null }
    currentStatus = if ($null -ne $current) { [string]$current.GetPlaybackInfo().PlaybackStatus } else { $null }
    note = 'Read-only probe. Playback buttons and the Rust backend were not tested.'
} | ConvertTo-Json -Compress
