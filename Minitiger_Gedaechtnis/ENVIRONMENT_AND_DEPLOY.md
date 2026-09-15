# Umgebung / Deploy

## Native Server
- Raspberry Pi 5
- Debian GNU/Linux 13 (trixie), arm64
- Jellyfin 12 stable
- Jellyfin startet mit: --webdir=/opt/minitiger-web/dist

## Repo
- ~/minitiger-web
- Branch: minitiger-v12

## Standard-Deploy
```bash
cd ~/minitiger-web
unzip -o ~/PATCHNAME.zip
git status
chmod +x DEPLOY_PRODUCTION.sh
./DEPLOY_PRODUCTION.sh
sudo systemctl status jellyfin --no-pager
```

## Companion Plugin nativ
Phase 18.3.1 enthält:
```bash
chmod +x INSTALL_MINITIGER_VIRTUAL_SYNC.sh
./INSTALL_MINITIGER_VIRTUAL_SYNC.sh
```
Plugin-Ziel nativ:
`/var/lib/jellyfin/plugins/Minitiger Virtual Sync/`

## Docker ab Phase 18.3.7
- Basisimage: `jellyfin/jellyfin:12.0`
- Webroot im offiziellen Container: `/jellyfin/jellyfin-web`
- Persistente Config: `/config`
- Companion Plugin im Container: `/config/plugins/Minitiger Virtual Sync/Jellyfin.Plugin.MinitigerVirtualSync.dll`
- GitHub Action: `.github/workflows/minitiger-docker.yml`
- Multi-Arch: amd64 + arm64
- Anleitung: `DOCKER_GITHUB_SETUP.md`

## Docker-Hotfix 18.3.7.1
- .NET-10-Plugin-Buildstage: `mcr.microsoft.com/dotnet/sdk:10.0`
- Nicht `10.0-bookworm-slim`: .NET 10 veröffentlicht keine Debian/Bookworm-Containerimages.
