# Aktueller Projektstand – Phase 18.4.2

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
- Der Nutzer betrachtet dies aktuell nicht als Blocker, da Desktop Client ohne Zusatzpfad funktioniert und Browser-Nutzer `/web/index.html` verwenden können.

## Phase 18.4.2 – GitHub / GHCR Polish
- Neue eigene `README.md` für Minitiger Web.
- Dockerfile bekommt vollständige OCI-Metadaten inkl. GPL-2.0-or-later.
- GitHub Action schreibt Package-Beschreibung auch als Multi-Arch-Index-Annotation, damit GHCR sie sichtbar darstellen kann.
- `latest`, `12.1` und `sha-...` bleiben die vorgesehenen Tags.
- Sichtbare Package-Seite ist erst nach neuem erfolgreichen GHCR-Build bestätigt.

## Weiterhin bewusst getrennt
- Virtual Sync Companion Plugin wird nicht automatisch in Jellyfin installiert.
- Bestehende Jellyfin-Datenbank/Accounts/Appdata bleiben vollständig außerhalb des Sidecars.
