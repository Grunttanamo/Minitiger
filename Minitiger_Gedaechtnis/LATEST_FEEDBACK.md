# Letztes Nutzerfeedback – 2026-09-15

1. Sidecar läuft erfolgreich auf Port 8098 neben normalem Jellyfin 8096.
2. Health-Endpoint und Jellyfin API via Reverse Proxy liefern HTTP 200.
3. Jellyfin Desktop Client funktioniert direkt mit `IP:8098`.
4. Login, Home, Bibliotheken, Detailseiten und Playback funktionieren.
5. Browser funktioniert mit `http://IP:8098/web/index.html`.
6. Kurzer Browser-Link `http://IP:8098` funktioniert trotz 18.4.1 noch nicht; curl zeigt 302 zu `http://127.0.0.1/web/index.html`, wodurch der externe Port fehlt.
7. Nutzer bewertet diesen Browser-Komfortpunkt aktuell als unwichtig, solange Desktop Client funktioniert und Browser-Pfad dokumentiert ist.
8. Nächster Wunsch: die öffentliche GitHub-/GHCR-Seite `minitiger-web` hübscher und verständlicher machen.
