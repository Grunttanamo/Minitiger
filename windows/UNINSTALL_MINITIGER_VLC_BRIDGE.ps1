$ErrorActionPreference = 'Stop'

$scheme = 'minitiger-vlc'
$baseDir = Join-Path $env:LOCALAPPDATA 'Minitiger\VLCBridge'
$registryPath = "HKCU:\Software\Classes\$scheme"

Write-Host ''
Write-Host '[Minitiger] VLC Bridge wird entfernt ...' -ForegroundColor Yellow

# The external VLC player should be closed before uninstalling.
try {
    if (Test-Path $registryPath) {
        Remove-Item -LiteralPath $registryPath -Recurse -Force
        Write-Host '[Minitiger] Windows-Protokoll minitiger-vlc:// entfernt.'
    } else {
        Write-Host '[Minitiger] Windows-Protokoll war nicht registriert.'
    }
} catch {
    Write-Host ('[Minitiger] Protokoll konnte nicht entfernt werden: ' + $_.Exception.Message) -ForegroundColor Red
    throw
}

try {
    if (Test-Path $baseDir) {
        Remove-Item -LiteralPath $baseDir -Recurse -Force
        Write-Host '[Minitiger] Lokale Bridge-Dateien entfernt.'
    } else {
        Write-Host '[Minitiger] Keine lokalen Bridge-Dateien gefunden.'
    }
} catch {
    Write-Host ('[Minitiger] Lokale Bridge-Dateien konnten nicht entfernt werden: ' + $_.Exception.Message) -ForegroundColor Red
    throw
}

Write-Host ''
Write-Host '[Minitiger] VLC Bridge vollständig entfernt.' -ForegroundColor Green
Write-Host 'Der native Jellyfin Player ist davon nicht betroffen.'
