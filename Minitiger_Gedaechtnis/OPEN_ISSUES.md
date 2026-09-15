# Offene Punkte nach Phase 18.3.7.1

## Web / Manga noch testen
1. Manga-/Buch-Detailpage: Parent-/Bibliotheksname wie `Comics` ist nach 18.3.7 vollständig weg.
2. Echte Manga-Reihe: `Weitere Bände` bleibt erhalten.
3. Einzelband in Books/Comics-Root: `Weitere Bände` bleibt unterdrückt.
4. Regression: globaler Home-`Reihenabstand` bleibt für normale + virtuelle Reihen identisch.

## Docker / GitHub jetzt testen
1. Phase 18.3.7.1 einspielen und nach `minitiger-v12` pushen.
2. Automatischen Workflow `Build Minitiger Docker` beobachten.
3. Prüfen, ob die .NET-Plugin-Buildstage nun über `mcr.microsoft.com/dotnet/sdk:10.0` hinauskommt.
4. Falls ein neuer Fehler erscheint: vollständige neue rote Fehlermeldung analysieren, nicht mehrere blinde Fixes stapeln.
5. Erst nach komplett grünem Workflow GHCR-Image auf dem Docker-System des Kollegen testen.
6. Danach Companion Plugin unter `/config/plugins/Minitiger Virtual Sync/` und Status-Endpunkt prüfen.
