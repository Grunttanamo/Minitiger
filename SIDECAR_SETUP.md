# Minitiger Web Sidecar – Jellyfin 12.1

The Minitiger sidecar runs independently from the existing Jellyfin server. It does not need Jellyfin `/config`, `/cache`, appdata or media mounts.

## Quick start

```bash
docker run -d \
  --name minitiger-web \
  --restart unless-stopped \
  -p 8098:80 \
  -e JELLYFIN_URL="http://host.docker.internal:8096" \
  --add-host=host.docker.internal:host-gateway \
  ghcr.io/grunttanamo/minitiger-web:latest
```

Desktop Client:

```text
http://SERVER-IP:8098
```

Browser (currently confirmed):

```text
http://SERVER-IP:8098/web/index.html
```

The host port can be changed freely.

## GHCR package presentation

The project README contains the Minitiger banner and is intended to be the README shown by the linked GitHub package. The repository default branch should therefore be `minitiger-v12.1`.

Package description updates do **not** require a new Docker build. Use the GitHub Actions workflow:

```text
Update Minitiger Package Metadata
```

Open **Actions → Update Minitiger Package Metadata → Run workflow**, edit the description if desired, then run it. The workflow reuses the existing amd64/arm64 image manifests and only republishes the multi-arch index metadata for `latest` and `12.1`.

README, banner and other documentation changes do not trigger the full `Build Minitiger Sidecar` workflow anymore.
