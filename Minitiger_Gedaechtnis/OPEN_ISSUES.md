# Offene Punkte nach Phase 18.3.7

## Jetzt testen
1. Manga-/Buch-Detailpage: oberhalb von `MANGA BAND` darf kein klickbarer Parent-/Bibliotheksname wie `Comics` mehr erscheinen.
2. Echte Manga-Reihe: `Weitere Bände` bleibt weiterhin vorhanden und navigierbar.
3. Einzelband in Books/Comics-Root: `Weitere Bände` bleibt weiterhin vollständig unterdrückt.
4. Regression: globaler Home-`Reihenabstand` bleibt für normale + virtuelle Reihen identisch.

## Docker / GitHub
- Den aktuellen kompletten `minitiger-v12`-Quellstand inklusive Phase 18.3.7 in ein GitHub-Repository pushen.
- GitHub Action `Build Minitiger Docker` einmal erfolgreich durchlaufen lassen.
- GHCR-Image auf einem Docker-System des Kollegen testen.
- Prüfen, ob Minitiger Virtual Sync im Container unter `/config/plugins/Minitiger Virtual Sync/` geladen wird und der Status-Endpunkt erreichbar ist.
- Hardware-Transcoding wurde im Compose-Beispiel absichtlich noch nicht vorkonfiguriert, weil Geräte/Host des Kollegen unbekannt sind.

## Weiter beobachten
- Detail-Audioflaggen aus 18.3.5 wurden zuletzt nicht erneut beanstandet, aber nicht separat als endgültig bestätigt protokolliert.
