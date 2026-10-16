$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Speech
$installed = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
if ($installed.Count -eq 0) { throw 'No offline speech recognizer installed. Install a Windows speech language pack.' }
$preferred = $installed | Where-Object { $_.Culture.Name -eq [System.Globalization.CultureInfo]::CurrentUICulture.Name } | Select-Object -First 1
if ($null -eq $preferred) { $preferred = $installed[0] }
$engine = [System.Speech.Recognition.SpeechRecognitionEngine]::new($preferred)
try {
    $engine.LoadGrammar([System.Speech.Recognition.DictationGrammar]::new())
    $engine.SetInputToDefaultAudioDevice()
    $result = $engine.Recognize([TimeSpan]::FromSeconds(8))
    if ($null -eq $result) { throw 'Speech was not recognized. Try again, using the installed Windows speech language.' }
    [Console]::Write($result.Text)
} finally { $engine.Dispose() }
