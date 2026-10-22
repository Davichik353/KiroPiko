param(
  [ValidateSet('codex','cursor','claude')][string]$Agent,
  [ValidateSet('status','login','open','test')][string]$Action='status'
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
# Only the official CLI handles credentials. Never read auth files or return raw output.
$result=[ordered]@{agent=$Agent;found=$false;authenticated=$null;mode='unknown';state='missing';at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();duration=0}
function Quote-PS([string]$value) { return "'"+$value.Replace("'","''")+"'" }
function Stop-Tree($process) {
  try { & "$env:SystemRoot\System32\taskkill.exe" /T /F /PID $process.Id 2>$null | Out-Null } catch {}
  try { if(!$process.HasExited){$process.Kill()};$process.WaitForExit() } catch {}
}
function Run-Cli([string[]]$Arguments,[int]$Seconds=12,[string]$Directory=$env:TEMP) {
  $script='& '+(Quote-PS $script:exe)+' '+(($Arguments | ForEach-Object {Quote-PS $_}) -join ' ')+'; exit $LASTEXITCODE'
  $info=New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName="$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $info.Arguments='-NoLogo -NoProfile -NonInteractive -EncodedCommand '+[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
  $info.WorkingDirectory=$Directory;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
  $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
  # This connection is explicitly for account login, never inherited API billing.
  foreach($name in @('OPENAI_API_KEY','CODEX_API_KEY','ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','CLAUDE_CODE_OAUTH_TOKEN','CURSOR_API_KEY')){$info.EnvironmentVariables.Remove($name)}
  $process=New-Object System.Diagnostics.Process;$process.StartInfo=$info
  if(!$process.Start()){throw 'start-failed'}
  $stdout=$process.StandardOutput.ReadToEndAsync();$stderr=$process.StandardError.ReadToEndAsync()
  try {
    if(!$process.WaitForExit($Seconds*1000)){Stop-Tree $process;throw 'timeout'}
    $text=$stdout.GetAwaiter().GetResult()+"`n"+$stderr.GetAwaiter().GetResult()
    if($text.Length -gt 262144){throw 'output-too-large'}
    return @{code=$process.ExitCode;text=$text}
  } finally {$process.Dispose()}
}
try {
  $names=switch($Agent){'codex'{@('codex.exe','codex.cmd')};'cursor'{@('cursor-agent.exe','cursor-agent.cmd','agent.exe','agent.cmd')};'claude'{@('claude.exe','claude.cmd')}}
  $candidates=New-Object 'System.Collections.Generic.List[string]'
  foreach($name in $names){foreach($command in @(Get-Command $name -CommandType Application -ErrorAction SilentlyContinue)){if($command.Source){$candidates.Add($command.Source)}}}
  foreach($dir in @("$env:USERPROFILE\.local\bin","$env:APPDATA\npm","$env:LOCALAPPDATA\Microsoft\WinGet\Links")){
    foreach($name in $names){$path=Join-Path $dir $name;if(Test-Path -LiteralPath $path -PathType Leaf){$candidates.Add($path)}}
  }
  if($Agent -eq 'codex'){
    $root=Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
    if(Test-Path -LiteralPath $root){foreach($dir in @(Get-ChildItem -LiteralPath $root -Directory | Sort-Object LastWriteTime -Descending)){
      $path=Join-Path $dir.FullName 'codex.exe';if(Test-Path -LiteralPath $path -PathType Leaf){$candidates.Add($path)}
    }}
  }
  $exe=$null;$matched=$false
  foreach($candidate in @($candidates | Select-Object -Unique)) {
    $script:exe=$candidate
    try {
      $identity=Run-Cli $(if($Agent -eq 'cursor'){@('--help')}else{@('--version')})
      $pattern=switch($Agent){'codex'{'codex-cli'};'cursor'{'Cursor Agent|cursor\.com|Cursor CLI'};'claude'{'Claude Code'}}
      if($identity.code -eq 0 -and $identity.text -match $pattern){$exe=$candidate;$matched=$true;break}
    }catch{}
  }
  if(!$matched){$result | ConvertTo-Json -Compress;exit 0}
  $result.found=$true;$result.state='unknown'
  $arguments=switch($Agent){'codex'{@('login','status')};'cursor'{@('status')};'claude'{@('auth','status')}}
  $status=Run-Cli $arguments
  if($Agent -eq 'claude'){
    try {
      $auth=$status.text.Trim() | ConvertFrom-Json
      if($auth.loggedIn -eq $true -and $auth.authMethod -eq 'claude.ai'){$result.authenticated=$true;$result.mode='account'}
      elseif($auth.loggedIn -eq $false){$result.authenticated=$false}
      elseif($auth.authMethod -in @('api_key','api_key_helper','third_party','oauth_token')){$result.mode='other'}
    }catch{}
  }elseif($status.text -match '(?i)not (logged in|authenticated)|logged out|unauthenticated'){$result.authenticated=$false}
  elseif($Agent -eq 'codex' -and $status.code -eq 0 -and $status.text -match 'Logged in using ChatGPT'){$result.authenticated=$true;$result.mode='account'}
  elseif($status.text -match '(?i)api.?key'){$result.mode='other'}
  elseif($Agent -eq 'cursor' -and $status.code -eq 0 -and $status.text -match '(?i)logged in|authenticated as'){$result.authenticated=$true;$result.mode='account'}
  $result.state=if($result.authenticated -eq $true){'signed-in'}elseif($result.authenticated -eq $false){'signed-out'}elseif($result.mode -eq 'other'){'other-auth'}else{'unknown'}
  if($Action -eq 'open' -and !($result.authenticated -eq $true -and $result.mode -eq 'account')){$result.state='account-required'}
  elseif($Action -in @('login','open')){
    $arguments=if($Action -eq 'open'){@()}elseif($Agent -eq 'claude'){@('auth','login')}else{@('login')}
    $script="foreach(`$name in @('OPENAI_API_KEY','CODEX_API_KEY','ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','CLAUDE_CODE_OAUTH_TOKEN','CURSOR_API_KEY')){Remove-Item -LiteralPath ('Env:'+`$name) -ErrorAction SilentlyContinue}; & "+(Quote-PS $exe)+' '+(($arguments | ForEach-Object {Quote-PS $_}) -join ' ')
    $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
    # The user requested an interactive official login/session; keep this terminal visible.
    Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList @('-NoLogo','-NoProfile','-NoExit','-EncodedCommand',$encoded) -WorkingDirectory $env:USERPROFILE -WindowStyle Normal | Out-Null
    $result.state=if($Action -eq 'login'){'login-opened'}else{'session-opened'}
  }elseif($Action -eq 'test'){
    if($result.authenticated -ne $true -or $result.mode -ne 'account'){$result.state='account-required'}
    elseif($Agent -eq 'cursor'){
      # Cursor CLI versions vary; do not silently run an unrestricted agent as a ping.
      $result.state='test-in-terminal'
    }else{
      $directory=Join-Path $env:TEMP ('KiroPiko-connection-'+[Guid]::NewGuid().ToString('N'))
      [IO.Directory]::CreateDirectory($directory) | Out-Null
      $prompt='Connection test. Reply only with KIRO_OK. Do not use tools, browse, or read any files.'
      $arguments=if($Agent -eq 'codex'){@('exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--json',$prompt)}else{@('-p',$prompt,'--tools','','--disallowedTools','mcp__*','--no-session-persistence','--setting-sources','','--output-format','json')}
      $watch=[Diagnostics.Stopwatch]::StartNew()
      try{
        $answer=Run-Cli $arguments 45 $directory
        $result.duration=$watch.ElapsedMilliseconds
        $ok=$false
        foreach($line in $answer.text -split "`n"){
          try{
            $event=$line | ConvertFrom-Json
            if($Agent -eq 'codex' -and $event.type -eq 'item.completed' -and $event.item.type -eq 'agent_message' -and $event.item.text.Trim() -eq 'KIRO_OK'){$ok=$true}
            if($Agent -eq 'claude' -and $event.type -eq 'result' -and !$event.is_error -and $event.result.Trim() -eq 'KIRO_OK'){$ok=$true}
          }catch{}
        }
        $result.state=if($answer.code -eq 0 -and $ok){'reply-ok'}else{'test-failed'}
      }catch{$result.state=if($_.Exception.Message -eq 'timeout'){'timeout'}else{'test-failed'}}
      finally{
        # Delete only our empty temporary directory; never recursively remove agent-created files.
        try{[IO.Directory]::Delete($directory,$false)}catch{}
      }
    }
  }
}catch{$result.state=if($_.Exception.Message -eq 'timeout'){'timeout'}else{'check-failed'}}
$result.at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$result | ConvertTo-Json -Compress
