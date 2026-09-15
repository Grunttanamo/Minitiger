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


## Phase 18.4.2 – GitHub / GHCR Package Page Polish
- Eigene Minitiger-README mit Sidecar-Konzept, Quick Start, Unraid, Tags, Kompatibilität und Lizenz.
- OCI title/description/source/url/licenses/vendor im Sidecar-Dockerfile.
- docker/metadata-action@v6 ergänzt.
- Multi-Arch-Index-Annotations für GHCR Package-Beschreibung ergänzt.
- Package-Seite bleibt GitHub-layoutgebunden; freie Gestaltung erfolgt über Repository-README.


## Phase 18.4.3 – GitHub Hero Banner + Fast GHCR Metadata
- Hero-Banner in der Minitiger-README.
- Echtes animiertes 2-Frame-GIF aus den zwei bereitgestellten Motiven + PNG-Fallback.
- README optisch neu strukturiert mit Badges, Sidecar-Übersicht, Quick Start, Unraid, Tags und Credits.
- README-/Doku-Dateien aus dem Full-Sidecar-Build-Trigger entfernt.
- Neuer manueller Workflow `Update Minitiger Package Metadata`.
- Workflow nutzt `docker buildx imagetools create`, um bestehende amd64/arm64-Manifeste wiederzuverwenden und nur GHCR-Index-Metadaten zu ändern.
- Default Branch `minitiger-v12.1` ist erforderlich/empfohlen, damit GitHub die neue README standardmäßig zeigt.


## Phase 18.5.0 – Minitiger Virtual Sync Plugin Repository
- Eigenes Jellyfin Plugin Repository Manifest.
- Plugin-Setup-Dokumentation + README-Verlinkung.
- Schneller .NET-10 Plugin-Build als separater GitHub Workflow.
- Manueller Release-Workflow: Plugin-ZIP, MD5, GitHub Release, automatische Manifest-Aktualisierung.
- Plugin-only Releases sind vom langen Sidecar Multi-Arch Docker Build getrennt.
- Erstes vorgesehenes Repository-Release: 1.0.3.0.
- targetAbi 12.0.0.0 bleibt bewusst die Jellyfin-12-Plugin-ABI-Linie, auch auf Testserver 12.1.

## Phase 18.5.1 – Plugin Release ZIP Hotfix
- Erster realer Release-Lauf scheiterte erst nach erfolgreichem .NET Publish beim MD5-Schritt.
- GitHub Actions Log: `md5sum: .../Minitiger.VirtualSync_1.0.3.0.zip: No such file or directory`.
- Ursache: Workflow exportierte `ZIP=...`; Info-ZIP verwendet `ZIP` selbst als spezielle Umgebungsvariable.
- Variablenname auf `ARCHIVE_NAME` geändert und alle Release-/Checksum-/URL-Schritte konsistent angepasst.
- Zusätzliche `test -s`-Prüfung stellt sicher, dass das erwartete Archiv tatsächlich erzeugt wurde.
- Kein Plugin-Code, keine UI und kein Sidecar geändert.
