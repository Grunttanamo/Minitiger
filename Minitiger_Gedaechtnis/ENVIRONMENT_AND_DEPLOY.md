# Environment / Deploy – v42

- Raspberry Pi Projekt: `~/minitiger-web`
- Aktiver Branch: `minitiger-v12.1`
- Jellyfin Server: 12.1.0 auf Port 8096
- Minitiger Sidecar Test/Standardbeispiel: Port 8098
- OpenMediaVault belegt Port 8097
- Browser bestätigt: `http://SERVER:8098/web/index.html`
- Desktop Client bestätigt: `http://SERVER:8098`
- GHCR Sidecar: `ghcr.io/grunttanamo/minitiger-web:latest`

## Plugin Repository
- Manifest: `plugin-repository/manifest.json`
- URL: `https://raw.githubusercontent.com/Grunttanamo/Minitiger/minitiger-v12.1/plugin-repository/manifest.json`
- Plugin-Projekt: `tools/MinitigerVirtualSync/Jellyfin.Plugin.MinitigerVirtualSync.csproj`
- Framework: net10.0
- Jellyfin 12 targetAbi: 12.0.0.0
- Erster Plugin-Build: real grün bestätigt.
- Erstes Release: weiterhin geplant als 1.0.3.0; erster Versuch scheiterte vor Release-Erstellung am ZIP/MD5-Pfad.
