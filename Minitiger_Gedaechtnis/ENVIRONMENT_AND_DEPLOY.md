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
- Production / Jellyfin Desktop: Port 8096
- Native Webdir: `/opt/minitiger-web/dist`

## Git Remotes
- `origin` -> offizielles `jellyfin/jellyfin-web`
- `minitiger` -> `git@github.com:Grunttanamo/Minitiger.git`

## Sidecar ab Phase 18.4.0
- Dockerfile: `Dockerfile.minitiger-sidecar`
- Runtime: nginx alpine
- Standard Backend: `http://host.docker.internal:8096`
- Standard Mapping: Host 8097 -> Container 80
- Webclient: lokal unter `/web/`
- Alle sonstigen Requests: Reverse Proxy auf bestehenden Jellyfin-Server
- Keine Jellyfin-Datenvolumes erforderlich
- Compose: `docker-compose.sidecar.example.yml`
- Anleitung: `SIDECAR_SETUP.md`
- GitHub Action: `.github/workflows/minitiger-sidecar.yml`
- GHCR: `ghcr.io/grunttanamo/minitiger-web`
- Plattformen: amd64 + arm64

## Legacy Full-Server Docker
- Phase 18.3.7.x hatte `ghcr.io/grunttanamo/minitiger-jellyfin` gebaut.
- Dieser Weg ersetzt den Jellyfin-Container und ist nicht mehr die bevorzugte universelle Installation.
