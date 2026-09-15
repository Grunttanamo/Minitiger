# Aktueller Projektstand – Phase 18.5.0

## Jellyfin 12.1 / Sidecar – bestätigt
- Jellyfin Server läuft auf 12.1.0.
- Aktiver Entwicklungsbranch: `minitiger-v12.1`.
- Minitiger Sidecar `ghcr.io/grunttanamo/minitiger-web` ist öffentlich und für amd64+arm64 verfügbar.
- Sidecar-Testport lokal: 8098; normales Jellyfin: 8096; 8097 ist durch OpenMediaVault belegt.
- Health/API-Proxy, Jellyfin Desktop Client, Login, Home, Bibliotheken, Detailseiten und Playback funktionieren.
- Browser funktioniert bestätigt über `http://IP:8098/web/index.html`.

## GitHub / GHCR
- Eigene Minitiger README ist auf Repository/Package sichtbar.
- GHCR Package-Beschreibung wurde auf Minitiger angepasst.
- README-/Doku-Änderungen lösen keinen langen Sidecar-Docker-Build mehr aus.
- Metadata-only Workflow für GHCR existiert.

## Phase 18.5.0 – Plugin Repository
- `Minitiger Virtual Sync` bleibt bewusst vom Sidecar getrennt.
- Neues Jellyfin Plugin Repository unter `plugin-repository/manifest.json`.
- Öffentliche Repository-URL: `https://raw.githubusercontent.com/Grunttanamo/Minitiger/minitiger-v12.1/plugin-repository/manifest.json`.
- Neuer schneller CI-Workflow `Build Minitiger Virtual Sync Plugin`.
- Neuer manueller Workflow `Release Minitiger Virtual Sync Plugin`.
- Release-Workflow baut mit .NET 10, erstellt Plugin-ZIP, MD5, GitHub Release und aktualisiert das Jellyfin-Manifest automatisch.
- Geplantes erstes Repository-Release: `1.0.3.0`.
- Jellyfin 12.1 bleibt auf der Plugin-ABI-Linie `12.0.0.0`; genau diese targetAbi wird verwendet.
- Plugin-only Releases lösen keinen Sidecar-Docker-Build aus.

## Noch nicht bestätigt
- Phase-18.5.0-Plugin-Build auf GitHub muss real grün laufen.
- Erstes Release `1.0.3.0` muss real erzeugt werden.
- Installation über Jellyfin Dashboard -> Plugins -> Repository/Catalog muss anschließend getestet werden.
