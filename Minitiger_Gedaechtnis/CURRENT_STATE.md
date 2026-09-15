# Aktueller Projektstand – Phase 18.5.1

## Jellyfin 12.1 / Sidecar – bestätigt
- Jellyfin Server läuft auf 12.1.0.
- Aktiver Entwicklungsbranch: `minitiger-v12.1`.
- Minitiger Sidecar `ghcr.io/grunttanamo/minitiger-web` ist öffentlich und für amd64+arm64 verfügbar.
- Sidecar-Testport lokal: 8098; normales Jellyfin: 8096; 8097 ist durch OpenMediaVault belegt.
- Health/API-Proxy, Jellyfin Desktop Client, Login, Home, Bibliotheken, Detailseiten und Playback funktionieren.
- Browser funktioniert bestätigt über `http://IP:8098/web/index.html`.

## GitHub / GHCR
- Eigene Minitiger README ist auf Repository/Package sichtbar.
- GHCR Package-Beschreibung ist auf Minitiger angepasst.
- README-/Doku-Änderungen lösen keinen langen Sidecar-Docker-Build aus.
- Metadata-only Workflow für GHCR existiert.

## Plugin Repository – aktueller Teststand
- `Minitiger Virtual Sync` wird als separates Jellyfin Plugin Repository vorbereitet.
- Repository-Manifest: `plugin-repository/manifest.json`.
- Repository-URL: `https://raw.githubusercontent.com/Grunttanamo/Minitiger/minitiger-v12.1/plugin-repository/manifest.json`.
- `Build Minitiger Virtual Sync Plugin` ist auf GitHub real **grün bestätigt**.
- Erster manueller Release-Lauf für `1.0.3.0` schlug beim Schritt `Calculate Jellyfin catalog checksum` fehl.
- Ursache real aus GitHub Actions Logs bestätigt: Umgebungsvariable `ZIP` kollidierte mit Info-ZIP. Das Archiv landete als `foo`/Default-Archiv statt am erwarteten `$RUNNER_TEMP/...zip`-Pfad; `md5sum` fand die erwartete Datei nicht.
- Phase 18.5.1 ersetzt `ZIP` durch `ARCHIVE_NAME` und prüft das erzeugte Archiv explizit mit `test -s`.
- Der Release-Schritt `Create GitHub release` wurde im Fehlversuch nie erreicht; Version `1.0.3.0` kann erneut verwendet werden.

## Noch nicht bestätigt
- Phase-18.5.1-Release-Workflow muss real grün laufen.
- GitHub Release `plugin-v1.0.3.0`, ZIP und Manifest-Eintrag müssen real entstehen.
- Installation über Jellyfin Dashboard -> Plugins -> Repository/Catalog muss anschließend getestet werden.
