# IMPERA AUTOMATION — Silence Remover Tool
## Projektdokumentation

---

## Was ist das Projekt?

Eine Desktop-App (Electron) die ElevenLabs Audio-Dateien automatisch analysiert und stille Stellen (Pausen zwischen Sätzen) erkennt und herausschneidet. Zusätzlich können beliebige Audio- und Video-Dateien in verschiedene Formate konvertiert werden. Mehrere Audiodateien können zu einer Gesamtspur zusammengeführt werden.

**Problem das es löst:**
ElevenLabs (Voice: Mark) produziert zwischen Sätzen typische Stille-Lücken. Diese manuell in CapCut rauszuschneiden kostet pro Video **10–15 Minuten**. Die App macht das in **~5 Sekunden**.

**Zielformat:** MP3 / WAV (ElevenLabs Output)

---

## Geplante Features

### 🔥 High Impact (Priorität 1)
- [x] Splash Screen mit Impera Logo + Starten-Button
- [x] Audio-Datei Upload (Drag & Drop + Klick)
- [x] Automatische Stille-Erkennung via FFmpeg (RMS-Analyse)
- [x] Waveform Visualizer mit rot markierten Stille-Segmenten
- [x] 3 Slider zur Feinsteuerung (siehe unten)
- [x] Preview Player — Anhören ohne Stille, vor dem Export
- [x] Export mit Timestamps (`.json`) für CapCut/DaVinci Import
- [x] Echter Audio-Export — gekürztes File via FFmpeg schneiden

### ⚡ Medium Impact (Priorität 2)
- [x] Konvertierung: MP4 / Audio → MP3 / WAV / AAC / FLAC via FFmpeg
- [x] Stille-Statistik ("Du sparst X:XX Minuten in diesem Video")
- [x] Zusammenführen-Tab: mehrere Files zu einer Spur mergen
- [x] MP4 / Video Silence Remover (Stille aus Videos rausschneiden)
- [x] Stille-Zonen manuell editierbar (resize + verschieben per Drag)
- [ ] Batch-Modus (mehrere Files auf einmal silence-removen)
- [ ] Preset-Speicher pro Kanal (@akteabstieg, FearFiles, etc.)

### 🎯 Nice to Have (Priorität 3)
- [ ] Lautstärke-Normalisierung vor dem Schnitt
- [ ] Code Signing (.exe ohne Warning)

---

## Die 3 Slider

| Slider | Label DE | Startwert | Range |
|---|---|---|---|
| Erkennungsschwelle | Threshold | -42 dB | -60 bis -20 dB |
| Mindestlänge | Min. Dauer | 300 ms | 100 bis 1000 ms |
| Randabstand | Padding | 60 ms | 0 bis 300 ms |

---

## Tech-Entscheidungen

| Frage | Entscheidung | Grund |
|---|---|---|
| Platform | **Electron Desktop App (.exe)** | Offline-fähig, kein Browser nötig, lokale FFmpeg-Binary |
| Audio-Analyse | FFmpeg (native Binary via IPC) + Web Audio API | RMS-Analyse im Renderer, Schnitt via IPC |
| Audio-Konvertierung | FFmpeg | Alle Codecs verfügbar |
| Frontend | React 18 + Babel CDN (inline in app.html) | Schnelle Iteration, kein Build-Step |
| Prozess-Kommunikation | Electron IPC + contextBridge | Sicher, Renderer ↔ Main getrennt |
| Distribution | .exe via electron-builder | Direkt ausführbar |
| 3D Animation | Three.js r0.184 (ESM) + GLSL RawShaderMaterial | GPU-seitige Perlin-Noise Hügel-Animation |

---

## Design System

**Basis:** Impera Automation Brand Identity — Silent Luxury

| Token | Wert |
|---|---|
| Background | `#0d0d0b` |
| Surface | `#141410` / `#1a1a14` |
| Gold Primary | `#b8952a` |
| Gold Highlight | `#d4a832` |
| Text Primary | `#f0ead6` |
| Text Secondary | `#6b6550` |
| Cut Marker | `#8b3a2a` |
| Grid Texture | rgba(184,149,42,0.09) |
| Font Display | Cormorant Garamond (Spaced Caps) |
| Font UI | DM Mono |

---

## App-Struktur

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER — Impera Logo (echt SVG) + Nav: SILENCE | MERGE | KONV. │
├─────────────────────────────────────────────────────────────────┤
│  [SILENCE REMOVER MODE]                                         │
│  UPLOAD ZONE — Drag & Drop (Audio + Video: MP3/WAV/MP4/MOV/…)  │
│  WAVEFORM VIEWER — Wellenform, rote Stille-Marker               │
│    → Zonen per Drag resize (Kanten) oder verschieben (Body)     │
│  PREVIEW PLAYER — ▶/⏸ · Scrubber · Auto-Skip · Netto-Länge     │
│  CONTROLS — 3 Slider + Stille-Stats + Format/Qualität           │
│    → Audio: WAV / MP3 / FLAC  |  Video: MP4 / MP3 / WAV        │
│  EXPORT — Echter FFmpeg-Schnitt → Save Dialog → lokaler Speicher│
│  SEGMENT LIST — alle Stille-Segmente mit Timestamps             │
├─────────────────────────────────────────────────────────────────┤
│  [ZUSAMMENFÜHREN MODE]                                          │
│  MULTI-FILE UPLOAD — Mehrfachauswahl                            │
│  SORTIERBARE LISTE — kompakt, Datum+Uhrzeit aus mtime           │
│    → AUTO-SORT (nach mtime descending = neueste zuerst)         │
│    → LEEREN · + HINZUFÜGEN                                      │
│  FORMAT + QUALITÄT                                              │
│  "Zusammenführen & Silence Remover" → merged → direkt in Tab    │
│  "Zusammenführen & Exportieren" → Save Dialog                   │
├─────────────────────────────────────────────────────────────────┤
│  [KONVERTIERUNG MODE]                                           │
│  UPLOAD ZONE — MP4/Audio Drag & Drop                            │
│  FORMAT WAHL — MP3 / WAV / AAC / FLAC                           │
│  QUALITÄT — Hoch (320k) / Mittel (192k) / Niedrig               │
│  KONVERTIEREN → Fortschritt → Lokaler Speicher                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repo

| Repo | Beschreibung | Typ |
|---|---|---|
| `Mika4vondenen/impera-silence-remover` | Electron Desktop App (.exe) | Private |

🔗 https://github.com/Mika4vondenen/impera-silence-remover.git

---

## Projektdateien

```
impera-silence-remover/
├── main.js           — Electron Hauptprozess + FFmpeg IPC Handler
│                       (merge-audio, cut-audio, cut-video, convert-audio,
│                        read-file-buffer, get-file-stats, show-save-dialog,
│                        show-item-in-folder)
├── preload.js        — contextBridge API
├── splash.html       — Startscreen (Three.js GLSL Hügel-Animation, Gold-Grid, Impera Logo)
├── app.html          — Das Tool (JSX inline, React 18 + Babel CDN)
├── package.json
├── build/icon.ico
└── dist/             — Gebaute .exe Dateien
```

---

## Aktueller Stand

| Phase | Status |
|---|---|
| Konzept & Feature-Plan | ✅ Fertig |
| Design System definiert | ✅ Fertig |
| Splash Screen — GLSL Three.js Hügel-Animation (Gold, Perlin Noise) | ✅ Fertig |
| Splash Screen — Gold-Grid mit Fade-Übergang zur Animation | ✅ Fertig |
| Header-Logo — echtes Impera SVG | ✅ Fertig |
| Upload Zone (Drag & Drop) | ✅ Fertig |
| Waveform Viewer + Draggable Playhead | ✅ Fertig |
| Controls Panel + 3 Slider | ✅ Fertig |
| FFmpeg Audio-Analyse (RMS, Web Audio API) | ✅ Fertig |
| Silence Detection + Live-Segmente | ✅ Fertig |
| Preview Player — Play/Pause + Auto-Skip | ✅ Fertig |
| Preview Player — Scrubber (Zeitanzeige + Fortschrittsbalken) | ✅ Fertig |
| Echter Audio-Export via FFmpeg (cut-audio IPC) | ✅ Fertig |
| Timestamp-Export (.json) | ✅ Fertig |
| Format-Konvertierung (MP3/WAV/AAC/FLAC) | ✅ Fertig |
| Qualitäts-Selector (320k/192k/128k) | ✅ Fertig |
| Zusammenführen-Tab (merge-audio IPC, Multi-File) | ✅ Fertig |
| File-Stats IPC (get-file-stats → mtime/birthtime) | ✅ Fertig |
| AUTO-SORT nach mtime descending (neueste zuerst) | ✅ Fertig |
| Datei-Anzeige: DD.MM HH:MM · Sprachname (statt Dateiname-Timestamp) | ✅ Fertig |
| .exe Build via electron-builder | ✅ Fertig |
| GitHub Repo | ✅ Gepusht |
| MP4 / Video Silence Remover (cut-video IPC, H.264 + AAC Output) | ✅ Fertig |
| Stille-Zonen editierbar — Kanten resize + Zone verschieben per Drag | ✅ Fertig |
| Segment-Overrides (manuelle Edits bleiben bis Slider-Änderung) | ✅ Fertig |
| Splash Button — dunkler Backdrop + Blur über Wellen-Animation | ✅ Fertig |
| GitHub Release v1.5.0 — Setup.exe + Portable.exe | ✅ Fertig |
| Batch-Modus | ⏳ V6 |
| Preset-Speicher | ⏳ V6 |
| Code Signing (.exe ohne Warning) | ⏳ V6 |

---

## Session-History

### V5 — MP4 Cutting, editierbare Stille-Zonen, Splash Fix

#### MP4 / Video Silence Remover
- `main.js`: neuer `cut-video` IPC Handler — FFmpeg `filter_complex` mit `trim+setpts` für Video-Stream + `atrim+asetpts` für Audio-Stream
- Output: H.264 (`-preset fast -crf 18`) + AAC 192k
- `show-save-dialog` erkennt `isVideo` → zeigt `.mp4` Filter statt Audio-Formate
- `preload.js`: `cutVideo` + `showSaveDialog(name, isVideo)` exposed
- `app.html`: Upload Zone akzeptiert MP4/MOV/AVI/MKV — automatische Video-Erkennung beim Laden
- Format-Selector: Video → `[MP4, MP3, WAV]` | Audio → `[WAV, MP3, FLAC]`

#### Editierbare Stille-Zonen im Waveform
- Jede Stille-Zone hat **linken Handle** (ew-resize), **rechten Handle** (ew-resize) und **Body** (move)
- `startSegDrag(e, s, dragType)` — Mouse-Drag auf document mit `requestAnimationFrame`-freier Update-Rate
- Klick < 3px Bewegung → `onSeekSeg` wie bisher
- `segmentOverrides` State in App — Map `{[segIndex]: {start, end}}`
- `useEffect(() => setSegmentOverrides({}), [autoSegments])` — Reset bei Slider-Änderung
- Finale `segments` = `autoSegments` mit Overrides gemergt

#### Splash Button Fix
- `background: rgba(13,13,11,0.78)` + `backdrop-filter: blur(10px)` — Button hebt sich über die GLSL Wellen
- Text-Farbe auf helleres `#d4a832`, mehr Padding `18px 64px`

#### GitHub Release v1.5.0
- `npm run build` → `dist/IMPERA Silence Remover Setup 1.0.0.exe` + Portable
- `preload.js` in `package.json` build files ergänzt (war fehlend)
- Release: https://github.com/Mika4vondenen/impera-silence-remover/releases/tag/v1.5.0

---

### V4 — Splash Screen GLSL Animation + File Stats

#### Splash Screen — Three.js GLSL Hügel-Animation
- Alte CPU-Canvas-Animation durch Three.js WebGL ersetzt
- `RawShaderMaterial` mit Perlin-Noise Vertex-Shader (cnoise) — GPU-seitig
- Symmetrische Hügel links/rechts mit animiertem Tal in der Mitte
- Farbe: Impera Gold `#b8952a` (vec3(0.722, 0.584, 0.165))
- Kamera: position(0,16,125) lookAt(0,28,0) — exakt wie Referenz-Komponente
- Three.js r0.184 ESM via lokalem `node_modules/three/build/three.module.js`

#### Splash Screen — Gold-Grid Übergang
- Grid-Farbe von `#1e1e18` → `rgba(184,149,42,0.09)` (Gold-Tint)
- Grid-Maske: linearer Fade von oben (70% sichtbar) bis 72% transparent
- `#terrainFadeTop`: 62% hoch, weicher Zwischenstopp bei 30% Opacity
- Übergangszone 38–72%: Grid löst sich auf während Hügel auftauchen

#### File Stats & mtime-Sort
- `main.js`: neuer `get-file-stats` IPC Handler — `fs.statSync()` gibt `{ mtime, birthtime }`
- `preload.js`: `getFileStats(filePath)` über contextBridge exposed
- `app.html`: `addFiles` async — ruft `getFileStats` parallel auf, speichert `_mtime` als Date
- AUTO-SORT: sortiert nach `_mtime` descending (Download-Reihenfolge)

#### Datei-Anzeige im Merge-Tab
- `displayName(file)` statt `displayName(name)` — nimmt jetzt File-Objekt
- Zeigt `DD.MM HH:MM · Sprachname` statt Dateiname-Timestamp
- Timestamp-Teil aus Dateiname wird rausgestripped (`\d{2}_\d{2}_?\d{2}`)
- Datum/Uhrzeit kommt aus echtem `_mtime` (tatsächliche Download-Zeit)

### V3 — Preview Player Fix
- Root Cause: `AudioBufferSourceNode` nicht seekbar → Umstieg auf `<audio>`-Element
- Zwei-Wege Sync Waveform ↔ Player via `seekRef` + `onPlayheadChange`
- Echter Audio-Schnitt (cut-audio IPC), kein Fake-Timer mehr
- Codex Review Bugs: Windows-Pfade + `fetch('file://')` Probleme behoben

### V2 — Core Features
- FFmpeg Audio-Analyse, Waveform Viewer, 3 Slider, Format-Konvertierung
- Zusammenführen-Tab mit Smart-Namenskürzung (ElevenLabs-Prefix-Strip)
- Echter Audio-Export via FFmpeg

---

## Starten & Bauen

```bash
# Dev — App direkt starten
cd impera-silence-remover
npm install
npx electron .     # → Electron-Fenster öffnet sich

# Build — .exe erstellen
npm run build      # → dist/*.exe
```

---

## Download

**Neuester Release:** https://github.com/Mika4vondenen/impera-silence-remover/releases/latest

| Datei | Platform | Beschreibung |
|---|---|---|
| `IMPERA.Silence.Remover.Setup.*.exe` | Windows | Installer — Desktop-Verknüpfung, deinstallierbar (empfohlen) |
| `IMPERA.Silence.Remover.*.exe` | Windows | Portable — kein Install, einfach doppelklicken |
| `IMPERA.Silence.Remover-*.dmg` | macOS Intel | Für Macs mit Intel-Prozessor (vor 2020) |
| `IMPERA.Silence.Remover-*-arm64.dmg` | macOS Apple Silicon | Für Macs mit M1 / M2 / M3 / M4 (ab Ende 2020) |

**Welche Datei nehmen?**
- Windows → `Setup.exe`
- Mac → Apfel-Menü → "Über diesen Mac": steht **Apple M…** → `arm64.dmg`, steht **Intel** → normale `.dmg`

> ⚠️ **Windows:** Defender zeigt eine Warnung (App nicht signiert) → "Trotzdem ausführen"
> ⚠️ **Mac:** Beim ersten Start Rechtsklick → "Öffnen" (Gatekeeper-Bypass)

---

## CI / Build-Automatisierung

Builds laufen automatisch via **GitHub Actions** bei jedem Tag-Push (`v*`):

```
git tag v1.x.x
git push origin v1.x.x
→ GitHub baut Windows (.exe) + Mac (.dmg) und erstellt das Release automatisch
```

Workflow: `.github/workflows/build.yml`
- `build-windows` auf `windows-latest` → Setup.exe + Portable.exe
- `build-mac` auf `macos-latest` → x64.dmg + arm64.dmg
- `release` Job uploaded alle 4 Dateien ins GitHub Release

---

*Zuletzt aktualisiert: Juni 2026 — Impera Automation Internal — V5 MP4 Cutting + Mac Support*
