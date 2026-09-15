# Patch-Historie – Kurzfassung

- 18.3.0: Side-Titles, Virtual Hover Media, Indicator-Design, YouTube-Toggle.
- 18.3.0.1: TypeScript Build Hotfix.
- 18.3.1: Serverweiter Virtual-Library-Sync via Companion Plugin.
- 18.3.1.1: Versuchter Upload/UI-Hotfix.
- 18.3.1.2: Force-Apply + Verify-Patch.
- 18.3.2: Virtual Media / UI / Settings Ausbau.
- 18.3.2.1: Hover-Video + Side-Row-Center Hotfix.
- 18.3.2.2: Side Glow + Arrow-Control-Lane Hotfix.
- 18.3.3: Virtual Library Card/Nav Polish, smarte Home-Pfeile, Landscape-Audioflaggen.
- 18.3.3.1: Compile Hotfix TS2367.
- 18.3.4: Detail-Audioflags, Hero-Flags/Burger, Manga-Verlag/Burger, Root-Unterdrückung, Gap-Versuch.
- 18.3.5: Detail-Flag-CSS, Verlag, Manga-Root, Virtual-Gap.
- 18.3.6: Einheitlicher Home-Reihenabstand + autoritative Manga-Library-Root-Erkennung; bestätigt.
- 18.3.7: Manga Parent Cleanup + Full-Server Docker/GitHub.
- 18.3.7.1: .NET-10-Docker-Buildstage auf gültigen `mcr.microsoft.com/dotnet/sdk:10.0`-Tag; Docker-Build später grün bestätigt.

## Jellyfin 12.1 Migration
- Separater Branch `minitiger-v12.1` angelegt.
- Offizieller Jellyfin-Web-Tag `v12.1` konfliktfrei gemerged.
- Nutzer aktualisierte Jellyfin Server auf 12.1 und bestätigte, dass Minitiger weiterhin funktioniert.

## Phase 18.4.0 – Sidecar Preview
- Neuer eigenständiger Minitiger-Web-Dockercontainer ohne Jellyfin-Server.
- nginx liefert `/web/` lokal aus und reverse-proxied API/WebSocket/Streams an vorhandenes Jellyfin.
- Kein Zugriff auf Jellyfin-Appdata/Datenbank nötig.
- Compose + Unraid-Anleitung.
- Eigener GitHub-Workflow und GHCR-Image `minitiger-web`, amd64 + arm64.

## Phase 18.4.1 – Sidecar Browser Entry Hotfix
- Sidecar-Grundfunktion aus 18.4.0 im Test bestätigt: Health/API/Desktop Client funktionieren.
- Browser funktioniert direkt über `/web/index.html`, kurzer Root-Link zuvor nicht.
- `/`, `/web`, `/web/` werden deshalb explizit auf `/web/index.html` normalisiert.
- Compose-Port wird über `MINITIGER_PORT` frei konfigurierbar; Default im Beispiel 8098.
