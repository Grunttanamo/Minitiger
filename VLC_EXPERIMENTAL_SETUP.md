# Minitiger – VLC Player · Experimentell

Minitiger can optionally hand video playback to a **locally installed VLC Media Player on Windows** while keeping Jellyfin resume state, playback progress and episode auto-next synchronized with the Jellyfin server.

> [!IMPORTANT]
> **The experimental VLC player currently requires Windows, Jellyfin Desktop, a locally installed VLC Media Player and the Minitiger VLC Bridge.**
> The Minitiger Virtual Sync companion plugin must also be installed on the Jellyfin server.
> The normal/native Jellyfin player does **not** require any of these VLC-specific Windows steps.

## What to expect

This is the **external VLC edition**.

When VLC playback is selected in Minitiger and you press Play, VLC opens in its own Windows window. That is intentional for this version.

Current supported behavior includes:

- movies, episodes and music videos;
- Jellyfin resume positions;
- playback progress synchronization;
- watched / stopped state synchronization;
- audio-track and subtitle-track selection;
- automatic playback of the next episode;
- the next automatically started episode begins at `0:00`;
- active playback appears in the Jellyfin dashboard as **VLC Media Player**.

## Requirements

### Jellyfin server

- Jellyfin Server / Web **12.1**;
- current Minitiger Web build;
- **Minitiger Virtual Sync** companion plugin with VLC bridge support.

For a public/plugin-catalog installation, use the current Minitiger plugin repository release.
For a native development installation, `INSTALL_MINITIGER_VIRTUAL_SYNC.sh` installs the companion directly from the repository source.

### Windows client

- Windows 10 or Windows 11;
- **Jellyfin Desktop** connected to the Minitiger frontend;
- VLC Media Player installed locally;
- Minitiger VLC Bridge installed for the current Windows user.

The external VLC mode is currently intended for **Windows Jellyfin Desktop**. Use the native Jellyfin player on unsupported clients/platforms.

## 1. Install VLC Media Player

Install VLC normally on Windows before installing the bridge.

Minitiger searches the common VLC installation locations and the standard VideoLAN registry entries.

## 2. Install the Minitiger VLC Bridge

Download this file from the Minitiger repository:

```text
windows/INSTALL_MINITIGER_VLC_BRIDGE.ps1
```

Open **PowerShell** and go to the folder containing the downloaded file, for example:

```powershell
cd "$env:USERPROFILE\Downloads"
```

Allow scripts for this PowerShell window only:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

If Windows marked the downloaded file as coming from the internet, unblock it:

```powershell
Unblock-File ".\INSTALL_MINITIGER_VLC_BRIDGE.ps1"
```

Install the bridge:

```powershell
.\INSTALL_MINITIGER_VLC_BRIDGE.ps1
```

Administrator rights are normally **not required**. The bridge registers the custom protocol only for the current Windows user.

After installation, Minitiger stores its local bridge files below:

```text
%LOCALAPPDATA%\Minitiger\VLCBridge
```

and registers:

```text
minitiger-vlc://
```

## 3. Enable VLC in Minitiger

Open Minitiger in **Jellyfin Desktop**.

Go to:

```text
Minitiger Einstellungen
→ Allgemein
→ Wiedergabe
→ VLC Player · Experimentell
```

The player selection is stored per user.

Now start a movie, episode or music video. VLC should open automatically.

## Updating the bridge

When Minitiger ships a newer external VLC Bridge, download the new:

```text
windows/INSTALL_MINITIGER_VLC_BRIDGE.ps1
```

and run it again. The installer updates the current-user bridge installation.

## Uninstalling the bridge

Close VLC first.

Download/run:

```text
windows/UNINSTALL_MINITIGER_VLC_BRIDGE.ps1
```

Example:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\UNINSTALL_MINITIGER_VLC_BRIDGE.ps1
```

This removes the `minitiger-vlc://` registration and the local Minitiger VLC Bridge files. It does **not** uninstall VLC and does not affect the native Jellyfin player.

## Troubleshooting

The bridge keeps a local runtime log that can be useful when playback does not start or synchronization behaves unexpectedly:

```powershell
Get-Content "$env:LOCALAPPDATA\Minitiger\VLCBridge\bridge_runtime.log" -Tail 50
```

The latest bridge error, when available, is stored at:

```text
%LOCALAPPDATA%\Minitiger\VLCBridge\last_bridge_error.txt
```

### VLC does not open

Check that:

1. VLC Media Player is installed locally;
2. you are using Jellyfin Desktop on Windows;
3. the Minitiger VLC Bridge installer completed successfully;
4. Minitiger Virtual Sync is installed and Jellyfin was restarted after its installation/update;
5. `VLC Player · Experimentell` is selected in Minitiger.

You can always switch back to **Nativer Jellyfin Player** in Minitiger settings.

## Security / local bridge behavior

The Windows protocol launches only the local Minitiger bridge handler. Playback jobs are short-lived and the VLC HTTP control interface is bound to localhost with a per-playback random port/password.

The external VLC mode is experimental and remains optional.
