# Aktueller Projektstand – Phase 18.3.7.1

## Bestätigt funktionierend
- Detailpage-Einstellungen greifen.
- Folgen-Detailpage: Version/Audio/Untertitel-Auswahl funktioniert.
- Lokale Trailer funktionieren im Jellyfin Desktop Client.
- Banner: kuratierte Auswahl, Serienmarker, einstellbares Inhaltslimit und Desktop-Cache.
- Virtuelle Bibliotheken: große Inhaltsmengen per Chunking, eigene Größen, Glow/Hover, zentrale Inhalte/Medien via Minitiger Virtual Sync Companion Plugin.
- Virtuelle Bibliothek Hover-MP4 + Bild/Logo Speicherung/Wiedergabe funktioniert seit 18.3.2.1.
- Seitliche Reihentitel, Side-Glow und Arrow-Lane funktionieren grundsätzlich.
- Eigene Manga-Hauptposter-/Band-Größenregler sowie eigene Pfeil-/Genre-Farben vorhanden.
- Manga/Buch: `Verlag` wird aus Jellyfin `Studios` angezeigt.
- Phase 18.3.6 vom Nutzer bestätigt: globaler `Reihenabstand` greift korrekt auf normale und virtuelle Home-Reihen.
- Phase 18.3.6 vom Nutzer bestätigt: Einzelbände direkt in der Books/Comics-Bibliothekswurzel zeigen keine fremden `Weitere Bände` mehr.

## Phase 18.3.7 – noch zu testen
- Klickbare Parent-/Bibliothekszeile (z.B. `Comics`) wurde aus Minitiger-Manga/Buch-Detailpages entfernt.
- Docker/GitHub-Verteilung wurde ergänzt.
- GitHub-Repository wurde erfolgreich via SSH auf Branch `minitiger-v12` gepusht und GitHub Actions aktiviert.

## Docker-Testfeedback
- Erster Workflow-Lauf `Build Minitiger Docker` startete erfolgreich, scheiterte aber beim Auflösen der Plugin-Buildstage.
- Konkreter Fehler: `mcr.microsoft.com/dotnet/sdk:10.0-bookworm-slim: not found`.
- Ursache: .NET 10 veröffentlicht keine Debian/Bookworm-Containerimages mehr; der verwendete Tag existiert nicht.

## Phase 18.3.7.1 – neuer Hotfix-Teststand
- `Dockerfile.minitiger` verwendet für die Plugin-Buildstage jetzt `mcr.microsoft.com/dotnet/sdk:10.0`.
- Der Tag ist der offizielle .NET-10-Standardtag und basiert auf Ubuntu 24.04/Noble.
- Sonst keine Funktionsänderungen.

## Nicht verändert
- Trailer-Pipeline / Desktop-Codec-Fallback.
- Audioflaggen-Sprachlogik / Flag-Assets.
- Banner-Datenpipeline.
- Row-Gap-Fix aus 18.3.6.
- Manga-Library-Root-Erkennung aus 18.3.6.
- Manga-Parent-Cleanup aus 18.3.7.
