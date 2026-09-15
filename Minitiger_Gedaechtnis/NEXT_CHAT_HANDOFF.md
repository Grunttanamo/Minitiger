# Übergabe für neuen Chat

Projekt: Jellyfin Custom Web UI `Minitiger Web`.

Aktueller Stand:
- Jellyfin Server/Web: 12.1.0.
- Branch: `minitiger-v12.1`.
- Sidecar `ghcr.io/grunttanamo/minitiger-web` öffentlich, amd64+arm64, funktional getestet.
- Jellyfin 8096, Minitiger 8098, OpenMediaVault 8097.
- Desktop Client/Login/Home/Bibliotheken/Detailseiten/Playback funktionieren.
- Browser bestätigt über `/web/index.html`.

Aktueller Patch: Phase 18.5.0 `Minitiger Virtual Sync Plugin Repository`.
- `plugin-repository/manifest.json`
- `PLUGIN_SETUP.md`
- schneller Plugin Build Workflow
- manueller Plugin Release Workflow
- Release erstellt ZIP + MD5 + GitHub Release + Manifest-Commit automatisch
- erstes Release vorgesehen: `1.0.3.0`
- targetAbi bewusst `12.0.0.0` (Jellyfin-12-Plugin-ABI), Testserver 12.1

Nach dem Patch:
1. Build Workflow grün abwarten.
2. Release Workflow manuell starten.
3. Repository URL in Jellyfin hinzufügen.
4. Plugin installieren, Jellyfin neu starten und Minitiger-Sync testen.

Regeln:
- Zu jedem Patch PowerShell-SCP-Befehl.
- Patch nur geänderte/neue Dateien + INSTALL/Changelog/files/VERIFY + Memory.
- Separate Memory-ZIP.
- Fix/Workflow erst nach echtem Nutzertest als bestätigt markieren.
