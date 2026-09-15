# Aktueller Projektstand – Phase 18.4.3

## Jellyfin 12.1
- Jellyfin Server läuft auf 12.1.0.
- Offizieller Jellyfin-Web-Tag `v12.1` wurde konfliktfrei in `minitiger-v12.1` gemerged.
- Minitiger-Funktionen wurden nach dem Update getestet; bisher keine Regression bestätigt.

## Sidecar – bestätigt
- GitHub Multi-Arch Build für `ghcr.io/grunttanamo/minitiger-web` ist grün.
- GHCR-Package ist Public.
- Sidecar läuft parallel zum normalen Jellyfin, ohne `/config`, `/cache` oder Medienmounts.
- Lokaler Testport: 8098; 8097 ist durch OpenMediaVault belegt.
- `/minitiger-health` -> HTTP 200.
- `/System/Info/Public` -> HTTP 200, Jellyfin 12.1.0.
- Jellyfin Desktop Client funktioniert über `IP:8098`.
- Login, Home, Bibliotheken, Detailseiten und Playback funktionieren über den Sidecar.
- Browser funktioniert bestätigt über `http://IP:8098/web/index.html`.

## Bekannter Komfortpunkt
- Der kurze Browser-Aufruf nur über `http://IP:8098` funktioniert weiterhin nicht sauber.
- `curl /` zeigt einen 302-Redirect auf `http://127.0.0.1/web/index.html`; dabei geht der externe Host-Port verloren.
- Nutzer betrachtet dies aktuell nicht als Blocker.

## GitHub / GHCR Präsentation
- Phase 18.4.2 änderte OCI-Metadaten und README, aber auf der Package-Seite blieb weiterhin die originale Jellyfin-README sichtbar.
- Repository-Default-Branch ist noch `minitiger-v12`; `minitiger-v12.1` ist nicht Default.
- Phase 18.4.3 bringt eine neue Minitiger-README mit Hero-Banner sowie ein echtes animiertes GIF + PNG-Fallback.
- README-/Doku-Änderungen sollen künftig keinen vollständigen Multi-Arch-Sidecar-Build mehr starten.
- Neuer Workflow `Update Minitiger Package Metadata` aktualisiert die Multi-Arch-Index-Beschreibung aus einem bestehenden Image ohne npm/Webpack/Docker-Neubuild.
- Nach 18.4.3 soll `minitiger-v12.1` in GitHub als Default Branch gesetzt werden, damit Repo- und verknüpfte Package-README die Minitiger-Seite zeigen.

## Weiterhin bewusst getrennt
- Virtual Sync Companion Plugin wird nicht automatisch in Jellyfin installiert.
- Bestehende Jellyfin-Datenbank/Accounts/Appdata bleiben vollständig außerhalb des Sidecars.
