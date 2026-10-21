/**
 * solver.js - Cube State Extraction & Kociemba Two-Phase Solver Integration
 *
 * Provides:
 * - WCA-compliant random scramble generator (20-25 moves)
 * - 54-facelet state extraction from 3D cubie positions & orientations
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
   * e.g. "R" -> "R'", "U'" -> "U", "F2" -> "F2"
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
   * e.g. "R U R'" -> "R U' R'"
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
   * Avoids redundant moves on the same face or parallel axis.
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

      // Avoid sequences like R L R or U D U
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
   * 
   * @param {Array} cubies Array of THREE.Object3D representing individual cubies.
   * @param {THREE} THREE reference to Three.js library
   * @returns {string} 54-character string of faces (e.g., "UUUUUUUUURRRRRRRRR...")
   */
  function extractFaceletString(cubies, THREE) {
    const tempNormal = new THREE.Vector3();
    let facelets = '';

    for (const slot of FACELET_GRID) {
      const [sx, sy, sz] = slot.pos;
      const [nx, ny, nz] = slot.normal;

      // Find the cubie at slot position
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

      // Identify which sticker currently points towards slot.normal
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
    const solved = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
    return faceletString === solved;
  }

  /**
   * Solves the current cube state using min2phase Kociemba Two-Phase algorithm.
   * 
   * @param {string} faceletString 54-character state string
   * @returns {Promise<{ success: boolean, moves: string[], raw: string, error?: string, solveTimeMs: number }>}
   */
  async function solveCube(faceletString) {
    const startTime = performance.now();

    // Basic validation
    if (!faceletString || faceletString.length !== 54 || faceletString.includes('?')) {
      return {
        success: false,
        moves: [],
        raw: '',
        error: 'Invalid or incomplete cube state representation.',
        solveTimeMs: 0
      };
    }

    // Check if already solved
    if (isCubeSolved(faceletString)) {
      return {
        success: true,
        moves: [],
        raw: '',
        alreadySolved: true,
        solveTimeMs: 0
      };
    }

    // Ensure min2phase is loaded
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
