# Letztes Nutzerfeedback

- Sidecar funktioniert vollständig im Jellyfin Desktop Client; Login, Home, Bibliotheken, Detailseiten und Playback bestätigt.
- GitHub/GHCR Präsentation ist verbessert; Package wird öffentlich verteilt.
- `Build Minitiger Virtual Sync Plugin` lief real grün durch.
- Erster manueller `Release Minitiger Virtual Sync Plugin` Lauf mit Version `1.0.3.0` schlug nach rund 40 Sekunden fehl.
- GitHub Logs wurden geprüft: Build/Publish des Plugins war erfolgreich; Fehler kam erst im MD5-Schritt, weil die Workflow-Variable `ZIP` mit der Info-ZIP-Umgebungsvariable kollidierte.
- Phase 18.5.1 behebt ausschließlich diesen Release-Archivpfad.
