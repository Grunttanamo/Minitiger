# Minitiger Web Sidecar – Jellyfin 12.1

## Was ist der Sidecar?

Der Sidecar ersetzt **nicht** deinen Jellyfin-Container und mountet **keine**
Jellyfin-Datenbank, keine Appdata und keine Medienordner. Er enthält nur den
Minitiger-Webclient plus einen kleinen Reverse Proxy.

- normales Jellyfin bleibt z.B. auf `http://SERVER:8096`
- Minitiger läuft zusätzlich auf einem freien Port, Standard hier `8098`
- Löschen/Stoppen des Sidecars verändert Jellyfin nicht
- Accounts, Watch-Status, Bibliotheken und Einstellungen bleiben im normalen
  Jellyfin-Server

Der Sidecar reicht API-, WebSocket- und Streaming-Anfragen an den bestehenden
Jellyfin-Server weiter. Der Browser-Einstieg wird bewusst auf
`/web/index.html` normalisiert. Damit funktionieren Browser und Jellyfin
Desktop Client über dieselbe Sidecar-Adresse.

## Docker Compose – Standardfall

```yaml
services:
  minitiger-web:
    image: ghcr.io/grunttanamo/minitiger-web:latest
    container_name: minitiger-web
    restart: unless-stopped
    ports:
      - "${MINITIGER_PORT:-8098}:80"
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

Aufruf danach standardmäßig:

`http://DEIN-SERVER:8098/web/index.html`

Ist 8098 belegt, kann vor dem Start z.B. gesetzt werden:

```bash
MINITIGER_PORT=8099 docker compose up -d
```

Das normale Jellyfin bleibt parallel auf seinem bisherigen Port erhalten.

## Direkter Docker-Run

```bash
docker run -d \
  --name minitiger-web \
  --restart unless-stopped \
  -p 8098:80 \
  -e JELLYFIN_URL="http://host.docker.internal:8096" \
  --add-host=host.docker.internal:host-gateway \
  ghcr.io/grunttanamo/minitiger-web:latest
```

## Unraid – einfache manuelle Einrichtung

In Unraid unter **Docker -> Add Container**:

- Name: `Minitiger Web`
- Repository: `ghcr.io/grunttanamo/minitiger-web:latest`
- Network Type: `Bridge`
- Port: einen **freien** Host-Port, z.B. `8098` -> Container `80` / TCP
- Variable `JELLYFIN_URL`: `http://host.docker.internal:8096`
- Extra Parameters: `--add-host=host.docker.internal:host-gateway`
- **Keine** Appdata-, Config-, Cache- oder Medienpfade hinzufügen

Im Jellyfin Desktop Client reicht `http://UNRAID-IP:8098`. Im normalen Browser ist aktuell der bestätigte direkte Pfad `http://UNRAID-IP:8098/web/index.html`. Wenn 8098 bereits verwendet wird,
einfach einen anderen freien Host-Port wählen; der Container-Port bleibt 80.

Wenn Jellyfin auf einem anderen Host-Port läuft, nur den Port in
`JELLYFIN_URL` ändern. Wenn Jellyfin auf einem anderen Rechner läuft, dort die
LAN-Adresse eintragen, z.B. `http://192.168.1.50:8096`.

## Rückweg / Deinstallation

Einfach den Container `Minitiger Web` stoppen oder löschen. Das normale
Jellyfin wurde nicht verändert und bleibt über seinen bisherigen Port nutzbar.

## Teststand Phase 18.4.1

Bestätigt im lokalen Test:
- Sidecar HEALTHCHECK-Endpunkt liefert HTTP 200.
- `/System/Info/Public` wird erfolgreich an Jellyfin 12.1 weitergeleitet.
- Jellyfin Desktop Client lädt über den Sidecar.
- Browser lädt Minitiger über `/web/index.html`.

Phase 18.4.1 normalisiert deshalb `/`, `/web` und `/web/` automatisch auf
`/web/index.html`.

Noch zu testen:
- neuer Root-Aufruf nur mit `http://SERVER:PORT` nach dem 18.4.1-Image-Build
- längeres Playback / WebSocket-Session-Updates
- Unraid-Test auf einem fremden System

Minitiger Virtual Sync ist weiterhin **nicht automatisch im Sidecar
installiert**. Das ist Absicht: Der Sidecar soll den bestehenden Jellyfin-Server
nicht verändern. Das Companion Plugin folgt später als optionale Installation.


## Öffentliche GitHub-/GHCR-Seite

Das öffentliche Image liegt unter:

`ghcr.io/grunttanamo/minitiger-web:latest`

Die GitHub-Paketseite zeigt Metadaten direkt aus dem OCI-Image. Phase 18.4.2
setzt deshalb Titel, Beschreibung, Source-Link und GPL-2.0-or-later-Lizenz sowohl
als Image-Labels als auch als Multi-Arch-Index-Annotations.

Die ausführliche Projektbeschreibung liegt in der neuen `README.md` des
Repositories. Damit GitHub diese auf der normalen Repository-Startseite zeigt,
sollte nach erfolgreichem Test `minitiger-v12.1` als Default Branch gesetzt
werden.
