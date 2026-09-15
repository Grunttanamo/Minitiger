# Aktueller Projektstand – Phase 18.4.1

## Jellyfin 12.1
- Jellyfin Server läuft auf 12.1.0.
- Offizieller Jellyfin-Web-Tag `v12.1` wurde konfliktfrei in `minitiger-v12.1` gemerged.
- Minitiger-Funktionen wurden nach dem Update getestet; bisher keine Regression bestätigt.

## Sidecar – bestätigte Teile
- GitHub Multi-Arch Build für `ghcr.io/grunttanamo/minitiger-web` ist grün.
- GHCR-Package ist Public und lässt sich starten.
- Sidecar läuft parallel zum normalen Jellyfin, ohne `/config`, `/cache` oder Medienmounts.
- Lokaler Testport: 8098, da 8097 durch OpenMediaVault belegt ist.
- `/minitiger-health` -> HTTP 200.
- `/System/Info/Public` -> HTTP 200, Jellyfin 12.1.0.
- Desktop Client lädt über die Sidecar-Adresse normal.
- Browser lädt über `/web/index.html` normal.

## Phase 18.4.1 – Browser Entry Hotfix
- `/`, `/web` und `/web/` werden auf `/web/index.html` umgeleitet.
- Ziel: kurzer Browser-Link `http://SERVER:PORT` funktioniert genauso wie Desktop Client.
- Compose-Port ist jetzt über `MINITIGER_PORT` konfigurierbar; Beispiel-Default 8098.
- Fix ist noch nicht real bestätigt, bis neues GHCR-Image gebaut und kurzer Browser-Link getestet wurde.

## Weiterhin bewusst getrennt
- Virtual Sync Companion Plugin wird nicht automatisch in Jellyfin installiert.
- Bestehende Jellyfin-Datenbank/Accounts/Appdata bleiben vollständig außerhalb des Sidecars.
