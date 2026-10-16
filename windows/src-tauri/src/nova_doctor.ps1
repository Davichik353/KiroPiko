$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$os = Get-CimInstance Win32_OperatingSystem -OperationTimeoutSec 5
$cpuPercent = $null
try {
    $cpu = @(Get-CimInstance Win32_Processor -OperationTimeoutSec 5)
    $loads = @($cpu | Where-Object { $null -ne $_.LoadPercentage })
    if ($loads.Count -gt 0) { $cpuPercent = [double]($loads | Measure-Object LoadPercentage -Average).Average }
} catch {}
$disks = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' -OperationTimeoutSec 5 | ForEach-Object {
    @{ name = $_.DeviceID; totalBytes = [double]$_.Size; freeBytes = [double]$_.FreeSpace }
})
$networkConnected = $null
try {
    $adapters = @(Get-CimInstance Win32_NetworkAdapter -Filter 'NetConnectionStatus=2' -OperationTimeoutSec 5)
    $networkConnected = $adapters.Count -gt 0
} catch {}
@{
    capturedAt = [DateTime]::UtcNow.ToString('o')
    cpuPercent = $cpuPercent
    memoryTotalBytes = [double]$os.TotalVisibleMemorySize * 1024
    memoryFreeBytes = [double]$os.FreePhysicalMemory * 1024
    disks = $disks
    networkConnected = $networkConnected
    os = $os.Caption
} | ConvertTo-Json -Compress -Depth 4
