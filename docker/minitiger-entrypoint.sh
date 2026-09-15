#!/bin/sh
set -eu

PLUGIN_SOURCE="/opt/minitiger/Jellyfin.Plugin.MinitigerVirtualSync.dll"
PLUGIN_DIR="/config/plugins/Minitiger Virtual Sync"
PLUGIN_TARGET="$PLUGIN_DIR/Jellyfin.Plugin.MinitigerVirtualSync.dll"

if [ -f "$PLUGIN_SOURCE" ]; then
    mkdir -p "$PLUGIN_DIR"
    cp -f "$PLUGIN_SOURCE" "$PLUGIN_TARGET"
    chmod 755 "$PLUGIN_DIR" || true
    chmod 644 "$PLUGIN_TARGET" || true
    echo "[Minitiger] Virtual Sync plugin installed in /config/plugins."
fi

exec /jellyfin/jellyfin "$@"
