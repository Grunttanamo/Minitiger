# Letztes Nutzerfeedback – 2026-09-15

1. Phase 18.4.0 Sidecar GitHub Action wurde grün; `minitiger-web` wurde als amd64/arm64 GHCR-Image gebaut.
2. GHCR-Package `minitiger-web` war zunächst Private; Nutzer stellte es auf Public und konnte das Image danach starten.
3. Port 8097 ist im lokalen Netz bereits durch OpenMediaVault belegt; lokaler Sidecar-Test läuft daher auf 8098.
4. `curl http://127.0.0.1:8098/minitiger-health` liefert HTTP 200 `Minitiger Sidecar OK`.
5. `curl http://127.0.0.1:8098/System/Info/Public` liefert HTTP 200 und Jellyfin Server 12.1.0; Reverse Proxy funktioniert.
6. Jellyfin Desktop Client lädt bei Eingabe von `IP:8098` normal über den Sidecar.
7. Browser mit kurzem Link `http://IP:8098` zeigte rote Jellyfin-Seite `Software Failure / Die angeforderte Seite wurde nicht gefunden`.
8. Browser mit `http://IP:8098/web/index.html` lädt dagegen normal.
9. Daraus folgt: Sidecar/Proxy funktionieren; Problem ist nur die Browser-Entry-Normalisierung von `/` bzw. `/web/`.
