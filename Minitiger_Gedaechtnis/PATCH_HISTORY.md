# Patch-Historie – Kurzfassung

- 18.3.0: Side-Titles, Virtual Hover Media, Indicator-Design, YouTube-Toggle.
- 18.3.0.1: TypeScript Build Hotfix.
- 18.3.1: Serverweiter Virtual-Library-Sync via Companion Plugin.
- 18.3.1.1: Versuchter Upload/UI-Hotfix; beim Nutzer zunächst nicht im Source angekommen.
- 18.3.1.2: Force-Apply + Verify-Patch.
- 18.3.2: Virtual Media / UI / Settings Ausbau.
- 18.3.2.1: Hover-Video + Side-Row-Center Hotfix.
- 18.3.2.2: Side Glow + Arrow-Control-Lane Hotfix.
- 18.3.3: Virtual Library Card/Nav Polish, smarte Home-Pfeile, Landscape-Audioflaggen.
- 18.3.3.1: Compile Hotfix für TS2367 in ItemsView.tsx; keine Feature-Änderung.
- 18.3.4: Detail-Audioflags, Hero-Flags/Burger, Manga-Verlag/Burger, erste Root-Unterdrückung, Virtual-Row-Gap-Versuch.
- 18.3.5: Detail-Flag-CSS-Hotfix, Verlag-Feinausrichtung, erweiterte Manga-Root-Erkennung, Virtual-Gap-Hotfix.
- 18.3.6: Einheitlicher Home-Reihenabstand + autoritative Manga-Library-Root-Erkennung via Virtual Folders. Vom Nutzer bestätigt.

## Phase 18.3.7 – Manga Parent Cleanup + Docker/GitHub
- Entfernt den klickbaren Parent-/Bibliotheksnamen oberhalb von `MANGA BAND` auf Minitiger-Manga/Buch-Detailpages.
- Ergänzt ein Dockerfile auf Basis des offiziellen Jellyfin-12.0-Images.
- Baut Minitiger Web mit Node 24 und Minitiger Virtual Sync mit .NET 10.
- Startup-Wrapper installiert die Companion-Plugin-DLL in `/config/plugins`, auch bei persistentem Docker-Config-Volume.
- GitHub Action publiziert amd64/arm64 Images nach GHCR.
- Compose-Beispiel und Schritt-für-Schritt-GitHub-Anleitung hinzugefügt.
