#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/minitiger-web"

echo "[Minitiger] Building production web client..."
npm run build:production

echo "[Minitiger] Preparing /opt/minitiger-web/dist.new ..."
sudo rm -rf /opt/minitiger-web/dist.new
sudo cp -a "$HOME/minitiger-web/dist" /opt/minitiger-web/dist.new
sudo chown -R jellyfin:jellyfin /opt/minitiger-web/dist.new
sudo chmod -R a+rX /opt/minitiger-web/dist.new

echo "[Minitiger] Swapping production dist..."
sudo rm -rf /opt/minitiger-web/dist.prev
if [ -d /opt/minitiger-web/dist ]; then
    sudo mv /opt/minitiger-web/dist /opt/minitiger-web/dist.prev
fi
sudo mv /opt/minitiger-web/dist.new /opt/minitiger-web/dist

echo "[Minitiger] Restarting Jellyfin..."
sudo systemctl restart jellyfin
sudo systemctl status jellyfin --no-pager

echo "[Minitiger] Done. Rollback build remains at /opt/minitiger-web/dist.prev"
