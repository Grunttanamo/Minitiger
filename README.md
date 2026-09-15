<p align="center">
  <img src="https://raw.githubusercontent.com/Grunttanamo/Minitiger/minitiger-v12.1/docs/assets/minitiger-banner.gif" alt="Minitiger Web Banner" width="100%">
</p>

<h1 align="center">🐯 Minitiger Web</h1>

<p align="center">
  <strong>A cute custom Jellyfin 12.1 web experience — delivered as a safe sidecar.</strong><br>
  Keep your existing Jellyfin server, database, users, libraries, watch state and settings untouched.
</p>

<p align="center">
  <img alt="Jellyfin 12.1" src="https://img.shields.io/badge/Jellyfin-12.1-00A4DC?logo=jellyfin&logoColor=white">
  <img alt="Docker GHCR" src="https://img.shields.io/badge/Docker-GHCR-2496ED?logo=docker&logoColor=white">
  <img alt="Platforms" src="https://img.shields.io/badge/Platforms-amd64%20%7C%20arm64-555555">
  <img alt="License" src="https://img.shields.io/badge/License-GPL--2.0--or--later-orange">
</p>

<p align="center">
  <a href="https://github.com/Grunttanamo/Minitiger/pkgs/container/minitiger-web"><strong>📦 Docker Package</strong></a>
  ·
  <a href="SIDECAR_SETUP.md"><strong>🧊 Sidecar Setup</strong></a>
  ·
  <a href="CHANGELOG_Minitiger_Web.txt"><strong>📝 Changelog</strong></a>
</p>

---

## ✨ What is Minitiger Web?

**Minitiger Web** is a heavily customized Jellyfin Web frontend targeting **Jellyfin 12.1**. It keeps the familiar Jellyfin backend while adding the Minitiger home, custom detail pages, virtual libraries, manga/comic improvements, trailer integrations, audio-language flags and a lot of UI polish.

The recommended installation is the **Minitiger Sidecar**. It runs next to your existing Jellyfin installation instead of replacing it.

```text
Your normal Jellyfin                 Minitiger Web Sidecar
http://SERVER:8096                   http://SERVER:8098
        │                                     │
        ├── users                             ├── Minitiger frontend
        ├── database                          ├── Jellyfin API proxy
        ├── libraries                         └── no /config or media mounts
        ├── watch state
        ├── plugins
        └── settings
```

Deleting the Minitiger container does **not** delete or migrate your Jellyfin data.

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

### Jellyfin Desktop Client

Connect to:

```text
http://SERVER-IP:8098
```

### Browser

The currently confirmed browser URL is:

```text
http://SERVER-IP:8098/web/index.html
```

The external port `8098` is only an example. Pick any free port on your system.

## 🟩 Unraid

Create an additional container and use:

```text
Repository:      ghcr.io/grunttanamo/minitiger-web:latest
Network Type:    Bridge
Host Port:       8098
Container Port:  80 / TCP
JELLYFIN_URL:    http://host.docker.internal:8096
Extra Params:    --add-host=host.docker.internal:host-gateway
```

Do **not** mount your Jellyfin `/config`, `/cache`, appdata or media folders into the Minitiger container.

## 🎨 Highlights

- Custom Minitiger home and detail-page design
- Virtual libraries and Minitiger-specific navigation
- Manga / comic improvements
- Trailer and playback integrations
- Audio-language flags and media information polish
- Separate disposable sidecar container
- Multi-architecture Docker image for **amd64** and **arm64**

## 🔖 Docker tags

| Tag | Meaning |
| --- | --- |
| `latest` | Current recommended Minitiger sidecar build |
| `12.1` | Current build targeting Jellyfin 12.1 |
| `sha-…` | Immutable image for a specific Git commit |

## ✅ Current compatibility

Current target: **Jellyfin Server / Web 12.1**.

Confirmed in the current test setup:

- Jellyfin 12.1 server connection
- Jellyfin Desktop Client via sidecar
- Login
- Home
- Libraries
- Detail pages
- Playback
- Browser via `/web/index.html`

Non-standard Jellyfin base URLs and unusual reverse-proxy/authentication setups may require extra configuration.

## ❤️ Credits & license

Minitiger Web is a community customization based on **Jellyfin Web**. It is not an official Jellyfin project and is not affiliated with the Jellyfin team.

Jellyfin Web and this derivative remain licensed under **GPL-2.0-or-later**. See [`LICENSE`](LICENSE).

Upstream project: https://github.com/jellyfin/jellyfin-web

<sub>Banner artwork is used as Minitiger project artwork. A static PNG fallback is stored at <code>docs/assets/minitiger-banner.png</code>.</sub>
