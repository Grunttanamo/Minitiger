# Minitiger Virtual Sync – Plugin Repository

Minitiger Web itself stays in the separate sidecar container. **Minitiger Virtual Sync** is an optional server-side companion plugin for users who want Minitiger virtual-library configuration and custom virtual-library media to be stored on the Jellyfin server instead of only in the frontend environment.

The plugin does not replace Jellyfin, does not replace the Jellyfin database and is not bundled into the Minitiger sidecar.

## Repository URL

Add this URL in Jellyfin:

```text
https://raw.githubusercontent.com/Grunttanamo/Minitiger/minitiger-v12.1/plugin-repository/manifest.json
```

## Install in Jellyfin

1. Open **Dashboard → Plugins → Repositories**.
2. Add a repository named **Minitiger**.
3. Paste the repository URL above and save.
4. Open **Plugins → Catalog**.
5. Install **Minitiger Virtual Sync**.
6. Restart Jellyfin.

After the first public plugin release has been created, new plugin versions are delivered through the same repository URL.

## Compatibility

- Jellyfin Server: **12.x**, tested target server: **12.1**.
- .NET target: **net10.0**.
- Jellyfin plugin ABI: **12.0.0.0**.

Jellyfin 12.1 still uses the Jellyfin 12 plugin ABI line, so the catalog entry intentionally targets `12.0.0.0` while Minitiger itself is tested on Jellyfin 12.1.

## Data location

The plugin stores only its own Minitiger data below Jellyfin's plugin data directory, including the virtual-library configuration and optional uploaded image/logo/video files. It does not need direct access to the Minitiger sidecar filesystem.

## Maintainer release flow

Plugin releases are intentionally separate from the long Minitiger Docker build.

1. Push plugin/workflow changes to `minitiger-v12.1`.
2. Wait for **Build Minitiger Virtual Sync Plugin** to turn green.
3. Open **Actions → Release Minitiger Virtual Sync Plugin**.
4. Choose branch `minitiger-v12.1` and click **Run workflow**.
5. Enter a four-part version, for example `1.0.3.0`, plus a short changelog.

The workflow then:

- builds the plugin with .NET 10,
- packages the plugin DLL into a ZIP,
- calculates the Jellyfin catalog MD5 checksum,
- creates a GitHub Release,
- updates `plugin-repository/manifest.json`,
- commits the updated manifest back to `minitiger-v12.1`.

No Minitiger Web / Docker image rebuild is required for a plugin-only release.
