# Projektregeln

- Sprache: Deutsch, locker/casual, gern ♥ / xD.
- Für Updates möglichst fertige ZIP-Patches liefern.
- Bei jedem neuen Minitiger-Web-Patch immer passenden PowerShell-SCP-Befehl vom Windows-Downloads-Ordner zum Raspberry Pi mitsenden.
- Patch-ZIP: nur geänderte/neue Dateien + Changelog + Install + files.txt + VERIFY + `Minitiger_Gedaechtnis/`.
- Zusätzlich separate Gedächtnis-ZIP liefern.
- Nicht behaupten, ein Fix sei erfolgreich, bevor Nutzer ihn getestet hat.
- Audioflaggen nicht ohne Grund anfassen.
- Lokale Trailer / Desktop-Codec-Fallback nicht ohne Grund umbauen.
- Jellyfin Desktop greift auf Production 8096 zu, nicht Dev 8080.
- Voller nativer Build findet auf Raspberry Pi statt.
- Bei Buildfehlern komplette rote Fehlermeldung analysieren, keine blinden Folgefixes.

## Jellyfin / Branch
- Aktuelle kompatible Basis: Jellyfin Server + Jellyfin Web 12.1.
- Aktiver Entwicklungsbranch: `minitiger-v12.1`.
- 12.0-Rettungspunkt bleibt per Tag/Branch erhalten.

## Docker-Verteilung
- Bevorzugte öffentliche Architektur ab Phase 18.4.0: **Sidecar**.
- Sidecar darf standardmäßig keine Jellyfin-Datenbank, `/config`, `/cache` oder Medienordner mounten.
- Bestehender Jellyfin-Container soll unangetastet bleiben.
- Full-Server-Docker aus 18.3.7.x bleibt Proof-of-Concept/Legacy, nicht die bevorzugte Laien-Installation.
- Companion Plugin nicht ungefragt in fremde Serverconfig kopieren; später optionales Plugin-Repository.

## GitHub / GHCR Präsentation
- README-/Banner-/Dokumentationsänderungen dürfen keinen vollständigen Multi-Arch-Docker-Build auslösen.
- Für reine GHCR-Beschreibungsänderungen den Metadata-only Workflow verwenden.
- Aktuelle Projekt-README liegt auf `minitiger-v12.1`; dieser Branch soll Default sein.


## Plugin-Verteilung
- Minitiger Virtual Sync als normales Jellyfin Plugin Repository verteilen, nicht automatisch in `/config/plugins` kopieren.
- Plugin-only Änderungen/Releases dürfen keinen vollständigen Minitiger Sidecar Multi-Arch Build auslösen.
- Releases erst nach grünem separatem Plugin-Build veröffentlichen.
- Jellyfin 12 Plugin targetAbi bleibt `12.0.0.0`, solange upstream die 12.x ABI-Linie nicht ändert.
