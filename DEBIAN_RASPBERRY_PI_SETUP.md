# 🍓 Minitiger Web – Debian / Raspberry Pi Native Setup

This guide installs Minitiger Web directly as the web frontend served by an existing **native Jellyfin 12.1 installation**.

It is the alternative to the Docker sidecar setup.

> [!IMPORTANT]
> In native mode, Minitiger becomes the web frontend served by your existing Jellyfin instance on its normal port (usually `8096`).
> Your Jellyfin database, users, libraries, media, watch state and server settings are not replaced. The stock Jellyfin web files remain installed so you can switch back.

## ✅ Tested setup

The native route is currently confirmed with:

- **Raspberry Pi 5**
- **Debian GNU/Linux 13 (trixie)**
- **arm64**
- **Jellyfin Server 12.1**
- **Node.js 24**
- **npm 11**
- Jellyfin Desktop Client
- modern desktop browsers

Other Debian-based amd64/arm64 systems may work as well, but the setup above is the currently tested reference environment.

## 🧩 How native mode works

```text
Jellyfin Server
http://SERVER-IP:8096
        │
        ├── normal Jellyfin backend
        ├── users / database / libraries / playback
        └── --webdir=/opt/minitiger-web/dist
                          │
                          └── Minitiger Web production build
```

The source tree lives in:

```text
~/minitiger-web
```

The active production frontend lives in:

```text
/opt/minitiger-web/dist
```

The previous Minitiger production build is kept at:

```text
/opt/minitiger-web/dist.prev
```

The packaged Jellyfin frontend under `/usr/share/jellyfin/web` is not overwritten.

## 1. Install build requirements

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential
```

Minitiger Web currently requires **Node.js 24+** and **npm 11+**.

One convenient way to install Node 24 without replacing Debian's system Node is NVM:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install 24
nvm use 24

node --version
npm --version
```

## 2. Clone Minitiger Web

```bash
git clone \
  --branch minitiger-v12.1 \
  --single-branch \
  https://github.com/Grunttanamo/Minitiger.git \
  "$HOME/minitiger-web"

cd "$HOME/minitiger-web"
npm ci
```

## 3. Prepare the production web directory

```bash
sudo mkdir -p /opt/minitiger-web
sudo chown root:root /opt/minitiger-web
```

Do **not** copy Minitiger over Jellyfin's packaged `/usr/share/jellyfin/web` directory.

## 4. Point Jellyfin at Minitiger Web

On Debian packages, Jellyfin's startup options are normally stored in:

```text
/etc/default/jellyfin
```

Back it up first:

```bash
sudo cp -a \
  /etc/default/jellyfin \
  /etc/default/jellyfin.before-minitiger
```

Open the file:

```bash
sudo nano /etc/default/jellyfin
```

Set Jellyfin's web option to:

```bash
JELLYFIN_WEB_OPT="--webdir=/opt/minitiger-web/dist"
```

If `JELLYFIN_WEB_OPT` already exists, replace its current value instead of adding a second copy.

The original Jellyfin frontend remains installed under `/usr/share/jellyfin/web`; only the active web directory changes.

## 5. Build and deploy Minitiger

```bash
cd "$HOME/minitiger-web"

chmod +x DEPLOY_PRODUCTION.sh
./DEPLOY_PRODUCTION.sh
```

The helper:

1. runs `npm run build:production`,
2. prepares `/opt/minitiger-web/dist.new`,
3. keeps the currently active Minitiger build as `/opt/minitiger-web/dist.prev`,
4. activates the new build as `/opt/minitiger-web/dist`,
5. applies Jellyfin-readable permissions,
6. restarts Jellyfin,
7. shows the Jellyfin service status.

## 6. Connect

### Jellyfin Desktop Client

```text
http://SERVER-IP:8096
```

### Browser

```text
http://SERVER-IP:8096/web/index.html
```

Native mode does **not** use a second frontend port.

## 🔌 Optional companion plugin

In Jellyfin open:

**Dashboard → Plugins → Repositories**

Add a repository named `Minitiger` with:

```text
https://raw.githubusercontent.com/Grunttanamo/Minitiger/minitiger-v12.1/plugin-repository/manifest.json
```

Then install **Minitiger Virtual Sync** from the Plugin Catalog and restart Jellyfin.

See [PLUGIN_SETUP.md](PLUGIN_SETUP.md) for more information.

## 🔄 Updating Minitiger Web

```bash
cd "$HOME/minitiger-web"

git pull --ff-only origin minitiger-v12.1
npm ci
./DEPLOY_PRODUCTION.sh
```

The previously active Minitiger build remains at:

```text
/opt/minitiger-web/dist.prev
```

## ↩️ Roll back to the previous Minitiger build

```bash
sudo systemctl stop jellyfin

sudo mv \
  /opt/minitiger-web/dist \
  "/opt/minitiger-web/dist.failed-$(date +%Y%m%d-%H%M%S)"

sudo mv \
  /opt/minitiger-web/dist.prev \
  /opt/minitiger-web/dist

sudo chown -R jellyfin:jellyfin /opt/minitiger-web/dist
sudo chmod -R a+rX /opt/minitiger-web/dist

sudo systemctl start jellyfin
sudo systemctl status jellyfin --no-pager
```

## 🧼 Return completely to the stock Jellyfin frontend

Restore the original Debian Jellyfin environment file:

```bash
sudo cp -a \
  /etc/default/jellyfin.before-minitiger \
  /etc/default/jellyfin

sudo systemctl restart jellyfin
sudo systemctl status jellyfin --no-pager
```

Jellyfin will then use its packaged frontend again, normally from:

```text
/usr/share/jellyfin/web
```

## 🧪 Development server

For development/testing only:

```bash
cd "$HOME/minitiger-web"
npm start
```

Use `DEPLOY_PRODUCTION.sh` when you want to test Minitiger through the normal Jellyfin Desktop Client / port `8096`.

## ℹ️ Notes

- **Docker / Sidecar remains the recommended isolated setup for most users.**
- Native mode is useful when you want Minitiger directly on the normal Jellyfin address and port.
- Never overwrite Jellyfin's packaged `/usr/share/jellyfin/web` directory.
- Keep `/etc/default/jellyfin.before-minitiger` until you no longer need the native setup.
- Non-standard reverse proxies, custom Jellyfin base URLs and non-Debian service layouts may need additional changes.
