/**
 * main.js - 3D Rubik's Cube Engine, Raycasting Interaction, and Playback Controller
 *
 * Runs seamlessly in any browser directly via file:// or http://.
 */

(function(global) {
  'use strict';

  // Retrieve dependencies from global scope
  const THREE = global.THREE;
  if (!THREE) {
    console.error('Three.js is not loaded! Make sure three.min.js is included before main.js.');
    return;
  }

  const OrbitControls = THREE.OrbitControls || (global.THREE && global.THREE.OrbitControls);
  const Solver = global.RubikSolver;
  if (!Solver) {
    console.error('RubikSolver is not loaded! Make sure solver.js is included before main.js.');
    return;
  }

  const {
    COLOR_SCHEME,
    FACELET_GRID,
    parseMove,
    invertMove,
    generateWCAScramble,
    extractFaceletString,
    isCubeSolved,
    solveCube
  } = Solver;

  // --- Global App Configuration & State ---
  const CONFIG = {
    cubieSize: 0.96,
    cubeSpacing: 1.0,
    defaultTurnDuration: 250, // ms
    scrambleTurnDuration: 75, // ms
    defaultPlaybackSpeed: 300 // ms
  };

  class AudioFeedback {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    }

    playTurnSound() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        // Synthesize a crisp mechanical plastic cube click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(3.5, now);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.045);
      } catch {
        // AudioContext not allowed or not supported; gracefully ignore
      }
    }

    playSolveSound() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.18, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.2);
        });
      } catch {
        // Ignore
      }
    }
  }

  class RubikApp {
    constructor() {
      this.container = document.getElementById('canvas-container');
      this.cubies = [];
      this.audio = new AudioFeedback();

      // Scene & Rendering
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.pivot = null;

      // Materials & Textures
      this.stickerTextures = {};
      this.stickerMaterials = {};
      this.coreMaterial = null;

      // Animation & Rotation State
      this.turnQueue = [];
      this.isRotating = false;
      this.turnDuration = CONFIG.defaultTurnDuration;
      this.moveCount = 0;

      // Interaction / Raycasting State
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.pointerDownPos = new THREE.Vector2();
      this.dragStartPoint = new THREE.Vector3();
      this.dragNormal = new THREE.Vector3();
      this.dragCubie = null;
      this.isDraggingFace = false;
      this.dragResolved = false;

      // Solver & Playback State
      this.solutionMoves = [];
      this.currentStep = 0;
      this.isPlaying = false;
      this.playbackTimer = null;
      this.playbackSpeed = CONFIG.defaultPlaybackSpeed;
      this.lastScrambleStr = '';

      // Initialize
      this.initScene();
      this.initMaterials();
      this.createCube();
      this.setupInteractions();
      this.setupHUD();
      this.setupKeyboardShortcuts();
      this.animate();

      // Update status
      this.updateStatus('Solved', 'ready');
    }

    // --- Three.js Setup ---
    initScene() {
      this.scene = new THREE.Scene();

      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      this.camera.position.set(4.6, 4.2, 5.8);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Tone mapping
      if (THREE.ACESFilmicToneMapping) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
      }

      this.renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) {
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      this.container.appendChild(this.renderer.domElement);

      // OrbitControls
      if (OrbitControls) {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 3.5;
        this.controls.maxDistance = 14;
        this.controls.target.set(0, 0, 0);
      } else {
        console.warn('OrbitControls is not available.');
      }

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      this.scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight1.position.set(6, 9, 7);
      dirLight1.castShadow = true;
      if (dirLight1.shadow && dirLight1.shadow.mapSize) {
        dirLight1.shadow.mapSize.width = 1024;
        dirLight1.shadow.mapSize.height = 1024;
      }
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x90b0e0, 0.8);
      dirLight2.position.set(-6, -4, -6);
      this.scene.add(dirLight2);

      const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.7);
      dirLight3.position.set(-5, 6, 4);
      this.scene.add(dirLight3);

      // Soft Contact Shadow Plane underneath
      const shadowGeo = new THREE.PlaneGeometry(10, 10);
      const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
      const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -2.3;
      shadowPlane.receiveShadow = true;
      this.scene.add(shadowPlane);

      // Rotation pivot group
      this.pivot = new THREE.Group();
      this.scene.add(this.pivot);

      // Window Resize Handler
      window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    // --- Material & Vinyl Sticker Generation ---
    initMaterials() {
      // Matte dark core plastic
      this.coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x141416,
        roughness: 0.5,
        metalness: 0.1
      });

      // Create canvas textures for rounded speedcube stickers
      for (const [faceKey, scheme] of Object.entries(COLOR_SCHEME)) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Base black outline
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, 256, 256);

        // Rounded sticker face
        const margin = 12;
        const w = 256 - margin * 2;
        const h = 256 - margin * 2;
        const radius = 28;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(margin, margin, w, h, radius);
        } else {
          // Fallback if roundRect not supported
          ctx.rect(margin, margin, w, h);
        }
        ctx.fillStyle = scheme.css;
        ctx.fill();

        // Gloss gradient highlight
        const grad = ctx.createLinearGradient(margin, margin, margin + w, margin + h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner border line
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        if (THREE.SRGBColorSpace) {
          texture.colorSpace = THREE.SRGBColorSpace;
        } else if (THREE.sRGBEncoding) {
          texture.encoding = THREE.sRGBEncoding;
        }
        this.stickerTextures[faceKey] = texture;

        this.stickerMaterials[faceKey] = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.22,
          metalness: 0.05
        });
      }
    }

    // --- Cube Construction ---
    createCube() {
      for (const c of this.cubies) {
        this.scene.remove(c);
      }
      this.cubies = [];

      const size = CONFIG.cubieSize;
      const boxGeo = new THREE.BoxGeometry(size, size, size);

      // Sticker geometry
      const stickerSize = size * 0.88;
      const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);

      // Build 26 cubies (excluding hidden center 0,0,0)
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if (x === 0 && y === 0 && z === 0) continue;

            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.castShadow = true;

            // Black plastic core
            const coreMesh = new THREE.Mesh(boxGeo, this.coreMaterial);
            coreMesh.castShadow = true;
            coreMesh.receiveShadow = true;
            cubie.add(coreMesh);

            const stickers = [];
            const offset = size / 2 + 0.003;

            // Attach stickers for outer faces
            // +Y -> U (White)
            if (y === 1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.U);
              sm.position.set(0, offset, 0);
              sm.rotation.x = -Math.PI / 2;
              sm.userData = { face: 'U', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'U', localNormal: new THREE.Vector3(0, 1, 0), mesh: sm });
            }
            // -Y -> D (Yellow)
            if (y === -1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.D);
              sm.position.set(0, -offset, 0);
              sm.rotation.x = Math.PI / 2;
              sm.userData = { face: 'D', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'D', localNormal: new THREE.Vector3(0, -1, 0), mesh: sm });
            }
            // +X -> R (Red)
            if (x === 1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.R);
              sm.position.set(offset, 0, 0);
              sm.rotation.y = Math.PI / 2;
              sm.userData = { face: 'R', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'R', localNormal: new THREE.Vector3(1, 0, 0), mesh: sm });
            }
            // -X -> L (Orange)
            if (x === -1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.L);
              sm.position.set(-offset, 0, 0);
              sm.rotation.y = -Math.PI / 2;
              sm.userData = { face: 'L', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'L', localNormal: new THREE.Vector3(-1, 0, 0), mesh: sm });
            }
            // +Z -> F (Green)
            if (z === 1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.F);
              sm.position.set(0, 0, offset);
              sm.userData = { face: 'F', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'F', localNormal: new THREE.Vector3(0, 0, 1), mesh: sm });
            }
            // -Z -> B (Blue)
            if (z === -1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.B);
              sm.position.set(0, 0, -offset);
              sm.rotation.y = Math.PI;
              sm.userData = { face: 'B', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'B', localNormal: new THREE.Vector3(0, 0, -1), mesh: sm });
            }

            cubie.userData = {
              initialPos: new THREE.Vector3(x, y, z),
              stickers,
              isCubie: true
            };

            this.scene.add(cubie);
            this.cubies.push(cubie);
          }
        }
      }
    }

    // --- Layer Rotation & Queue Management ---

    queueMove(move, options = {}) {
      const parsed = typeof move === 'string' ? parseMove(move) : move;
      if (!parsed) return;

      const duration = options.duration !== undefined ? options.duration : this.turnDuration;

      this.turnQueue.push({
        ...parsed,
        duration,
        onComplete: options.onComplete
      });

      if (!this.isRotating) {
        this.processNextTurn();
      }
    }

    queueSequence(moves, options = {}) {
      const list = Array.isArray(moves) ? moves : moves.trim().split(/\s+/).filter(Boolean);
      const duration = options.duration !== undefined ? options.duration : this.turnDuration;
      list.forEach((m, idx) => {
        const isLast = idx === list.length - 1;
        this.queueMove(m, {
          duration,
          onComplete: isLast ? options.onComplete : undefined
        });
      });
    }

    snapCubieTransform(cubie) {
      cubie.position.x = Math.round(cubie.position.x);
      cubie.position.y = Math.round(cubie.position.y);
      cubie.position.z = Math.round(cubie.position.z);

      cubie.updateMatrix();
      const m = cubie.matrix.elements;

      const vx = new THREE.Vector3(m[0], m[1], m[2]).normalize();
      const vy = new THREE.Vector3(m[4], m[5], m[6]).normalize();
      const vz = new THREE.Vector3(m[8], m[9], m[10]).normalize();

      const snapVec = (v) => {
        const ax = Math.abs(v.x);
        const ay = Math.abs(v.y);
        const az = Math.abs(v.z);
        if (ax > ay && ax > az) {
          return new THREE.Vector3(Math.sign(v.x), 0, 0);
        } else if (ay > ax && ay > az) {
          return new THREE.Vector3(0, Math.sign(v.y), 0);
        } else {
          return new THREE.Vector3(0, 0, Math.sign(v.z));
        }
      };

      const svx = snapVec(vx);
      const svy = snapVec(vy);
      const svz = new THREE.Vector3().crossVectors(svx, svy).normalize();

      const snappedMat = new THREE.Matrix4().makeBasis(svx, svy, svz);
      cubie.quaternion.setFromRotationMatrix(snappedMat);
      cubie.updateMatrixWorld(true);
    }

    processNextTurn() {
      if (this.turnQueue.length === 0) {
        this.isRotating = false;
        return;
      }

      this.isRotating = true;
      const turn = this.turnQueue.shift();

      let axis, coordKey, coordVal, baseAngle;

      switch (turn.face) {
        case 'U':
          axis = new THREE.Vector3(0, 1, 0);
          coordKey = 'y';
          coordVal = 1;
          baseAngle = -Math.PI / 2;
          break;
        case 'D':
          axis = new THREE.Vector3(0, 1, 0);
          coordKey = 'y';
          coordVal = -1;
          baseAngle = Math.PI / 2;
          break;
        case 'R':
          axis = new THREE.Vector3(1, 0, 0);
          coordKey = 'x';
          coordVal = 1;
          baseAngle = -Math.PI / 2;
          break;
        case 'L':
          axis = new THREE.Vector3(1, 0, 0);
          coordKey = 'x';
          coordVal = -1;
          baseAngle = Math.PI / 2;
          break;
        case 'F':
          axis = new THREE.Vector3(0, 0, 1);
          coordKey = 'z';
          coordVal = 1;
          baseAngle = -Math.PI / 2;
          break;
        case 'B':
          axis = new THREE.Vector3(0, 0, 1);
          coordKey = 'z';
          coordVal = -1;
          baseAngle = Math.PI / 2;
          break;
        default:
          console.warn('Unknown turn face:', turn.face);
          this.isRotating = false;
          return;
      }

      let targetAngle = baseAngle;
      if (turn.prime) targetAngle = -targetAngle;
      if (turn.double) targetAngle = targetAngle * 2;

      this.pivot.rotation.set(0, 0, 0);
      this.pivot.position.set(0, 0, 0);
      this.pivot.updateMatrixWorld(true);

      const layerCubies = [];
      for (const cubie of this.cubies) {
        const posVal = Math.round(cubie.position[coordKey]);
        if (posVal === coordVal) {
          layerCubies.push(cubie);
          this.pivot.attach(cubie);
        }
      }

      const duration = turn.duration;

      // Instant execution if duration <= 0
      if (duration <= 0) {
        this.pivot.quaternion.setFromAxisAngle(axis, targetAngle);
        this.pivot.updateMatrixWorld(true);

        for (const cubie of layerCubies) {
          this.scene.attach(cubie);
          this.snapCubieTransform(cubie);
        }

        this.moveCount++;
        this.updateMoveCounter();
        this.checkSolvedState();

        if (turn.onComplete) {
          turn.onComplete();
        }

        this.processNextTurn();
        return;
      }

      const startTime = performance.now();
      this.audio.playTurnSound();

      const animateRotation = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        this.pivot.quaternion.setFromAxisAngle(axis, targetAngle * ease);

        if (progress < 1) {
          requestAnimationFrame(animateRotation);
        } else {
          this.pivot.quaternion.setFromAxisAngle(axis, targetAngle);
          this.pivot.updateMatrixWorld(true);

          for (const cubie of layerCubies) {
            this.scene.attach(cubie);
            this.snapCubieTransform(cubie);
          }

          this.moveCount++;
          this.updateMoveCounter();
          this.checkSolvedState();

          if (turn.onComplete) {
            turn.onComplete();
          }

          this.processNextTurn();
        }
      };

      requestAnimationFrame(animateRotation);
    }

    // --- Raycasting & Drag-to-Rotate Interaction ---
    setupInteractions() {
      const el = this.renderer.domElement;

      const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (this.isRotating) return;

        const rect = el.getBoundingClientRect();
        this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.pointerDownPos.set(e.clientX, e.clientY);

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const stickerMeshes = [];
        for (const cubie of this.cubies) {
          for (const s of cubie.userData.stickers) {
            stickerMeshes.push(s.mesh);
          }
        }

        const intersects = this.raycaster.intersectObjects(stickerMeshes, false);

        if (intersects.length > 0) {
          const hit = intersects[0];
          const hitSticker = hit.object;
          this.dragCubie = hitSticker.parent;

          const localNorm = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
          this.dragNormal.copy(localNorm).transformDirection(hitSticker.matrixWorld).normalize();

          const nx = Math.abs(this.dragNormal.x);
          const ny = Math.abs(this.dragNormal.y);
          const nz = Math.abs(this.dragNormal.z);
          if (nx > ny && nx > nz) {
            this.dragNormal.set(Math.sign(this.dragNormal.x), 0, 0);
          } else if (ny > nx && ny > nz) {
            this.dragNormal.set(0, Math.sign(this.dragNormal.y), 0);
          } else {
            this.dragNormal.set(0, 0, Math.sign(this.dragNormal.z));
          }

          this.dragStartPoint.copy(hit.point);
          this.isDraggingFace = true;
          this.dragResolved = false;

          if (this.controls) this.controls.enabled = false;
        }
      };

      const onPointerMove = (e) => {
        if (!this.isDraggingFace || this.dragResolved || this.isRotating) return;

        const dx = e.clientX - this.pointerDownPos.x;
        const dy = e.clientY - this.pointerDownPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 14) return;

        const screenDrag = new THREE.Vector2(dx, -dy).normalize();
        const N = this.dragNormal;
        let T1, T2;

        if (Math.abs(N.y) > 0.9) {
          T1 = new THREE.Vector3(1, 0, 0);
          T2 = new THREE.Vector3(0, 0, 1);
        } else if (Math.abs(N.x) > 0.9) {
          T1 = new THREE.Vector3(0, 0, 1);
          T2 = new THREE.Vector3(0, 1, 0);
        } else {
          T1 = new THREE.Vector3(1, 0, 0);
          T2 = new THREE.Vector3(0, 1, 0);
        }

        const p0 = this.dragStartPoint.clone();
        const p1 = p0.clone().addScaledVector(T1, 0.5);
        const p2 = p0.clone().addScaledVector(T2, 0.5);

        const toScreen = (v) => {
          const p = v.clone().project(this.camera);
          const rect = el.getBoundingClientRect();
          return new THREE.Vector2(
            ((p.x + 1) * rect.width) / 2,
            ((1 - p.y) * rect.height) / 2
          );
        };

        const s0 = toScreen(p0);
        const s1 = toScreen(p1);
        const s2 = toScreen(p2);

        const v1 = new THREE.Vector2(s1.x - s0.x, -(s1.y - s0.y)).normalize();
        const v2 = new THREE.Vector2(s2.x - s0.x, -(s2.y - s0.y)).normalize();

        const dot1 = screenDrag.dot(v1);
        const dot2 = screenDrag.dot(v2);

        let chosenTangent, chosenSign;
        if (Math.abs(dot1) > Math.abs(dot2)) {
          chosenTangent = T1.clone();
          chosenSign = Math.sign(dot1);
        } else {
          chosenTangent = T2.clone();
          chosenSign = Math.sign(dot2);
        }

        const rotAxis = new THREE.Vector3().crossVectors(N, chosenTangent).normalize();
        if (chosenSign < 0) {
          rotAxis.negate();
        }

        const turn = this.determineLayerTurn(rotAxis, this.dragCubie);
        if (turn) {
          this.queueMove(turn);
          this.dragResolved = true;
        }
      };

      const onPointerUp = () => {
        this.isDraggingFace = false;
        this.dragResolved = false;
        if (this.controls) this.controls.enabled = true;
      };

      el.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    determineLayerTurn(rotAxis, cubie) {
      const ax = Math.abs(rotAxis.x);
      const ay = Math.abs(rotAxis.y);
      const az = Math.abs(rotAxis.z);
      const pos = cubie.position;

      if (ay > 0.8) {
        const signY = Math.sign(rotAxis.y);
        const layerY = Math.round(pos.y);

        if (layerY === 1) {
          return signY < 0 ? 'U' : "U'";
        } else if (layerY === -1) {
          return signY > 0 ? 'D' : "D'";
        }
      }

      if (ax > 0.8) {
        const signX = Math.sign(rotAxis.x);
        const layerX = Math.round(pos.x);

        if (layerX === 1) {
          return signX < 0 ? 'R' : "R'";
        } else if (layerX === -1) {
          return signX > 0 ? 'L' : "L'";
        }
      }

      if (az > 0.8) {
        const signZ = Math.sign(rotAxis.z);
        const layerZ = Math.round(pos.z);

        if (layerZ === 1) {
          return signZ < 0 ? 'F' : "F'";
        } else if (layerZ === -1) {
          return signZ > 0 ? 'B' : "B'";
        }
      }

      return null;
    }

    // --- Scramble & Reset ---

    scramble() {
      if (this.isRotating) return;
      this.stopPlayback();

      const moves = generateWCAScramble(20);
      this.lastScrambleStr = moves.join(' ');
      this.updateScrambleDisplay(this.lastScrambleStr);

      this.updateStatus('Scrambling...', 'busy');

      this.queueSequence(moves, {
        duration: CONFIG.scrambleTurnDuration,
        onComplete: () => {
          this.updateStatus('Scrambled', 'scrambled');
          this.clearSolutionUI();
        }
      });
    }

    resetCube() {
      this.stopPlayback();
      this.turnQueue = [];
      this.isRotating = false;

      this.createCube();
      this.moveCount = 0;
      this.updateMoveCounter();
      this.clearSolutionUI();
      this.updateStatus('Solved', 'ready');
    }

    // --- Solver Engine & Step-by-Step Playback ---

    async solve() {
      if (this.isRotating) return;

      this.updateStatus('Calculating Solution...', 'busy');
      const faceletStr = extractFaceletString(this.cubies, THREE);

      if (isCubeSolved(faceletStr)) {
        this.updateStatus('Cube is already solved!', 'ready');
        this.audio.playSolveSound();
        return;
      }

      const result = await solveCube(faceletStr);

      if (!result.success) {
        this.updateStatus(`Solver Error: ${result.error}`, 'error');
        alert(`Could not solve cube: ${result.error}`);
        return;
      }

      this.solutionMoves = result.moves;
      this.currentStep = 0;

      this.updateStatus(`Solved in ${result.moves.length} moves (${result.solveTimeMs}ms)`, 'solved');
      this.buildSolutionTimeline(result.moves);
      this.switchTab('solution-tab');
    }

    buildSolutionTimeline(moves) {
      const listEl = document.getElementById('solution-timeline');
      const fullAlgEl = document.getElementById('full-algorithm-text');
      const countEl = document.getElementById('solution-move-count');

      if (listEl) {
        listEl.innerHTML = '';
        moves.forEach((move, index) => {
          const chip = document.createElement('button');
          chip.className = `move-chip ${index === 0 ? 'active' : ''}`;
          chip.dataset.step = index;
          chip.innerHTML = `<span class="chip-step">${index + 1}</span><span class="chip-move">${move}</span>`;
          chip.addEventListener('click', () => this.jumpToStep(index));
          listEl.appendChild(chip);
        });
      }

      if (fullAlgEl) {
        fullAlgEl.textContent = moves.join(' ');
      }

      if (countEl) {
        countEl.textContent = `${moves.length} moves`;
      }

      this.updatePlaybackControls();
    }

    updateSolutionHighlight() {
      const chips = document.querySelectorAll('.move-chip');
      chips.forEach((chip, idx) => {
        chip.classList.toggle('active', idx === this.currentStep);
        chip.classList.toggle('completed', idx < this.currentStep);
      });

      const activeChip = document.querySelector('.move-chip.active');
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      this.updatePlaybackControls();
    }

    updatePlaybackControls() {
      const stepDisplay = document.getElementById('playback-step-display');
      const playBtn = document.getElementById('btn-play-pause');
      const prevBtn = document.getElementById('btn-step-prev');
      const nextBtn = document.getElementById('btn-step-next');

      if (stepDisplay) {
        const total = this.solutionMoves.length;
        stepDisplay.textContent = total > 0 ? `Step ${this.currentStep} of ${total}` : 'No active solution';
      }

      if (playBtn) {
        playBtn.innerHTML = this.isPlaying
          ? '<span class="icon">⏸</span> Pause'
          : '<span class="icon">▶</span> Play';
        playBtn.disabled = this.solutionMoves.length === 0 || this.currentStep >= this.solutionMoves.length;
      }

      if (prevBtn) {
        prevBtn.disabled = this.currentStep <= 0 || this.isRotating;
      }

      if (nextBtn) {
        nextBtn.disabled = this.currentStep >= this.solutionMoves.length || this.isRotating;
      }
    }

    togglePlayPause() {
      if (this.isPlaying) {
        this.stopPlayback();
      } else {
        this.startPlayback();
      }
    }

    startPlayback() {
      if (this.solutionMoves.length === 0 || this.currentStep >= this.solutionMoves.length) {
        return;
      }
      this.isPlaying = true;
      this.updatePlaybackControls();
      this.playNextAutoStep();
    }

    stopPlayback() {
      this.isPlaying = false;
      if (this.playbackTimer) {
        clearTimeout(this.playbackTimer);
        this.playbackTimer = null;
      }
      this.updatePlaybackControls();
    }

    playNextAutoStep() {
      if (!this.isPlaying) return;

      if (this.currentStep >= this.solutionMoves.length) {
        this.stopPlayback();
        this.updateStatus('Cube Solved!', 'ready');
        this.audio.playSolveSound();
        return;
      }

      const move = this.solutionMoves[this.currentStep];
      this.currentStep++;
      this.updateSolutionHighlight();

      this.queueMove(move, {
        duration: this.playbackSpeed,
        onComplete: () => {
          if (this.isPlaying) {
            this.playbackTimer = setTimeout(() => {
              this.playNextAutoStep();
            }, 40);
          }
        }
      });
    }

    stepForward() {
      if (this.isRotating || this.currentStep >= this.solutionMoves.length) return;
      this.stopPlayback();

      const move = this.solutionMoves[this.currentStep];
      this.currentStep++;
      this.updateSolutionHighlight();

      this.queueMove(move, {
        duration: this.turnDuration,
        onComplete: () => {
          this.updatePlaybackControls();
        }
      });
    }

    stepBackward() {
      if (this.isRotating || this.currentStep <= 0) return;
      this.stopPlayback();

      this.currentStep--;
      const forwardMove = this.solutionMoves[this.currentStep];
      const backwardMove = invertMove(forwardMove);
      this.updateSolutionHighlight();

      this.queueMove(backwardMove, {
        duration: this.turnDuration,
        onComplete: () => {
          this.updatePlaybackControls();
        }
      });
    }

    jumpToStep(targetIndex) {
      if (this.isRotating || targetIndex === this.currentStep) return;
      this.stopPlayback();

      if (targetIndex > this.currentStep) {
        const movesToExecute = this.solutionMoves.slice(this.currentStep, targetIndex);
        this.currentStep = targetIndex;
        this.updateSolutionHighlight();
        this.queueSequence(movesToExecute, { duration: 100 });
      } else {
        const movesToUndo = this.solutionMoves.slice(targetIndex, this.currentStep).reverse();
        const inverted = movesToUndo.map(invertMove);
        this.currentStep = targetIndex;
        this.updateSolutionHighlight();
        this.queueSequence(inverted, { duration: 100 });
      }
    }

    clearSolutionUI() {
      this.solutionMoves = [];
      this.currentStep = 0;
      this.stopPlayback();

      const listEl = document.getElementById('solution-timeline');
      const fullAlgEl = document.getElementById('full-algorithm-text');
      const countEl = document.getElementById('solution-move-count');

      if (listEl) listEl.innerHTML = '<div class="empty-timeline">Click "Solve Cube" to generate solution.</div>';
      if (fullAlgEl) fullAlgEl.textContent = 'None';
      if (countEl) countEl.textContent = '0 moves';

      this.updatePlaybackControls();
    }

    checkSolvedState() {
      const faceletStr = extractFaceletString(this.cubies, THREE);
      if (isCubeSolved(faceletStr)) {
        this.updateStatus('Cube Solved!', 'ready');
      }
    }

    // --- UI and HUD Binding ---
    setupHUD() {
      // Tab switching
      const tabBtns = document.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.dataset.tab;
          this.switchTab(targetTab);
        });
      });

      // Primary Buttons
      document.getElementById('btn-scramble')?.addEventListener('click', () => this.scramble());
      document.getElementById('btn-solve')?.addEventListener('click', () => this.solve());
      document.getElementById('btn-reset')?.addEventListener('click', () => this.resetCube());

      // Playback Buttons
      document.getElementById('btn-play-pause')?.addEventListener('click', () => this.togglePlayPause());
      document.getElementById('btn-step-prev')?.addEventListener('click', () => this.stepBackward());
      document.getElementById('btn-step-next')?.addEventListener('click', () => this.stepForward());

      // Speed Slider
      const speedSlider = document.getElementById('speed-slider');
      const speedValDisplay = document.getElementById('speed-val-display');
      if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.turnDuration = val;
          this.playbackSpeed = val;
          if (speedValDisplay) speedValDisplay.textContent = `${val}ms`;
        });
      }

      // Manual Face Buttons
      const manualBtns = document.querySelectorAll('.manual-turn-btn');
      manualBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const move = btn.dataset.move;
          if (move) this.queueMove(move);
        });
      });

      // Copy Solution Button
      document.getElementById('btn-copy-solution')?.addEventListener('click', () => {
        if (this.solutionMoves.length > 0) {
          navigator.clipboard.writeText(this.solutionMoves.join(' '));
          const btn = document.getElementById('btn-copy-solution');
          const origText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = origText; }, 1500);
        }
      });

      // Camera preset buttons
      document.querySelectorAll('.camera-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = btn.dataset.preset;
          this.setCameraPreset(preset);
        });
      });

      // Sound toggle
      const soundToggle = document.getElementById('sound-toggle');
      if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
          this.audio.enabled = e.target.checked;
        });
      }
    }

    switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
      });
    }

    setCameraPreset(preset) {
      const targetPos = new THREE.Vector3();
      switch (preset) {
        case 'iso':
          targetPos.set(4.6, 4.2, 5.8);
          break;
        case 'front':
          targetPos.set(0, 0, 7.5);
          break;
        case 'top':
          targetPos.set(0, 7.5, 0.001);
          break;
        case 'right':
          targetPos.set(7.5, 0, 0);
          break;
        default:
          targetPos.set(4.6, 4.2, 5.8);
      }

      const startPos = this.camera.position.clone();
      const startTime = performance.now();
      const duration = 500;

      const animateCam = (now) => {
        const p = Math.min((now - startTime) / duration, 1);
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        this.camera.position.lerpVectors(startPos, targetPos, ease);
        this.camera.lookAt(0, 0, 0);
        if (this.controls) this.controls.target.set(0, 0, 0);

        if (p < 1) {
          requestAnimationFrame(animateCam);
        }
      };
      requestAnimationFrame(animateCam);
    }

    updateStatus(text, type = 'ready') {
      const el = document.getElementById('status-badge');
      if (el) {
        el.textContent = text;
        el.className = `status-badge status-${type}`;
      }
    }

    updateMoveCounter() {
      const el = document.getElementById('move-count-display');
      if (el) el.textContent = `${this.moveCount}`;
    }

    updateScrambleDisplay(scrambleStr) {
      const el = document.getElementById('scramble-text');
      if (el) el.textContent = scrambleStr;
    }

    setupKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        const key = e.key.toUpperCase();
        const isShift = e.shiftKey;

        if (['U', 'D', 'L', 'R', 'F', 'B'].includes(key)) {
          const move = isShift ? `${key}'` : key;
          this.queueMove(move);
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          this.togglePlayPause();
        } else if (e.code === 'ArrowRight') {
          this.stepForward();
        } else if (e.code === 'ArrowLeft') {
          this.stepBackward();
        } else if (key === 'S' && !e.ctrlKey) {
          this.scramble();
        } else if (e.code === 'Enter') {
          this.solve();
        } else if (e.code === 'Escape') {
          this.resetCube();
        }
      });
    }

    // --- Animation Loop ---
    animate() {
      requestAnimationFrame(() => this.animate());
      if (this.controls) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Expose to global scope
  global.RubikApp = RubikApp;
  global.AudioFeedback = AudioFeedback;
  global.CONFIG = CONFIG;

  // Bootstrap application on DOM ready or immediately if already loaded
  function initApp() {
    if (!global.app) {
      global.app = new RubikApp();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(typeof window !== 'undefined' ? window : this);
