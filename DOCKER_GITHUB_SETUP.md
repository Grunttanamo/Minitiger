# Minitiger Web – Docker + GitHub Testverteilung

Diese Dateien machen aus dem bestehenden `minitiger-v12`-Quellstand ein Docker-Image auf Basis des offiziellen Jellyfin-12.0-Images.

Enthalten:
- Minitiger Web (`dist`) ersetzt den Webclient in `/jellyfin/jellyfin-web`.
- Minitiger Virtual Sync wird mit .NET 10 gebaut.
- Der Plugin-Wrapper kopiert die DLL beim Containerstart nach `/config/plugins/Minitiger Virtual Sync/`, sodass ein persistentes `/config`-Volume funktioniert.
- GitHub Actions veröffentlicht automatisch Images für `linux/amd64` und `linux/arm64` in GitHub Container Registry (GHCR).

## 1. GitHub-Repository anlegen

Auf GitHub ein leeres Repository anlegen, z. B. `minitiger-web`. Keine README/License automatisch erzeugen, weil das bestehende Jellyfin-Web-Repo bereits Versionshistorie und Lizenzdateien besitzt.

Auf dem Raspberry Pi im bestehenden Repo:

```bash
cd ~/minitiger-web
git status
git remote -v
git add .
git commit -m "Minitiger Web Phase 18.3.7 + Docker support"
git remote add minitiger https://github.com/DEIN_GITHUB_NAME/minitiger-web.git
git push -u minitiger minitiger-v12
```

Falls der Remote-Name `minitiger` bereits existiert:

```bash
git remote set-url minitiger https://github.com/DEIN_GITHUB_NAME/minitiger-web.git
git push -u minitiger minitiger-v12
```

## 2. GitHub baut das Docker-Image

Nach dem Push unter GitHub -> Actions -> `Build Minitiger Docker` warten, bis der Lauf grün ist.

Das Image lautet danach:

```text
ghcr.io/DEIN_GITHUB_NAME/minitiger-jellyfin:latest
```

Bei einem privaten Repository/Package muss der Tester Zugriff erhalten und sich bei GHCR anmelden. Für einen unkomplizierten Test kann das Package in GitHubs Package-Einstellungen auf Public gestellt werden.

## 3. Beim Tester

`docker-compose.example.yml` als `docker-compose.yml` speichern und zwei Dinge ersetzen:

1. `DEIN_GITHUB_NAME`
2. `/PFAD/ZU/DEINEN/MEDIEN`

Dann:

```bash
mkdir -p minitiger-jellyfin/config minitiger-jellyfin/cache
cd minitiger-jellyfin
docker compose pull
docker compose up -d
```

Jellyfin/Minitiger ist danach normalerweise unter:

```text
http://SERVER-IP:8096
```

Logs:

```bash
docker compose logs -f jellyfin
```

Update auf ein neues Minitiger-Image:

```bash
docker compose pull
docker compose up -d
```

Stoppen:

```bash
docker compose down
```

`config` und `cache` bleiben dabei erhalten. Medien werden nur read-only eingebunden.

## Private GHCR-Packages

Wenn das Package privat bleibt, benötigt der Tester einen GitHub Personal Access Token mit mindestens `read:packages` und führt einmal aus:

```bash
echo "TOKEN" | docker login ghcr.io -u DEIN_GITHUB_NAME --password-stdin
```

Danach funktionieren `docker compose pull` und `docker compose up -d` normal.

## Wichtiger Versionshinweis

Minitiger ist aktuell für Jellyfin 12.0 gebaut. Deshalb verwendet das Dockerfile absichtlich `jellyfin/jellyfin:12.0` statt `latest`, damit ein späterer Jellyfin-Major-Release nicht ungeprüft unter Minitiger landet.

## Lizenz-Hinweis

Minitiger Web basiert auf Jellyfin Web (GPL-2.0-or-later). Wenn du das angepasste Docker-Image weitergibst, sollte der dazugehörige Quellstand für den Empfänger ebenfalls verfügbar sein. Ein GitHub-Repo (öffentlich oder für den Kollegen freigegeben) ist dafür der einfachste Weg. Vorhandene Jellyfin-Lizenz- und Copyright-Dateien im Repo bitte beibehalten.
