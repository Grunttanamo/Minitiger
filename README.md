# 🐯 Minitiger Web

**Minitiger Web** is a custom Jellyfin Web frontend built for **Jellyfin 12.1**.  
The recommended installation is a small **sidecar container**: your existing Jellyfin server, database, users, libraries, watch state, plugins and media paths stay untouched.

> Minitiger runs next to Jellyfin instead of replacing it.

## ✨ What you get

- Custom Minitiger home and detail-page design
- Virtual libraries and Minitiger-specific UI features
- Manga / comic improvements
- Trailer and playback integrations
- Audio-language flags and detail-page enhancements
- Separate Docker sidecar: easy to test, easy to remove
- Multi-architecture image for **amd64** and **arm64**

## 🧊 Safe sidecar design

Your existing Jellyfin installation stays exactly where it is.

```text
Existing Jellyfin              Minitiger Web Sidecar
http://SERVER:8096             http://SERVER:8098
        │                               │
        ├── users                       ├── custom web frontend
        ├── database                    ├── reverse proxy to Jellyfin
        ├── libraries                   └── no /config or media mounts
        ├── watch state
        └── settings
```

Stopping or deleting the Minitiger container does **not** delete or migrate Jellyfin data.

## 🚀 Quick start

```bash
docker run -d \
  --name minitiger-web \
  --restart unless-stopped \
  -p 8098:80 \
  -e JELLYFIN_URL="http://host.docker.internal:8096" \
  --add-host=host.docker.internal:host-gateway \
  ghcr.io/grunttanamo/minitiger-web:latest
```

Then connect with the Jellyfin Desktop Client to:

```text
http://SERVER-IP:8098
```

For a normal browser, the currently confirmed direct path is:

```text
http://SERVER-IP:8098/web/index.html
```

The host port `8098` is only an example and can be changed freely.

## 🟩 Unraid

Create a new container and use:

```text
Repository:      ghcr.io/grunttanamo/minitiger-web:latest
Network Type:    Bridge
Host Port:       8098
Container Port:  80 / TCP
JELLYFIN_URL:    http://host.docker.internal:8096
Extra Params:    --add-host=host.docker.internal:host-gateway
```

Do **not** add Jellyfin `/config`, `/cache`, appdata or media mounts to the Minitiger container.

## 🔖 Image tags

| Tag | Meaning |
| --- | --- |
| `latest` | Current recommended Minitiger sidecar build |
| `12.1` | Build targeting Jellyfin 12.1 |
| `sha-…` | Immutable build for a specific Git commit |

## ⚠️ Compatibility

Current target: **Jellyfin Server / Web 12.1**.  
The sidecar has been tested with Jellyfin 12.1, the Jellyfin Desktop Client, login, home, libraries, detail pages and playback.

Non-standard Jellyfin base URLs and unusual reverse-proxy/authentication setups may need additional configuration.

## ❤️ About the project

Minitiger Web is a community customization based on **Jellyfin Web**. It is not an official Jellyfin project and is not affiliated with the Jellyfin team.

Jellyfin Web is licensed under **GPL-2.0-or-later**. Minitiger keeps the upstream license and attribution. See [`LICENSE`](LICENSE) for details.

Upstream Jellyfin Web: https://github.com/jellyfin/jellyfin-web
