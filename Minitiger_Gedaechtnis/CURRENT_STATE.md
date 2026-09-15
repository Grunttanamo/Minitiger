# Aktueller Projektstand – Phase 18.3.7

## Bestätigt funktionierend
- Detailpage-Einstellungen greifen.
- Folgen-Detailpage: Version/Audio/Untertitel-Auswahl funktioniert.
- Lokale Trailer funktionieren im Jellyfin Desktop Client.
- Banner: kuratierte Auswahl, Serienmarker, einstellbares Inhaltslimit und Desktop-Cache.
- Virtuelle Bibliotheken: große Inhaltsmengen per Chunking, eigene Größen, Glow/Hover, zentrale Inhalte/Medien via Minitiger Virtual Sync Companion Plugin.
- Virtuelle Bibliothek Hover-MP4 + Bild/Logo Speicherung/Wiedergabe funktioniert seit 18.3.2.1.
- Seitliche Reihentitel, Side-Glow und Arrow-Lane funktionieren grundsätzlich.
- Eigene Manga-Hauptposter-/Band-Größenregler sowie eigene Pfeil-/Genre-Farben vorhanden.
- Phase 18.3.3.1 behebt den TS2367-Compilefehler in ItemsView.tsx.
- Manga/Buch: `Verlag` wird aus Jellyfin `Studios` angezeigt.
- Phase 18.3.6 vom Nutzer bestätigt: globaler `Reihenabstand` greift nun auch korrekt auf die virtuellen Bibliotheksreihen, ohne dass `Weiterschauen` unkontrolliert auseinanderläuft.
- Phase 18.3.6 vom Nutzer bestätigt: Einzelbände direkt in der Books/Comics-Bibliothekswurzel zeigen keine fremden `Weitere Bände` mehr.

## Neues Feedback nach 18.3.6
- Auf Manga/Bücher-Detailpages erscheint oberhalb von `MANGA BAND` noch der Parent-/Bibliotheksname, z.B. `Comics`.
- Dieser Text ist klickbar und führt auf eine andere Jellyfin-Detailpage; gewünscht ist, diese Parent-/Bibliothekszeile auf Minitiger-Manga/Buch-Detailpages vollständig zu entfernen.
- Zusätzlich soll Minitiger Web testweise als Docker-Variante an einen Kollegen verteilt werden können. Gewünscht ist ein einfacher GitHub/GHCR-Workflow.

## Phase 18.3.7 – neuer Teststand
- Die klickbare Parent-/Bibliothekszeile in `MinitigerMangaDetails.tsx` wurde entfernt. `Comics` bzw. vergleichbare Parent-Namen erscheinen damit nicht mehr im Hero.
- Docker-Unterstützung ergänzt:
  - `Dockerfile.minitiger` baut Minitiger Web aus dem aktuellen Repo und setzt es auf das offizielle Jellyfin-12.0-Image.
  - Minitiger Virtual Sync wird mit .NET 10 gebaut.
  - Startup-Wrapper kopiert die Plugin-DLL in das persistente `/config/plugins`-Volume.
  - GitHub Actions kann Multi-Arch-Images (amd64 + arm64) nach GHCR veröffentlichen.
  - Compose-Beispiel + Einsteiger-Anleitung liegen bei.

## Nicht verändert
- Trailer-Pipeline / Desktop-Codec-Fallback.
- Audioflaggen-Sprachlogik / Flag-Assets.
- Banner-Datenpipeline.
- Row-Gap-Fix aus 18.3.6.
- Manga-Library-Root-Erkennung aus 18.3.6.
