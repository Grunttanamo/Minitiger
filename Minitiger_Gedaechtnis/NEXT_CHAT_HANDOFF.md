# Übergabe für neuen Chat

Projekt: Jellyfin Custom Web UI `Minitiger Web`.

Aktueller Stand:
- Jellyfin Server/Web: 12.1.0.
- Branch: `minitiger-v12.1`.
- Sidecar `ghcr.io/grunttanamo/minitiger-web` öffentlich, amd64+arm64, funktional getestet.
- Jellyfin 8096, Minitiger 8098, OpenMediaVault 8097.
- Desktop Client/Login/Home/Bibliotheken/Detailseiten/Playback funktionieren.
- Browser bestätigt über `/web/index.html`.

Plugin:
- Repository-Infrastruktur Phase 18.5.0 vorhanden.
- `Build Minitiger Virtual Sync Plugin` real grün bestätigt.
- Erster Release `1.0.3.0` scheiterte beim MD5-Schritt.
- Exakte Ursache aus Logs: reservierte Info-ZIP-Umgebungsvariable `ZIP` kollidierte mit Workflow-Variable.
- Phase 18.5.1 ersetzt `ZIP` durch `ARCHIVE_NAME` und prüft das Archiv nach Erstellung.
- Fehlversuch erreichte `Create GitHub release` nicht, daher `1.0.3.0` erneut verwenden.

Nächster Test:
1. 18.5.1 pushen.
2. Release Workflow erneut mit 1.0.3.0 starten.
3. Bei grünem Lauf Release/ZIP/Manifest prüfen.
4. Danach Repository in Jellyfin hinzufügen und Plugin installieren.

Regeln:
- Zu jedem Patch PowerShell-SCP-Befehl.
- Patch nur geänderte/neue Dateien + INSTALL/Changelog/files/VERIFY + Memory.
- Separate Memory-ZIP.
- Fix/Workflow erst nach echtem Nutzertest als bestätigt markieren.
