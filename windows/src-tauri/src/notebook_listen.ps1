$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Speech
$installed = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
if ($installed.Count -eq 0) { throw 'Install a Windows speech language pack first.' }
$preferred = $installed | Where-Object { $_.Culture.Name -eq [System.Globalization.CultureInfo]::CurrentUICulture.Name } | Select-Object -First 1
if ($null -eq $preferred) { $preferred = $installed[0] }
$engine = [System.Speech.Recognition.SpeechRecognitionEngine]::new($preferred)
try {
    $engine.LoadGrammar([System.Speech.Recognition.DictationGrammar]::new())
    $engine.SetInputToDefaultAudioDevice()
    [Console]::WriteLine((@{language=$preferred.Culture.Name} | ConvertTo-Json -Compress))
    $deadline = [DateTime]::UtcNow.AddMinutes(30)
    while ([DateTime]::UtcNow -lt $deadline -and !(Test-Path -LiteralPath $env:KIRO_NOTEBOOK_STOP)) {
        if ($null -eq (Get-Process -Id ([int]$env:KIRO_NOTEBOOK_PARENT) -ErrorAction SilentlyContinue)) { break }
        $result = $engine.Recognize([TimeSpan]::FromSeconds(3))
        if ($null -ne $result) { [Console]::WriteLine((@{text=$result.Text} | ConvertTo-Json -Compress)) }
    }
} finally { $engine.Dispose() }
