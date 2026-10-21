# Rubik's Studio 3D

An interactive, production-ready 3D Rubik's Cube web application built with **Three.js** and the **Kociemba Two-Phase Algorithm** (`min2phase`).

---

## Features

- **Real Physical Cube Scanner & AI Solver (Camera & Photos)**:
  - 📷 **Live Webcam / Camera Scanning**: Position each face inside the 3x3 viewfinder to automatically capture and recognize sticker colors.
  - 📁 **Photo Upload Support**: Upload photos of your physical Rubik's cube faces directly from your phone or PC.
  - 🎨 **HSV Color Classifier**: Intelligent color segmentation accounting for ambient shadows, lighting glare, and reflections.
  - ✏️ **2D Interactive Cube Net Editor**: Click any tile or use the color palette to manually inspect or correct colors before solving.
  - ⚡ **Seamless 3D Sync & Auto-Solve**: Instantly maps your real-life cube state onto the interactive 3D model, runs the Kociemba solver, and provides step-by-step 3D visual guidance to solve your real cube.
- **Physically-Modeled 3D Rubik's Cube (Three.js)**:
  - 26 individual cubies with rounded vinyl speedcube stickers and dark plastic cores.
  - Standard WCA Western Color Scheme:
    - **White** (Top / +Y) opposite **Yellow** (Bottom / -Y)
    - **Green** (Front / +Z) opposite **Blue** (Back / -Z)
    - **Red** (Right / +X) opposite **Orange** (Left / -X)
  - Realistic lighting with soft contact shadows, tone mapping (`ACESFilmicToneMapping`), and anti-aliasing.
- **Intuitive Touch & Mouse Layer Dragging**:
  - Click and drag directly on any outer face to rotate that specific layer in the dragged direction.
  - Automatic 3D tangent vector projection onto 2D screen space to detect user intent.
  - `OrbitControls` for free camera rotation around the cube (automatically disabled during layer drags).
- **Kociemba Two-Phase Solver Engine (`min2phase.js`)**:
  - Extracts the exact 54-facelet state representation directly from 3D cubie coordinates and quaternions.
  - Computes near-optimal solutions (sub-22 moves) in milliseconds (typically 5–35ms).
  - Detects if the cube is already solved.
- **Step-by-Step Playback Controller**:
  - Visual interactive filmstrip timeline displaying all solution move chips (`[R] [U'] [F2] ...`).
  - Active move highlighted with glowing accent, smooth auto-centering on scroll.
  - Controls: **Play / Pause Auto-Solve**, **Step Forward**, **Step Backward (Undo)**, and Jump to Step.
  - Real-time step counter (e.g. `Step 4 of 21`).
- **WCA Scramble & Instant Reset**:
  - Generates official WCA-compliant 20-move random scrambles avoiding redundant consecutive moves on the same axis.
  - Scramble animation with smooth fast playback.
  - Immediate reset to the solved state.
- **Modern Dark-Mode UI & Audio**:
  - Glassmorphic floating HUD with tabs: `[Controls]`, `[Algorithm]`, `[Settings]`.
  - Manual face turn buttons (`U`, `U'`, `D`, `D'`, `L`, `L'`, `R`, `R'`, `F`, `F'`, `B`, `B'`).
  - Adjustable rotation speed slider (80ms to 600ms).
  - Camera view presets: Isometric, Front, Top, Right.
  - Procedural Web Audio API sound effects (crisp mechanical plastic snap on every turn).
  - Responsive design adapting seamlessly to mobile and desktop screens.

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `U` / `D` / `L` / `R` / `F` / `B` | Turn corresponding face clockwise |
| `Shift` + `[Face]` | Turn corresponding face prime (counter-clockwise) |
| `Space` | Play / Pause auto-solve playback |
| `→` (Right Arrow) | Step forward in solution |
| `←` (Left Arrow) | Step backward in solution (undo move) |
| `S` | Generate and execute random 20-move scramble |
| `Enter` | Calculate Kociemba solution |
| `Esc` | Reset cube to solved state |

---

## Quick Start & Setup Instructions

Because the application uses modern standard ES Modules (`<script type="module">`), it must be served through a local HTTP server rather than opened via the `file://` protocol.

### Option 1: Python (Built into Windows / macOS / Linux)

Open a terminal in this directory (`d:\rubik`) and run:

```bash
python -m http.server 8000
```

Then open your browser to [http://localhost:8000](http://localhost:8000).

### Option 2: Windows One-Click

Double-click `start.bat` in this directory to automatically launch the local server and open your default browser.

### Option 3: Node / npx

```bash
npx serve .
```

---

## File Structure

```
d:\rubik/
├── index.html        # Main HTML structure, layout, and HUD
├── style.css         # Modern dark-mode styling, glassmorphism, animations
├── main.js           # Three.js scene, cubies, rotation engine, raycasting, HUD logic
├── solver.js         # Facelet extraction, Kociemba solver wrapper, move parsing/inversion
├── min2phase.js      # Self-contained Kociemba Two-Phase algorithm (Chen Shuang)
├── start.bat         # Windows one-click local server launcher
└── README.md         # Documentation and guide
```

---

## CDN Dependencies

- **Three.js** (v0.160.0): `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`
- **OrbitControls**: `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js`
- **min2phase.js**: Bundled locally with fallback to `https://cdn.jsdelivr.net/gh/cs0x7f/min2phase.js@master/min2phase.js`
