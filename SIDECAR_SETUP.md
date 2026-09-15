# Minitiger Web Sidecar – Jellyfin 12.1

## Was ist der Sidecar?

Der Sidecar ersetzt **nicht** deinen Jellyfin-Container und mountet **keine**
Jellyfin-Datenbank, keine Appdata und keine Medienordner. Er enthält nur den
Minitiger-Webclient plus einen kleinen Reverse Proxy.

- normales Jellyfin bleibt z.B. auf `http://SERVER:8096`
- Minitiger läuft zusätzlich z.B. auf `http://SERVER:8097`
- Löschen/Stoppen des Sidecars verändert Jellyfin nicht
- Accounts, Watch-Status, Bibliotheken und Einstellungen bleiben im normalen
  Jellyfin-Server

Der Sidecar reicht API-, WebSocket- und Streaming-Anfragen an den bestehenden
Jellyfin-Server weiter. Dadurch sieht der Browser Minitiger wie einen normalen
Jellyfin-Webclient unter `/web/`.

## Docker Compose – Standardfall

```yaml
services:
  minitiger-web:
    image: ghcr.io/grunttanamo/minitiger-web:latest
    container_name: minitiger-web
    restart: unless-stopped
    ports:
      - "8097:80"
    environment:
      JELLYFIN_URL: "http://host.docker.internal:8096"
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Dann:

```bash
docker compose pull
docker compose up -d
```

Aufruf danach:

`http://DEIN-SERVER:8097`

Das normale Jellyfin bleibt parallel auf Port 8096 erhalten.

## Unraid – einfache manuelle Einrichtung

In Unraid unter **Docker -> Add Container**:

- Name: `Minitiger Web`
- Repository: `ghcr.io/grunttanamo/minitiger-web:latest`
- Network Type: `Bridge`
- Port: Host `8097` -> Container `80` / TCP
- Variable `JELLYFIN_URL`: `http://host.docker.internal:8096`
- Extra Parameters: `--add-host=host.docker.internal:host-gateway`
- **Keine** Appdata-, Config-, Cache- oder Medienpfade hinzufügen

Danach `http://UNRAID-IP:8097` öffnen.

Wenn Jellyfin auf einem anderen Host-Port läuft, nur den Port in
`JELLYFIN_URL` ändern. Wenn Jellyfin auf einem anderen Rechner läuft, dort die
LAN-Adresse eintragen, z.B. `http://192.168.1.50:8096`.

## Rückweg / Deinstallation

Einfach den Container `Minitiger Web` stoppen oder löschen. Das normale
Jellyfin wurde nicht verändert und bleibt über seinen bisherigen Port nutzbar.

## Wichtige Grenzen des ersten Sidecar-Tests

- Zielbasis ist Jellyfin 12.1.
- Nicht-standardmäßige Jellyfin Base-URLs wie `/jellyfin` sind in Phase 18.4.0
  noch nicht separat getestet.
- HTTPS vor dem Sidecar sollte später über den vorhandenen Reverse Proxy des
  Nutzers erfolgen. Der interne `JELLYFIN_URL` darf weiterhin HTTP sein.
- Minitiger Virtual Sync ist **nicht automatisch im Sidecar installiert**.
  Das ist Absicht: Der Sidecar soll den bestehenden Jellyfin-Server nicht
  verändern. Das Companion Plugin wird später als optionale, getrennte
  Installation/Plugin-Repository behandelt.
- Wenn das GHCR-Paket privat ist, muss der Docker-Host bei GHCR angemeldet sein.
  Für eine wirklich einfache öffentliche Installation sollte das Paket nach
  erfolgreichem Test auf Public gestellt werden.
