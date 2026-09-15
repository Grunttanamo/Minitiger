# Umgebung / Deploy

## Native Development / Production
- Raspberry Pi 5
- Debian GNU/Linux 13 (trixie), arm64
- Jellyfin Server 12.1
- Node 24.21.0
- npm 11.19.0
- Repo: `~/minitiger-web`
- Aktiver Branch: `minitiger-v12.1`
- Dev: Port 8080
- Production / normales Jellyfin: Port 8096
- Native Webdir: `/opt/minitiger-web/dist`

## Git Remotes
- `origin` -> offizielles `jellyfin/jellyfin-web`
- `minitiger` -> `git@github.com:Grunttanamo/Minitiger.git`

## Sidecar
- Dockerfile: `Dockerfile.minitiger-sidecar`
- Runtime: nginx alpine
- Backend im lokalen Test: `http://host.docker.internal:8096`
- Lokales Mapping: Host 8098 -> Container 80
- 8097 ist lokal durch OpenMediaVault belegt.
- Desktop Client: `http://SERVER:8098`
- Browser bestätigt: `http://SERVER:8098/web/index.html`
- Keine Jellyfin-Datenvolumes erforderlich.
- Compose: `docker-compose.sidecar.example.yml`
- Anleitung: `SIDECAR_SETUP.md`
- GitHub Action: `.github/workflows/minitiger-sidecar.yml`
- GHCR: `ghcr.io/grunttanamo/minitiger-web`
- Plattformen: amd64 + arm64
- Package ist Public.

## GitHub Präsentation ab 18.4.2
- Repository bekommt eigene `README.md`.
- GHCR Package-Metadaten werden über OCI Labels + Multi-Arch Index Annotations gesetzt.
- Für die Repository-Startseite sollte `minitiger-v12.1` als Default Branch gesetzt werden.

## Legacy Full-Server Docker
- Phase 18.3.7.x hatte `ghcr.io/grunttanamo/minitiger-jellyfin` gebaut.
- Dieser Weg ersetzt den Jellyfin-Container und ist nicht mehr die bevorzugte universelle Installation.
