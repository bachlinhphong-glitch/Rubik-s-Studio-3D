/**
 * solver.js - Cube State Extraction, Color Classification & Kociemba Two-Phase Solver Integration
 *
 * Provides:
 * - WCA-compliant random scramble generator (20-25 moves)
 * - 54-facelet state extraction from 3D cubie positions & orientations
 * - Real-cube computer vision color classification (RGB -> HSV -> Rubik Face)
 * - Grid pixel sampling for camera/photo captures
 * - Kociemba Two-Phase algorithm execution via min2phase
 * - Solution parsing, move inversion, and validation
 */

(function(global) {
  'use strict';

  // Facelet order expected by Kociemba (min2phase):
  // U (0-8), R (9-17), F (18-26), D (27-35), L (36-44), B (45-53)
  const FACELET_GRID = [];

  // U: y = 1, normal (0, 1, 0)
  // Looking from +Y down: Back (-Z) is top, Front (+Z) is bottom, Left (-X) is left, Right (+X) is right
  for (let z = -1; z <= 1; z++) {
    for (let x = -1; x <= 1; x++) {
      FACELET_GRID.push({ face: 'U', pos: [x, 1, z], normal: [0, 1, 0] });
    }
  }

  // R: x = 1, normal (1, 0, 0)
  // Looking at R (+X): Up (+Y) is top, Front (+Z) is left, Back (-Z) is right
  for (let y = 1; y >= -1; y--) {
    for (let z = 1; z >= -1; z--) {
      FACELET_GRID.push({ face: 'R', pos: [1, y, z], normal: [1, 0, 0] });
    }
  }

  // F: z = 1, normal (0, 0, 1)
  // Looking at F (+Z): Up (+Y) is top, Down (-Y) is bottom, Left (-X) is left, Right (+X) is right
  for (let y = 1; y >= -1; y--) {
    for (let x = -1; x <= 1; x++) {
      FACELET_GRID.push({ face: 'F', pos: [x, y, 1], normal: [0, 0, 1] });
    }
  }

  // D: y = -1, normal (0, -1, 0)
  // Looking at D (-Y): Front (+Z) is top, Back (-Z) is bottom, Left (-X) is left, Right (+X) is right
  for (let z = 1; z >= -1; z--) {
    for (let x = -1; x <= 1; x++) {
      FACELET_GRID.push({ face: 'D', pos: [x, -1, z], normal: [0, -1, 0] });
    }
  }

  // L: x = -1, normal (-1, 0, 0)
  // Looking at L (-X): Up (+Y) is top, Back (-Z) is left, Front (+Z) is right
  for (let y = 1; y >= -1; y--) {
    for (let z = -1; z <= 1; z++) {
      FACELET_GRID.push({ face: 'L', pos: [-1, y, z], normal: [-1, 0, 0] });
    }
  }

  // B: z = -1, normal (0, 0, -1)
  // Looking at B (-Z): Up (+Y) is top, Right (+X) is left, Left (-X) is right
  for (let y = 1; y >= -1; y--) {
    for (let x = 1; x >= -1; x--) {
      FACELET_GRID.push({ face: 'B', pos: [x, y, -1], normal: [0, 0, -1] });
    }
  }

  /**
   * Standard WCA Western Color Scheme
   */
  const COLOR_SCHEME = {
    U: { name: 'White',  hex: 0xffffff, css: '#ffffff' },
    D: { name: 'Yellow', hex: 0xffd500, css: '#ffd500' },
    F: { name: 'Green',  hex: 0x009b48, css: '#009b48' },
    B: { name: 'Blue',   hex: 0x0046ad, css: '#0046ad' },
    R: { name: 'Red',    hex: 0xb71234, css: '#b71234' },
    L: { name: 'Orange', hex: 0xff5800, css: '#ff5800' }
  };

  const SOLVED_FACELETS = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

  /**
   * Converts RGB [0, 255] to HSV { h: [0, 360], s: [0, 1], v: [0, 1] }
   */
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s, v };
  }

  /**
   * Classifies an average RGB color to a Rubik's cube face notation (U, D, F, B, R, L)
   * using robust Hue-Saturation-Value (HSV) thresholding.
   */
  function classifyColorHSV(r, g, b) {
    const { h, s, v } = rgbToHsv(r, g, b);

    // 1. White: Low saturation or high brightness with low color tint
    if (s < 0.22 && v > 0.38) {
      return 'U'; // White
    }

    // 2. Yellow: Hue ~ 42 to 75 deg, decent saturation
    if (h >= 42 && h <= 75) {
      return 'D'; // Yellow
    }

    // 3. Green: Hue ~ 76 to 165 deg
    if (h > 75 && h <= 165) {
      return 'F'; // Green
    }

    // 4. Blue: Hue ~ 166 to 265 deg
    if (h > 165 && h <= 265) {
      return 'B'; // Blue
    }

    // 5. Orange: Hue ~ 15 to 41 deg
    if (h > 15 && h < 42) {
      return 'L'; // Orange
    }

    // 6. Red: Hue 0 to 15 deg or 266 to 360 deg
    return 'R'; // Red
  }

  /**
   * Samples 9 average colors from a 3x3 square region of a canvas or video element.
   * 
   * @param {HTMLCanvasElement|HTMLVideoElement|HTMLImageElement} source
   * @param {number} startX Crop start X
   * @param {number} startY Crop start Y
   * @param {number} size Crop box size
   * @returns {Array<{ r: number, g: number, b: number, colorKey: string }>} 9 sampled colors
   */
  function sampleFaceletColors(source, startX, startY, size) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(source, startX, startY, size, size, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    const cellSize = size / 3;
    const sampleRadius = Math.floor(cellSize * 0.25); // Sample central 50% of each cell to avoid sticker borders
    const results = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const centerX = Math.floor((col + 0.5) * cellSize);
        const centerY = Math.floor((row + 0.5) * cellSize);

        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
          for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
            const px = centerX + dx;
            const py = centerY + dy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              const idx = (py * size + px) * 4;
              sumR += data[idx];
              sumG += data[idx + 1];
              sumB += data[idx + 2];
              count++;
            }
          }
        }

        const avgR = Math.round(sumR / count);
        const avgG = Math.round(sumG / count);
        const avgB = Math.round(sumB / count);
        const colorKey = classifyColorHSV(avgR, avgG, avgB);

        results.push({
          r: avgR,
          g: avgG,
          b: avgB,
          colorKey,
          hex: COLOR_SCHEME[colorKey].css
        });
      }
    }

    return results;
  }

  /**
   * Validates color counts of a 54-facelet string.
   * Each color must appear exactly 9 times.
   */
  function validateFaceletCounts(faceletStr) {
    const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
    for (let i = 0; i < faceletStr.length; i++) {
      const c = faceletStr[i];
      if (counts[c] !== undefined) {
        counts[c]++;
      }
    }

    const missingOrExtra = [];
    let isCountValid = true;

    for (const [key, cnt] of Object.entries(counts)) {
      if (cnt !== 9) {
        isCountValid = false;
        missingOrExtra.push(`${COLOR_SCHEME[key].name}: ${cnt}/9`);
      }
    }

    return {
      isValid: isCountValid && faceletStr.length === 54,
      counts,
      message: isCountValid ? 'All 6 colors have exactly 9 stickers.' : missingOrExtra.join(', ')
    };
  }

  /**
   * Parses a single move token (e.g., "R", "U'", "F2") into its components.
   */
  function parseMove(token) {
    if (!token) return null;
    const raw = token.trim();
    if (!raw) return null;
    const face = raw[0].toUpperCase();
    const prime = raw.includes("'");
    const double = raw.includes('2');
    return { face, prime, double, raw };
  }

  /**
   * Computes the inverse of a move string.
   */
  function invertMove(moveStr) {
    const parsed = parseMove(moveStr);
    if (!parsed) return '';
    if (parsed.double) return `${parsed.face}2`;
    if (parsed.prime) return parsed.face;
    return `${parsed.face}'`;
  }

  /**
   * Inverts an entire sequence of moves.
   */
  function invertSequence(moves) {
    const tokens = Array.isArray(moves) ? moves : moves.trim().split(/\s+/);
    return tokens
      .filter(Boolean)
      .reverse()
      .map(invertMove);
  }

  /**
   * Generates a valid 20-move WCA compliant random scramble.
   */
  function generateWCAScramble(length = 20) {
    const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const axisMap = {
      U: 0, D: 0,
      R: 1, L: 1,
      F: 2, B: 2
    };

    const scramble = [];
    let lastFace = null;
    let secondLastFace = null;

    while (scramble.length < length) {
      const face = faces[Math.floor(Math.random() * faces.length)];
      const axis = axisMap[face];

      if (face === lastFace) continue;

      if (secondLastFace && axisMap[lastFace] === axis && axisMap[secondLastFace] === axis) {
        continue;
      }

      const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
      scramble.push(`${face}${mod}`);

      secondLastFace = lastFace;
      lastFace = face;
    }

    return scramble;
  }

  /**
   * Extracts the 54-facelet string from the active 3D cube model.
   */
  function extractFaceletString(cubies, THREE) {
    const tempNormal = new THREE.Vector3();
    let facelets = '';

    for (const slot of FACELET_GRID) {
      const [sx, sy, sz] = slot.pos;
      const [nx, ny, nz] = slot.normal;

      const cubie = cubies.find(c => {
        const cx = Math.round(c.position.x);
        const cy = Math.round(c.position.y);
        const cz = Math.round(c.position.z);
        return cx === sx && cy === sy && cz === sz;
      });

      if (!cubie || !cubie.userData.stickers) {
        console.warn(`Missing cubie at (${sx}, ${sy}, ${sz})`);
        facelets += '?';
        continue;
      }

      let matchedColor = '?';
      let maxDot = -Infinity;

      for (const sticker of cubie.userData.stickers) {
        tempNormal.copy(sticker.localNormal).applyQuaternion(cubie.quaternion);
        const dot = tempNormal.x * nx + tempNormal.y * ny + tempNormal.z * nz;
        if (dot > maxDot) {
          maxDot = dot;
          matchedColor = sticker.face;
        }
      }

      facelets += matchedColor;
    }

    return facelets;
  }

  /**
   * Checks whether the cube state is completely solved.
   */
  function isCubeSolved(faceletString) {
    return faceletString === SOLVED_FACELETS;
  }

  /**
   * Solves the current cube state using min2phase Kociemba Two-Phase algorithm.
   */
  async function solveCube(faceletString) {
    const startTime = performance.now();

    if (!faceletString || faceletString.length !== 54 || faceletString.includes('?')) {
      return {
        success: false,
        moves: [],
        raw: '',
        error: 'Invalid or incomplete cube state representation.',
        solveTimeMs: 0
      };
    }

    if (isCubeSolved(faceletString)) {
      return {
        success: true,
        moves: [],
        raw: '',
        alreadySolved: true,
        solveTimeMs: 0
      };
    }

    const solverInstance = (typeof window !== 'undefined' && window.min2phase) ? window.min2phase : null;

    if (!solverInstance) {
      return {
        success: false,
        moves: [],
        raw: '',
        error: 'Kociemba solver library (min2phase) is not loaded.',
        solveTimeMs: 0
      };
    }

    try {
      const rawSolution = solverInstance.solve(faceletString);
      const solveTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

      if (!rawSolution || rawSolution.startsWith('Error')) {
        return {
          success: false,
          moves: [],
          raw: rawSolution || 'Solver returned error',
          error: `Kociemba solver returned: ${rawSolution}`,
          solveTimeMs
        };
      }

      const moves = rawSolution.trim().split(/\s+/).filter(Boolean);

      return {
        success: true,
        moves,
        raw: rawSolution.trim(),
        alreadySolved: false,
        solveTimeMs
      };
    } catch (err) {
      return {
        success: false,
        moves: [],
        raw: '',
        error: err.message || 'Solver exception occurred.',
        solveTimeMs: Math.round((performance.now() - startTime) * 100) / 100
      };
    }
  }

  const RubikSolver = {
    FACELET_GRID,
    COLOR_SCHEME,
    SOLVED_FACELETS,
    rgbToHsv,
    classifyColorHSV,
    sampleFaceletColors,
    validateFaceletCounts,
    parseMove,
    invertMove,
    invertSequence,
    generateWCAScramble,
    extractFaceletString,
    isCubeSolved,
    solveCube
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RubikSolver;
  }
  global.RubikSolver = RubikSolver;

})(typeof window !== 'undefined' ? window : this);
