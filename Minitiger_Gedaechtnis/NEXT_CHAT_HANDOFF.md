# Übergabe für neuen Chat

Projekt: Jellyfin Custom Web UI `Minitiger Web`.

Aktueller Stand:
- Jellyfin Server: 12.1.
- Jellyfin Web: offizieller `v12.1`-Stand wurde konfliktfrei in Minitiger gemerged.
- Aktiver Branch: `minitiger-v12.1`.
- Nutzer hat Minitiger unter 12.1 getestet; bisher funktioniert alles.
- Full-Server GitHub Docker Build aus 18.3.7.1 wurde grün bestätigt.

Aktueller Patch: Phase 18.4.0 – Jellyfin 12.1 Sidecar Preview.

Ziel des Sidecars:
- Vorhandenes Jellyfin bleibt unverändert.
- Kein Mount von `/config`, Datenbank, Cache oder Medien.
- Minitiger läuft zusätzlich auf Port 8097.
- nginx serviert Minitiger unter `/web/` und proxied API/WebSocket/Streams auf `JELLYFIN_URL`.
- Standard: `http://host.docker.internal:8096`.
- GHCR: `ghcr.io/grunttanamo/minitiger-web`.

Nächster Test:
1. Patch anwenden und pushen.
2. Workflow `Build Minitiger Sidecar` muss grün werden.
3. Sidecar starten und gegen vorhandenen 12.1-Server testen.
4. Danach Unraid-Test / Paket Public machen.
5. Später Virtual Sync als optionales Jellyfin Plugin Repository.

Regeln:
- Zu jedem Patch PowerShell-SCP-Befehl.
- Patch nur geänderte/neue Dateien + Install/Changelog/files/VERIFY + Memory.
- Separate Memory-ZIP.
- Fix erst nach Nutzer-Test bestätigen.
