$ErrorActionPreference = 'Stop'
$scheme = 'minitiger-vlc'
$baseDir = Join-Path $env:LOCALAPPDATA 'Minitiger\VLCBridge'
$handlerPath = Join-Path $baseDir 'MinitigerVlcBridge.ps1'
$diagPath = Join-Path $baseDir 'last_bridge_error.txt'
$logPath = Join-Path $baseDir 'bridge_runtime.log'
New-Item -ItemType Directory -Force -Path $baseDir | Out-Null

$handler = @'
param([Parameter(Position=0)][string]$Uri)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.Net.Http

$baseDir = Join-Path $env:LOCALAPPDATA 'Minitiger\VLCBridge'
$diagPath = Join-Path $baseDir 'last_bridge_error.txt'
$logPath = Join-Path $baseDir 'bridge_runtime.log'
$instanceId = [Guid]::NewGuid().ToString('N')
$statePath = Join-Path $baseDir ('active_' + $instanceId + '.txt')
New-Item -ItemType Directory -Force -Path $baseDir | Out-Null

function Write-BridgeDiagnostic([string]$Message) {
    try {
        Set-Content -LiteralPath $diagPath -Value ((Get-Date -Format o) + "`r`n" + $Message) -Encoding UTF8
    } catch {
    }
}

function Write-BridgeRuntime([string]$Message) {
    try {
        Add-Content -LiteralPath $logPath -Value ((Get-Date -Format o) + "  " + $Message) -Encoding UTF8
    } catch {
    }
}

function Stop-StaleMinitigerVlcProcesses {
    try {
        $stateFiles = @(Get-ChildItem -LiteralPath $baseDir -Filter 'active_*.txt' -File -ErrorAction SilentlyContinue)
        foreach ($stateFile in $stateFiles) {
            try {
                $rawPid = (Get-Content -LiteralPath $stateFile.FullName -ErrorAction Stop | Select-Object -First 1)
                $stalePid = 0
                if ([int]::TryParse([string]$rawPid, [ref]$stalePid) -and $stalePid -gt 0) {
                    $staleProcess = Get-Process -Id $stalePid -ErrorAction SilentlyContinue
                    if ($null -ne $staleProcess -and $staleProcess.ProcessName -ieq 'vlc') {
                        Write-BridgeRuntime ("Beende vorherige Minitiger-VLC-Instanz PID=" + $stalePid)
                        Stop-Process -Id $stalePid -Force -ErrorAction SilentlyContinue
                    }
                }
            } catch {
            }
            Remove-Item -LiteralPath $stateFile.FullName -Force -ErrorAction SilentlyContinue
        }
    } catch {
    }
}

Write-BridgeRuntime 'Handler 18.23.1g gestartet.'
Stop-StaleMinitigerVlcProcesses

$bridgeMutex = $null
$bridgeMutexOwned = $false
try {
    $bridgeMutex = New-Object System.Threading.Mutex($false, 'Local\MinitigerVlcBridgePlayback')
    try {
        $bridgeMutexOwned = $bridgeMutex.WaitOne([TimeSpan]::FromSeconds(8))
    } catch [System.Threading.AbandonedMutexException] {
        $bridgeMutexOwned = $true
    }

    if (-not $bridgeMutexOwned) {
        throw 'Eine vorherige Minitiger-VLC-Bridge beendet sich noch. Bitte einen Moment warten und erneut starten.'
    }

    Write-BridgeRuntime 'Bridge-Mutex erhalten.'
} catch {
    Write-BridgeRuntime ("Mutex-Fehler: " + $_.Exception.Message)
    throw
}

function Show-BridgeError([string]$Message) {
    Write-BridgeDiagnostic $Message
    [System.Windows.MessageBox]::Show(
        $Message,
        'Minitiger VLC Bridge',
        'OK',
        'Error'
    ) | Out-Null
}

function Get-VlcPath {
    $candidates = @(
        "$env:ProgramFiles\VideoLAN\VLC\vlc.exe",
        "$env:ProgramFiles(x86)\VideoLAN\VLC\vlc.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    foreach ($regPath in @(
        'HKLM:\SOFTWARE\VideoLAN\VLC',
        'HKLM:\SOFTWARE\WOW6432Node\VideoLAN\VLC',
        'HKCU:\SOFTWARE\VideoLAN\VLC'
    )) {
        try {
            $installDir = (Get-ItemProperty -Path $regPath -ErrorAction Stop).InstallDir
            if ($installDir) {
                $candidate = Join-Path $installDir 'vlc.exe'
                if (Test-Path $candidate) {
                    return $candidate
                }
            }
        } catch {
        }
    }

    return $null
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Loopback,
        0
    )
    try {
        $listener.Start()
        return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    } finally {
        $listener.Stop()
    }
}

function New-BridgePassword {
    return ([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))
}

function Get-VlcHeaders([string]$Password) {
    $bytes = [System.Text.Encoding]::ASCII.GetBytes(":" + $Password)
    return @{
        Authorization = 'Basic ' + [Convert]::ToBase64String($bytes)
    }
}

function Invoke-VlcStatus(
    [int]$Port,
    [string]$Password,
    [string]$Query = ''
) {
    $url = "http://127.0.0.1:$Port/requests/status.json$Query"
    return Invoke-RestMethod `
        -Uri $url `
        -Method Get `
        -Headers (Get-VlcHeaders $Password) `
        -TimeoutSec 2
}

function Invoke-VlcCommand(
    [int]$Port,
    [string]$Password,
    [string]$Command,
    [AllowNull()][object]$Value = $null,
    [string]$ValueName = 'val'
) {
    $query = '?command=' + [System.Uri]::EscapeDataString($Command)
    if ($null -ne $Value) {
        $query += '&' + $ValueName + '=' + [System.Uri]::EscapeDataString([string]$Value)
    }
    try {
        return Invoke-VlcStatus $Port $Password $query
    } catch {
        return $null
    }
}

function Send-PlaybackEvent(
    [string]$EventUrl,
    [string]$State,
    [int]$QueueIndex,
    [long]$PositionTicks,
    [long]$DurationTicks,
    [bool]$IsPaused,
    [AllowNull()][int]$VolumeLevel,
    [bool]$Failed = $false
) {
    $payload = @{
        state = $State
        queueIndex = $QueueIndex
        positionTicks = $PositionTicks
        durationTicks = $DurationTicks
        isPaused = $IsPaused
        volumeLevel = $VolumeLevel
        failed = $Failed
    } | ConvertTo-Json -Compress

    try {
        Invoke-RestMethod `
            -Uri $EventUrl `
            -Method Post `
            -ContentType 'application/json' `
            -Body $payload `
            -TimeoutSec 8 | Out-Null
        return $true
    } catch {
        Write-BridgeDiagnostic ("Playback-Sync Event fehlgeschlagen: " + $_.Exception.Message)
        return $false
    }
}

function Get-VolumeLevel($Status) {
    try {
        $raw = [double]$Status.volume
        if ($raw -lt 0) { return $null }
        return [int][Math]::Max(0, [Math]::Min(100, [Math]::Round(($raw / 256.0) * 100.0)))
    } catch {
        return $null
    }
}

function Convert-ToTicks([object]$Seconds) {
    try {
        return [long]([Math]::Max(0, [double]$Seconds) * 10000000.0)
    } catch {
        return [long]0
    }
}

function Apply-VlcSelections(
    [int]$Port,
    [string]$Password,
    $Item
) {
    Start-Sleep -Milliseconds 600

    if ($null -ne $Item.audioStreamIndex) {
        Invoke-VlcCommand $Port $Password 'audio_track' ([int]$Item.audioStreamIndex) | Out-Null
    }

    if ($null -ne $Item.subtitleStreamIndex) {
        Invoke-VlcCommand $Port $Password 'subtitle_track' ([int]$Item.subtitleStreamIndex) | Out-Null
    }
}

function Wait-VlcReady(
    [int]$Port,
    [string]$Password,
    [System.Diagnostics.Process]$Process,
    [int]$TimeoutSeconds = 15
) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if ($Process.HasExited) {
            throw 'VLC wurde direkt nach dem Start wieder beendet.'
        }
        try {
            $status = Invoke-VlcStatus $Port $Password
            if ($null -ne $status) {
                return $status
            }
        } catch {
        }
        Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $deadline)

    throw 'Die lokale VLC-HTTP-Steuerung konnte nicht erreicht werden.'
}

function Start-FirstVlcItem(
    [string]$VlcPath,
    [int]$Port,
    [string]$Password,
    $Item
) {
    $arguments = @(
        '--no-one-instance',
        '--no-video-title-show',
        '--extraintf=http',
        '--http-host=127.0.0.1',
        "--http-port=$Port",
        "--http-password=$Password"
    )

    $startTicks = [double]$Item.startPositionTicks
    if ($startTicks -gt 0) {
        $startSeconds = [Math]::Floor($startTicks / 10000000.0)
        if ($startSeconds -gt 0) {
            $arguments += "--start-time=$startSeconds"
        }
    }

    $quotedStreamUrl = '"' + ([string]$Item.streamUrl).Replace('"', '\"') + '"'
    $arguments += $quotedStreamUrl

    return Start-Process `
        -FilePath $VlcPath `
        -ArgumentList $arguments `
        -PassThru
}

function Start-QueuedVlcItem(
    [int]$Port,
    [string]$Password,
    $Item
) {
    $streamUrl = [string]$Item.streamUrl
    Invoke-VlcCommand $Port $Password 'in_play' $streamUrl 'input' | Out-Null

    $deadline = (Get-Date).AddSeconds(10)
    do {
        try {
            $status = Invoke-VlcStatus $Port $Password
            if ([string]$status.state -in @('playing', 'paused')) {
                break
            }
        } catch {
        }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)

    # Always force the queued item to its own requested position.
    # VLC can retain the previous input's time when switching via in_play.
    $startTicks = [long]$Item.startPositionTicks
    $startSeconds = [Math]::Floor(([double]$startTicks) / 10000000.0)
    if ($startSeconds -lt 0) {
        $startSeconds = 0
    }

    Invoke-VlcCommand $Port $Password 'seek' ([string]$startSeconds) | Out-Null
    Start-Sleep -Milliseconds 350

    # Repeat once after the network input has settled.
    Invoke-VlcCommand $Port $Password 'seek' ([string]$startSeconds) | Out-Null
    Write-BridgeRuntime ("Queued item forced seek -> " + $startSeconds + "s")
}

$vlcProcess = $null
$eventUrl = $null
$currentIndex = 0
$started = $false
$lastPositionTicks = [long]0
$lastDurationTicks = [long]0
$lastState = ''
$lastProgressSent = [DateTime]::MinValue
$lastProgressPosition = [long]0
$maxVlcPosition = [double]0
$vlcControlFailures = 0
$sessionEnded = $false

try {
    $parsed = [System.Uri]$Uri
    if ($parsed.Scheme -ne 'minitiger-vlc' -or $parsed.Host -ne 'launch') {
        throw 'Unbekannter Minitiger-VLC Aufruf.'
    }

    $query = [System.Web.HttpUtility]::ParseQueryString($parsed.Query)
    $jobUrl = $query['jobUrl']
    if ([string]::IsNullOrWhiteSpace($jobUrl)) {
        throw 'Der VLC-Aufruf enthält keine Job-URL.'
    }

    $jobUri = [System.Uri]$jobUrl
    if ($jobUri.Scheme -ne 'http' -and $jobUri.Scheme -ne 'https') {
        throw 'Die VLC-Job-URL ist ungültig.'
    }

    $job = Invoke-RestMethod -Uri $jobUrl -Method Get -TimeoutSec 15
    $eventUrl = [string]$job.eventUrl
    $queue = @($job.queue)

    if ([string]::IsNullOrWhiteSpace($eventUrl)) {
        throw 'Der VLC-Job enthält keine Playback-Sync-Adresse.'
    }
    if ($queue.Count -lt 1) {
        throw 'Der VLC-Job enthält keine Wiedergabequeue.'
    }

    Write-BridgeRuntime ("QueueItems=" + $queue.Count)
    for ($queueLogIndex = 0; $queueLogIndex -lt $queue.Count; $queueLogIndex++) {
        Write-BridgeRuntime ("Queue[" + $queueLogIndex + "] " + [string]$queue[$queueLogIndex].title + " StartTicks=" + [string]$queue[$queueLogIndex].startPositionTicks)
    }

    $vlcPath = Get-VlcPath
    if (-not $vlcPath) {
        throw 'VLC wurde auf diesem System nicht gefunden.'
    }

    $port = Get-FreeTcpPort
    $password = New-BridgePassword
    $currentItem = $queue[$currentIndex]

    $vlcProcess = Start-FirstVlcItem $vlcPath $port $password $currentItem
    Set-Content -LiteralPath $statePath -Value ([string]$vlcProcess.Id) -Encoding ASCII
    Write-BridgeRuntime ("VLC gestartet PID=" + $vlcProcess.Id)
    $status = Wait-VlcReady $port $password $vlcProcess

    Apply-VlcSelections $port $password $currentItem

    # Re-seek via HTTP as a second guard. Some VLC builds ignore --start-time
    # until the network input has fully opened.
    if ([long]$currentItem.startPositionTicks -gt 0) {
        $resumeSeconds = [Math]::Floor(([double]$currentItem.startPositionTicks) / 10000000.0)
        if ($resumeSeconds -gt 0) {
            Invoke-VlcCommand $port $password 'seek' ([string]$resumeSeconds) | Out-Null
        }
    }

    $lastPositionTicks = [long]$currentItem.startPositionTicks
    $lastDurationTicks = [long]$currentItem.durationTicks
    Send-PlaybackEvent $eventUrl 'start' $currentIndex $lastPositionTicks $lastDurationTicks $false (Get-VolumeLevel $status) | Out-Null
    $started = $true
    $lastProgressSent = Get-Date
    $lastProgressPosition = $lastPositionTicks

    if (Test-Path $diagPath) {
        Remove-Item -LiteralPath $diagPath -Force -ErrorAction SilentlyContinue
    }

    while (-not $vlcProcess.HasExited) {
        Start-Sleep -Milliseconds 1500

        try {
            $status = Invoke-VlcStatus $port $password
            $vlcControlFailures = 0
        } catch {
            if ($vlcProcess.HasExited) {
                Write-BridgeRuntime 'VLC-Prozess wurde beendet.'
                break
            }

            $vlcControlFailures++
            Write-BridgeRuntime ("VLC-HTTP nicht erreichbar (" + $vlcControlFailures + "/3).")

            if ($vlcControlFailures -ge 3) {
                Write-BridgeRuntime 'VLC wurde vermutlich manuell geschlossen. Beende Playback-Session mit letzter bekannter Position.'
                break
            }

            continue
        }

        $state = [string]$status.state
        $positionTicks = Convert-ToTicks $status.time
        $durationTicks = Convert-ToTicks $status.length

        try {
            $currentVlcPosition = [double]$status.position
            if ($currentVlcPosition -gt $maxVlcPosition) {
                $maxVlcPosition = $currentVlcPosition
            }
        } catch {
        }

        if ($positionTicks -gt 0 -or $state -in @('playing', 'paused')) {
            $lastPositionTicks = $positionTicks
        }
        if ($durationTicks -gt 0) {
            $lastDurationTicks = $durationTicks
        }

        $isPaused = $state -eq 'paused'
        $volumeLevel = Get-VolumeLevel $status
        $now = Get-Date
        $expectedAdvanceTicks = [long](($now - $lastProgressSent).TotalSeconds * 10000000.0)
        $actualAdvanceTicks = $lastPositionTicks - $lastProgressPosition
        $seekDetected = [Math]::Abs($actualAdvanceTicks - $expectedAdvanceTicks) -gt 50000000
        $stateChanged = $state -ne $lastState
        $progressDue = ($now - $lastProgressSent).TotalSeconds -ge 10

        if ($state -in @('playing', 'paused')) {
            if (-not $started) {
                Send-PlaybackEvent $eventUrl 'start' $currentIndex $lastPositionTicks $lastDurationTicks $isPaused $volumeLevel | Out-Null
                $started = $true
            }

            if ($progressDue -or $stateChanged -or $seekDetected) {
                Send-PlaybackEvent $eventUrl 'progress' $currentIndex $lastPositionTicks $lastDurationTicks $isPaused $volumeLevel | Out-Null
                $lastProgressSent = $now
                $lastProgressPosition = $lastPositionTicks
            }
        }
        elseif ($state -eq 'stopped' -and $started) {
            # VLC kann beim natürlichen Ende sofort auf stopped/0:00 springen.
            # Deshalb verwenden wir die letzte bekannte Zeit PLUS VLCs höchste
            # normalisierte Position. Keine Math.Max(Int32)-Überladung hier:
            # Jellyfin-Ticks überschreiten Int32 bereits nach wenigen Minuten.
            $endTolerance = [long]300000000
            if ($lastDurationTicks -gt 0) {
                $percentTolerance = [long]([double]$lastDurationTicks * 0.02)
                if ($percentTolerance -gt $endTolerance) {
                    $endTolerance = $percentTolerance
                }
                if ($endTolerance -gt [long]600000000) {
                    $endTolerance = [long]600000000
                }
            }

            $endedByTicks = $false
            if ($lastDurationTicks -gt 0) {
                $endThreshold = $lastDurationTicks - $endTolerance
                if ($endThreshold -lt [long]0) {
                    $endThreshold = [long]0
                }
                $endedByTicks = $lastPositionTicks -ge $endThreshold
            }

            $endedByRatio = $maxVlcPosition -ge 0.97
            $naturalEnd = $endedByTicks -or $endedByRatio

            $runtimeMessage = "Stopped QueueIndex={0} PositionTicks={1} DurationTicks={2} MaxVlcPosition={3} NaturalEnd={4}" -f $currentIndex, $lastPositionTicks, $lastDurationTicks, $maxVlcPosition, $naturalEnd
            Write-BridgeRuntime $runtimeMessage

            $stopPosition = if ($naturalEnd) { $lastDurationTicks } else { $lastPositionTicks }
            Send-PlaybackEvent $eventUrl 'stop' $currentIndex $stopPosition $lastDurationTicks $false $volumeLevel | Out-Null
            $started = $false

            if ($naturalEnd -and ($currentIndex + 1) -lt $queue.Count) {
                $currentIndex++
                $currentItem = $queue[$currentIndex]

                # Resume applies only to the item the user explicitly started.
                # An automatically advanced episode must begin at its beginning,
                # otherwise a stale/resume value can be inherited into every
                # following episode.
                $queuedResumeTicks = [long]$currentItem.startPositionTicks
                $currentItem.startPositionTicks = [long]0
                $lastPositionTicks = [long]0
                $lastDurationTicks = [long]$currentItem.durationTicks
                $lastProgressPosition = [long]0
                $lastProgressSent = Get-Date
                $maxVlcPosition = [double]0

                Write-BridgeRuntime ("AutoNext -> QueueIndex=" + $currentIndex + " " + [string]$currentItem.title + " QueuedResumeTicks=" + $queuedResumeTicks + " ForcedStartTicks=0")
                Start-QueuedVlcItem $port $password $currentItem
                Apply-VlcSelections $port $password $currentItem
                Send-PlaybackEvent $eventUrl 'start' $currentIndex $lastPositionTicks $lastDurationTicks $false $volumeLevel | Out-Null
                $started = $true
            } else {
                break
            }
        }

        $lastState = $state
    }
} catch {
    $message = "VLC konnte nicht über Minitiger gestartet oder synchronisiert werden.`n`n" + $_.Exception.Message
    Write-BridgeRuntime ("ERROR: " + $_.Exception.Message)
    if ($null -eq $vlcProcess -or $vlcProcess.HasExited) {
        Show-BridgeError $message
    } else {
        Write-BridgeDiagnostic $message
    }
} finally {
    if (-not [string]::IsNullOrWhiteSpace($eventUrl)) {
        if ($started) {
            Send-PlaybackEvent $eventUrl 'stop' $currentIndex $lastPositionTicks $lastDurationTicks $false $null | Out-Null
        }
        Send-PlaybackEvent $eventUrl 'session-end' $currentIndex $lastPositionTicks $lastDurationTicks $false $null | Out-Null
        $sessionEnded = $true
    }

    if ($null -ne $vlcProcess -and -not $vlcProcess.HasExited) {
        try {
            Write-BridgeRuntime ("Bridge-Ende: schließe Minitiger-VLC PID=" + $vlcProcess.Id)
            Stop-Process -Id $vlcProcess.Id -Force -ErrorAction SilentlyContinue
        } catch {
        }
    }

    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue

    if ($bridgeMutexOwned -and $null -ne $bridgeMutex) {
        try {
            $bridgeMutex.ReleaseMutex()
            Write-BridgeRuntime 'Bridge-Mutex freigegeben.'
        } catch {
        }
    }

    if ($null -ne $bridgeMutex) {
        try {
            $bridgeMutex.Dispose()
        } catch {
        }
    }

    Write-BridgeRuntime 'Handler 18.23.1g beendet.'
}
'@

$parseTokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseInput(
    $handler,
    [ref]$parseTokens,
    [ref]$parseErrors
) | Out-Null

if ($parseErrors.Count -gt 0) {
    Write-Host '[Minitiger] ABBRUCH: Der neue Handler enthält PowerShell-Parserfehler.' -ForegroundColor Red
    foreach ($parseError in $parseErrors) {
        Write-Host (' - ' + $parseError.Message) -ForegroundColor Red
    }
    throw '18.23.1g wurde NICHT installiert. Der bisherige Handler blieb unverändert.'
}

if (Test-Path $handlerPath) {
    Copy-Item -LiteralPath $handlerPath -Destination ($handlerPath + '.previous') -Force
}

Set-Content -LiteralPath $handlerPath -Value $handler -Encoding UTF8
Set-Content -LiteralPath $logPath -Value ((Get-Date -Format o) + "  Installer 18.23.1g abgeschlossen. Parser=OK") -Encoding UTF8

$root = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Classes\$scheme")
try {
    $root.SetValue('', 'URL:Minitiger VLC Protocol')
    $root.SetValue('URL Protocol', '')
} finally {
    $root.Dispose()
}

$icon = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Classes\$scheme\DefaultIcon")
try {
    $icon.SetValue('', "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe,0")
} finally {
    $icon.Dispose()
}

$commandKey = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Classes\$scheme\shell\open\command")
try {
    $powershell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $command = "`"$powershell`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$handlerPath`" `"%1`""
    $commandKey.SetValue('', $command)
} finally {
    $commandKey.Dispose()
}

Write-Host ''
Write-Host '[Minitiger] VLC-Bridge 18.23.1g Auto-Next Position-Fix installiert.' -ForegroundColor Green
Write-Host "Protokoll: ${scheme}://"
Write-Host "Handler:   $handlerPath"
Write-Host ''
Write-Host 'Basis: 18.23.1f + expliziter Seek fuer jede Auto-Next-Folge, inklusive 0:00.'
