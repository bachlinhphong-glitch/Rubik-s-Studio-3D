/**
 * main.js - 3D Rubik's Cube Engine, Raycasting Interaction, Step-by-Step Playback,
 * and AI Camera/Photo Color Scanner for Real Physical Cubes.
 */

(function(global) {
  'use strict';

  // Dependencies
  const THREE = global.THREE;
  if (!THREE) {
    console.error('Three.js is not loaded! Make sure three.min.js is included.');
    return;
  }

  const OrbitControls = THREE.OrbitControls || (global.THREE && global.THREE.OrbitControls);
  const Solver = global.RubikSolver;
  if (!Solver) {
    console.error('RubikSolver is not loaded! Make sure solver.js is included.');
    return;
  }

  const {
    COLOR_SCHEME,
    FACELET_GRID,
    SOLVED_FACELETS,
    sampleFaceletColors,
    validateFaceletCounts,
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

  // --- Personalization Schemes & Themes ---
  const THEMES = {
    classic: {
      name: 'WCA Classic (Tiêu Chuẩn)',
      colors: {
        U: { name: 'White', hex: 0xffffff, css: '#ffffff' },
        D: { name: 'Yellow', hex: 0xffd500, css: '#ffd500' },
        F: { name: 'Green', hex: 0x009b48, css: '#009b48' },
        B: { name: 'Blue', hex: 0x0046ad, css: '#0046ad' },
        R: { name: 'Red', hex: 0xb71234, css: '#b71234' },
        L: { name: 'Orange', hex: 0xff5800, css: '#ff5800' }
      }
    },
    cyberpunk: {
      name: 'Cyberpunk Neon (Dạ Quang)',
      colors: {
        U: { name: 'Ice White', hex: 0xe0f2fe, css: '#e0f2fe' },
        D: { name: 'Neon Yellow', hex: 0xfacc15, css: '#facc15' },
        F: { name: 'Acid Green', hex: 0x22c55e, css: '#22c55e' },
        B: { name: 'Electric Cyan', hex: 0x06b6d4, css: '#06b6d4' },
        R: { name: 'Neon Pink', hex: 0xf43f5e, css: '#f43f5e' },
        L: { name: 'Laser Orange', hex: 0xf97316, css: '#f97316' }
      }
    },
    pastel: {
      name: 'Pastel Aesthetic (Dịu Mắt)',
      colors: {
        U: { name: 'Pearl Cream', hex: 0xfdfbf7, css: '#fdfbf7' },
        D: { name: 'Soft Butter', hex: 0xfef08a, css: '#fef08a' },
        F: { name: 'Mint Green', hex: 0x86efac, css: '#86efac' },
        B: { name: 'Sky Blue', hex: 0x7dd3fc, css: '#7dd3fc' },
        R: { name: 'Coral Rose', hex: 0xfca5a5, css: '#fca5a5' },
        L: { name: 'Peach Orange', hex: 0xfdba74, css: '#fdba74' }
      }
    },
    carbon: {
      name: 'Carbon Stealth (Siêu Xe)',
      colors: {
        U: { name: 'Silver Slate', hex: 0xf1f5f9, css: '#f1f5f9' },
        D: { name: 'Racing Gold', hex: 0xeab308, css: '#eab308' },
        F: { name: 'Emerald Race', hex: 0x10b981, css: '#10b981' },
        B: { name: 'Royal Blue', hex: 0x2563eb, css: '#2563eb' },
        R: { name: 'Crimson Red', hex: 0xef4444, css: '#ef4444' },
        L: { name: 'Sunset Amber', hex: 0xf97316, css: '#f97316' }
      }
    },
    vintage: {
      name: 'Vintage 80s (Cổ Điển)',
      colors: {
        U: { name: 'Warm Cream', hex: 0xfef3c7, css: '#fef3c7' },
        D: { name: 'Mustard Gold', hex: 0xd97706, css: '#d97706' },
        F: { name: 'Pine Forest', hex: 0x059669, css: '#059669' },
        B: { name: 'Navy Blue', hex: 0x1d4ed8, css: '#1d4ed8' },
        R: { name: 'Brick Red', hex: 0xdc2626, css: '#dc2626' },
        L: { name: 'Rust Orange', hex: 0xea580c, css: '#ea580c' }
      }
    }
  };

  const FINISHES = {
    matte: { name: 'Frosted Matte (Nhám Lì Gan MagLev)', roughness: 0.62, metalness: 0.04 },
    glossy: { name: 'Glossy Vinyl (Bóng Bẩy)', roughness: 0.16, metalness: 0.08 },
    metallic: { name: 'Metallic Chrome (Kim Loại)', roughness: 0.26, metalness: 0.8 }
  };

  const CORES = {
    black: { name: 'Black Core (Nhựa Đen)', color: 0x121316 },
    primary: { name: 'Milky White (Trắng Sữa)', color: 0xe2e8f0 },
    midnight: { name: 'Midnight Cyber (Tím Đêm)', color: 0x1e1b4b }
  };

  class AudioFeedback {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.soundPack = 'magnetic'; // 'magnetic' | 'keyboard' | 'acoustic' | 'mute'
      this.volume = 0.5;
      this.hapticsEnabled = true;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    }

    playTurnSound() {
      if (!this.enabled || this.soundPack === 'mute') return;

      // Haptic Vibration on mobile devices
      if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(12); } catch {}
      }

      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        if (this.soundPack === 'keyboard') {
          // Thocky mechanical switch
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          osc.type = 'square';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);
          gain.gain.setValueAtTime(0.22 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        } else if (this.soundPack === 'acoustic') {
          // Acoustic wood snap
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1800, now);
          filter.Q.setValueAtTime(4.0, now);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
          gain.gain.setValueAtTime(0.3 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        } else {
          // 'magnetic' speedcube snap
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.Q.setValueAtTime(3.5, now);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);
          gain.gain.setValueAtTime(0.28 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        }

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.055);
      } catch {}
    }

    playSolveSound() {
      if (!this.enabled || this.soundPack === 'mute') return;
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.18 * this.volume, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.2);
        });
      } catch {}
    }

    playCelebrationFanfare() {
      if (!this.enabled || this.soundPack === 'mute') return;
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        // Joyful fanfare: C5, E5, G5, C6 (chord arpeggio)
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.25 * this.volume, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.4);
        });
      } catch {}
    }

    playBeep(freq = 880, duration = 0.08) {
      if (!this.enabled || this.soundPack === 'mute') return;
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.2 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      } catch {}
    }
  }

  // ==========================================================================
  // Celebration Confetti Particle Engine (Zero Dependency)
  // ==========================================================================
  class ConfettiCelebration {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.animating = false;
    }

    init() {
      if (!this.canvas) {
        this.canvas = document.getElementById('confetti-canvas');
        if (!this.canvas) {
          this.canvas = document.createElement('canvas');
          this.canvas.id = 'confetti-canvas';
          this.canvas.className = 'confetti-layer';
          document.body.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', () => this.resize());
        this.resize();
      }
    }

    resize() {
      if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
    }

    burst(count = 140) {
      this.init();
      const colors = ['#38bdf8', '#818cf8', '#34d399', '#facc15', '#f43f5e', '#fb923c', '#e879f9'];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: window.innerWidth * (0.3 + Math.random() * 0.4),
          y: window.innerHeight * 0.65,
          vx: (Math.random() - 0.5) * 18,
          vy: -Math.random() * 20 - 8,
          size: Math.random() * 8 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vrot: (Math.random() - 0.5) * 14,
          gravity: 0.45,
          alpha: 1
        });
      }

      if (!this.animating) {
        this.animating = true;
        this.loop();
      }
    }

    loop() {
      if (this.particles.length === 0) {
        if (this.ctx && this.canvas) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.animating = false;
        return;
      }

      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.vy += p.gravity;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.vrot;
          p.alpha -= 0.007;

          if (p.alpha <= 0 || p.y > this.canvas.height + 25) {
            this.particles.splice(i, 1);
            continue;
          }

          this.ctx.save();
          this.ctx.globalAlpha = Math.max(p.alpha, 0);
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          this.ctx.restore();
        }
      }

      requestAnimationFrame(() => this.loop());
    }
  }

  class RubikApp {
    constructor() {
      this.container = document.getElementById('canvas-container') || document.body;
      this.cubies = [];
      this.audio = new AudioFeedback();
      this.confetti = new ConfettiCelebration();

      // Scene & Rendering
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.pivot = null;
      this.envGroup = null;
      this.starField = null;

      // Personalization Preferences (loaded from localStorage)
      this.currentTheme = 'classic';
      this.currentFinish = 'matte';
      this.currentCore = 'black';
      this.currentEnv = 'studio';
      this.isFocusMode = false;
      this.wasSolved = true;
      this.userProfile = {
        nickname: 'SpeedCuber_VN',
        avatar: '⚡'
      };

      try {
        const savedProf = localStorage.getItem('rubik_user_profile');
        if (savedProf) {
          const p = JSON.parse(savedProf);
          if (p.nickname) this.userProfile.nickname = p.nickname;
          if (p.avatar) this.userProfile.avatar = p.avatar;
          if (p.theme && THEMES[p.theme]) this.currentTheme = p.theme;
          if (p.finish && FINISHES[p.finish]) this.currentFinish = p.finish;
          if (p.core && CORES[p.core]) this.currentCore = p.core;
          if (p.env) this.currentEnv = p.env;
          if (p.soundPack) this.audio.soundPack = p.soundPack;
          if (p.volume !== undefined) this.audio.volume = p.volume;
          if (p.haptics !== undefined) this.audio.hapticsEnabled = p.haptics;
        }
      } catch (e) {}

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

      // Initialize Core Engine
      try {
        this.initScene();
        this.initMaterials();
        this.createCube();
        this.setupInteractions();
        this.setupHUD();
        this.setupKeyboardShortcuts();
        this.animate();
        this.updateStatus('Solved', 'ready');

        // Initialize Camera / Photo Real-Cube Scanner
        this.scanner = new RealCubeScanner(this);
        // Initialize Speedcubing Competition Timer & Formulas Cheat Sheet
        this.speedTimer = new SpeedcubingTimer(this);
        this.cheatSheet = new FormulaCheatSheet(this);

        this.updateUserProfileDisplay();
      } catch (err) {
        console.error('RubikApp initialization failed:', err);
      }
    }

    // --- Three.js Setup ---
    initScene() {
      this.scene = new THREE.Scene();

      const width = this.container.clientWidth || window.innerWidth || 800;
      const height = this.container.clientHeight || window.innerHeight || 600;

      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      this.camera.position.set(4.6, 4.2, 5.8);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      if (THREE.ACESFilmicToneMapping) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
      }

      this.renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) {
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      this.container.appendChild(this.renderer.domElement);

      if (OrbitControls) {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 3.5;
        this.controls.maxDistance = 14;
        this.controls.target.set(0, 0, 0);
      }

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

      const shadowGeo = new THREE.PlaneGeometry(10, 10);
      const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
      const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -2.3;
      shadowPlane.receiveShadow = true;
      this.scene.add(shadowPlane);

      this.pivot = new THREE.Group();
      this.scene.add(this.pivot);

      // 3D Environment Group
      this.envGroup = new THREE.Group();
      this.scene.add(this.envGroup);
      this.setEnvironment(this.currentEnv);

      window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
      const width = this.container.clientWidth || window.innerWidth || 800;
      const height = this.container.clientHeight || window.innerHeight || 600;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    // --- Material & Vinyl Sticker Generation ---
    initMaterials() {
      const coreCfg = CORES[this.currentCore] || CORES.black;
      const finishCfg = FINISHES[this.currentFinish] || FINISHES.matte;
      const themeCfg = THEMES[this.currentTheme] || THEMES.classic;

      this.coreMaterial = new THREE.MeshStandardMaterial({
        color: coreCfg.color,
        roughness: finishCfg.roughness,
        metalness: finishCfg.metalness
      });

      for (const [faceKey, scheme] of Object.entries(themeCfg.colors)) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = this.currentCore === 'primary' ? '#d4d4d8' : '#0a0a0c';
        ctx.fillRect(0, 0, 256, 256);

        const margin = 12;
        const w = 256 - margin * 2;
        const h = 256 - margin * 2;
        const radius = 28;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(margin, margin, w, h, radius);
        } else {
          ctx.rect(margin, margin, w, h);
        }
        ctx.fillStyle = scheme.css;
        ctx.fill();

        const grad = ctx.createLinearGradient(margin, margin, margin + w, margin + h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
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
          roughness: finishCfg.roughness,
          metalness: finishCfg.metalness
        });
      }
    }

    updateMaterials() {
      this.initMaterials();
      for (const cubie of this.cubies) {
        cubie.material = this.coreMaterial;
        if (cubie.userData && cubie.userData.stickers) {
          for (const s of cubie.userData.stickers) {
            s.mesh.material = this.stickerMaterials[s.faceKey];
          }
        }
      }
      this.saveUserProfile();
    }

    setEnvironment(envId) {
      this.currentEnv = envId;
      if (!this.envGroup) return;

      while (this.envGroup.children.length > 0) {
        this.envGroup.remove(this.envGroup.children[0]);
      }
      this.starField = null;

      const appRoot = document.getElementById('app-root') || document.body;
      appRoot.classList.remove('env-studio', 'env-cyber', 'env-space', 'env-minimal');

      if (envId === 'cyber') {
        const grid = new THREE.GridHelper(30, 30, 0x06b6d4, 0x6366f1);
        grid.position.y = -2.31;
        this.envGroup.add(grid);
        appRoot.classList.add('env-cyber');
      } else if (envId === 'space') {
        const starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(1200 * 3);
        for (let i = 0; i < 1200 * 3; i += 3) {
          positions[i] = (Math.random() - 0.5) * 45;
          positions[i + 1] = (Math.random() - 0.5) * 45;
          positions[i + 2] = (Math.random() - 0.5) * 45;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({
          color: 0x94a3b8,
          size: 0.12,
          transparent: true,
          opacity: 0.8
        });
        this.starField = new THREE.Points(starGeo, starMat);
        this.envGroup.add(this.starField);
        appRoot.classList.add('env-space');
      } else if (envId === 'minimal') {
        appRoot.classList.add('env-minimal');
      } else {
        appRoot.classList.add('env-studio');
      }

      this.saveUserProfile();
    }

    celebrateSolve(isNewPB = false) {
      this.audio.playCelebrationFanfare();
      this.confetti?.burst();

      const toast = document.createElement('div');
      toast.className = 'celebration-toast';
      toast.innerHTML = isNewPB
        ? `🎉 <strong>KỶ LỤC MỚI (NEW PB)!</strong>`
        : `✨ <strong>CUBE SOLVED - CHÚC MỪNG BẠN!</strong>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 20);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, 3500);
    }

    toggleFocusMode() {
      this.isFocusMode = !this.isFocusMode;
      const root = document.getElementById('app-root') || document.body;
      root.classList.toggle('focus-mode', this.isFocusMode);

      const btn = document.getElementById('btn-toggle-focus');
      if (btn) btn.classList.toggle('active', this.isFocusMode);
    }

    updateUserProfileDisplay() {
      const avatarEl = document.getElementById('top-user-avatar');
      const nameEl = document.getElementById('top-user-name');
      const inputNick = document.getElementById('input-user-nickname');

      if (avatarEl) avatarEl.textContent = this.userProfile.avatar;
      if (nameEl) nameEl.textContent = this.userProfile.nickname;
      if (inputNick) inputNick.value = this.userProfile.nickname;

      this.updateUserTitle();
    }

    updateUserTitle() {
      const titleEl = document.getElementById('top-user-title');
      const settingsTitleEl = document.getElementById('settings-user-title');
      if (!this.speedTimer) return;

      const solves = this.speedTimer.solves || [];
      const times = solves.map(s => s.time);
      const best = times.length > 0 ? Math.min(...times) / 1000 : null;

      let title = 'Tập Sự';
      let badgeClass = 'badge-novice';

      if (solves.length >= 50) {
        title = 'Cube Grandmaster 👑';
        badgeClass = 'badge-master';
      } else if (best && best < 15) {
        title = 'Lightning (Sub-15) ⚡';
        badgeClass = 'badge-sub15';
      } else if (best && best < 30) {
        title = 'Speed Demon (Sub-30) 🥇';
        badgeClass = 'badge-sub30';
      } else if (best && best < 60) {
        title = 'Sub-60 Solver 🥈';
        badgeClass = 'badge-sub60';
      }

      if (titleEl) {
        titleEl.textContent = title;
        titleEl.className = `user-title-badge ${badgeClass}`;
      }
      if (settingsTitleEl) {
        settingsTitleEl.textContent = title;
        settingsTitleEl.className = `user-title-badge ${badgeClass}`;
      }
    }

    saveUserProfile() {
      try {
        const payload = {
          nickname: this.userProfile.nickname,
          avatar: this.userProfile.avatar,
          theme: this.currentTheme,
          finish: this.currentFinish,
          core: this.currentCore,
          env: this.currentEnv,
          soundPack: this.audio.soundPack,
          volume: this.audio.volume,
          haptics: this.audio.hapticsEnabled
        };
        localStorage.setItem('rubik_user_profile', JSON.stringify(payload));
      } catch (e) {}
    }

    // --- Cube Construction ---
    createCube() {
      for (const c of this.cubies) {
        this.scene.remove(c);
      }
      this.cubies = [];

      const size = CONFIG.cubieSize;
      const boxGeo = new THREE.BoxGeometry(size, size, size);
      const stickerSize = size * 0.88;
      const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if (x === 0 && y === 0 && z === 0) continue;

            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.castShadow = true;

            const coreMesh = new THREE.Mesh(boxGeo, this.coreMaterial);
            coreMesh.castShadow = true;
            coreMesh.receiveShadow = true;
            cubie.add(coreMesh);

            const stickers = [];
            const offset = size / 2 + 0.003;

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

    /**
     * Applies an arbitrary scanned 54-facelet string onto the 3D cube model.
     * Recolor each outer sticker to match the scanned physical cube!
     */
    applyFaceletStringToCube(faceletString) {
      if (!faceletString || faceletString.length !== 54) return false;

      // 1. Reset cube transforms to solved integer coordinates
      this.stopPlayback();
      this.turnQueue = [];
      this.isRotating = false;

      for (const cubie of this.cubies) {
        cubie.position.copy(cubie.userData.initialPos);
        cubie.quaternion.identity();
        cubie.updateMatrix();
        cubie.updateMatrixWorld(true);
      }

      // 2. Map each facelet onto its corresponding outer sticker
      for (let i = 0; i < FACELET_GRID.length; i++) {
        const slot = FACELET_GRID[i];
        const [sx, sy, sz] = slot.pos;
        const [nx, ny, nz] = slot.normal;
        const targetColor = faceletString[i];

        const cubie = this.cubies.find(c => {
          return c.position.x === sx && c.position.y === sy && c.position.z === sz;
        });

        if (cubie && cubie.userData.stickers) {
          const sticker = cubie.userData.stickers.find(s => {
            return s.localNormal.x === nx && s.localNormal.y === ny && s.localNormal.z === nz;
          });

          if (sticker && this.stickerMaterials[targetColor]) {
            sticker.face = targetColor;
            sticker.mesh.material = this.stickerMaterials[targetColor];
          }
        }
      }

      this.moveCount = 0;
      this.updateMoveCounter();
      this.updateStatus('Physical Cube Loaded', 'busy');

      // 3. Immediately solve the custom scanned cube!
      this.solve();
      return true;
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
      let isWholeCube = false;

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
        case 'M': // Middle slice between L and R, rotates in direction of L
          axis = new THREE.Vector3(1, 0, 0);
          coordKey = 'x';
          coordVal = 0;
          baseAngle = Math.PI / 2;
          break;
        case 'X': // Whole cube rotation around X axis (follows R)
          axis = new THREE.Vector3(1, 0, 0);
          isWholeCube = true;
          baseAngle = -Math.PI / 2;
          break;
        case 'Y': // Whole cube rotation around Y axis (follows U)
          axis = new THREE.Vector3(0, 1, 0);
          isWholeCube = true;
          baseAngle = -Math.PI / 2;
          break;
        case 'Z': // Whole cube rotation around Z axis (follows F)
          axis = new THREE.Vector3(0, 0, 1);
          isWholeCube = true;
          baseAngle = -Math.PI / 2;
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
        if (isWholeCube) {
          layerCubies.push(cubie);
          this.pivot.attach(cubie);
        } else {
          const posVal = Math.round(cubie.position[coordKey]);
          if (posVal === coordVal) {
            layerCubies.push(cubie);
            this.pivot.attach(cubie);
          }
        }
      }

      const duration = turn.duration;

      if (duration <= 0) {
        this.pivot.quaternion.setFromAxisAngle(axis, targetAngle);
        this.pivot.updateMatrixWorld(true);

        for (const cubie of layerCubies) {
          this.scene.attach(cubie);
          this.snapCubieTransform(cubie);
        }

        if (!isWholeCube) {
          this.moveCount++;
          this.updateMoveCounter();
        }
        this.checkSolvedState();

        if (turn.onComplete) turn.onComplete();
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

          if (!isWholeCube) {
            this.moveCount++;
            this.updateMoveCounter();
          }
          this.checkSolvedState();

          if (turn.onComplete) turn.onComplete();
          this.processNextTurn();
        }
      };

      requestAnimationFrame(animateRotation);
    }

    // --- Raycasting & Drag-to-Rotate Interaction ---
    setupInteractions() {
      const el = this.renderer.domElement;

      // Mouse Hover Feedback
      const onPointerHover = (e) => {
        if (this.isDraggingFace || this.isRotating) return;

        const rect = el.getBoundingClientRect();
        this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        const stickerMeshes = [];
        for (const cubie of this.cubies) {
          for (const s of cubie.userData.stickers) {
            stickerMeshes.push(s.mesh);
          }
        }

        const intersects = this.raycaster.intersectObjects(stickerMeshes, false);
        el.style.cursor = intersects.length > 0 ? 'grab' : 'default';
      };

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

          el.style.cursor = 'grabbing';
          if (this.controls) this.controls.enabled = false;
        }
      };

      const onPointerMove = (e) => {
        if (!this.isDraggingFace) {
          onPointerHover(e);
          return;
        }

        if (this.dragResolved || this.isRotating) return;

        const dx = e.clientX - this.pointerDownPos.x;
        const dy = e.clientY - this.pointerDownPos.y;
        const dist = Math.hypot(dx, dy);

        // Lower threshold for fast, responsive drag
        if (dist < 8) return;

        const screenDrag = new THREE.Vector2(dx, -dy).normalize();
        const N = this.dragNormal;
        const pos = this.dragCubie.position;
        const cx = Math.round(pos.x);
        const cy = Math.round(pos.y);
        const cz = Math.round(pos.z);

        // Check if user clicked a Center sticker:
        const isCenterSticker = (Math.abs(cx) + Math.abs(cy) + Math.abs(cz) === 1);
        if (isCenterSticker) {
          let turn = null;
          if (Math.abs(dx) > Math.abs(dy)) {
            turn = dx > 0 ? "y" : "y'";
          } else {
            if (Math.abs(N.y) > 0.8) {
              turn = dy > 0 ? "z" : "z'";
            } else {
              turn = dy > 0 ? "x" : "x'";
            }
          }
          if (turn) {
            this.queueMove(turn, { duration: 180 });
            this.dragResolved = true;
            return;
          }
        }

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

        const turn = this.determineLayerTurn(rotAxis, this.dragCubie, N, chosenTangent, chosenSign);
        if (turn) {
          this.queueMove(turn);
          this.dragResolved = true;
        }
      };

      const onPointerUp = () => {
        this.isDraggingFace = false;
        this.dragResolved = false;
        el.style.cursor = 'default';
        if (this.controls) this.controls.enabled = true;
      };

      el.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    determineLayerTurn(rotAxis, cubie, normal, tangent, sign) {
      const ax = Math.abs(rotAxis.x);
      const ay = Math.abs(rotAxis.y);
      const az = Math.abs(rotAxis.z);
      const pos = cubie.position;
      const layerX = Math.round(pos.x);
      const layerY = Math.round(pos.y);
      const layerZ = Math.round(pos.z);

      if (ay > 0.8) {
        const signY = Math.sign(rotAxis.y);
        if (layerY === 1) {
          return signY < 0 ? 'U' : "U'";
        } else if (layerY === -1) {
          return signY > 0 ? 'D' : "D'";
        } else {
          // Middle layer dragged horizontally -> rotate whole cube
          return signY < 0 ? 'y' : "y'";
        }
      }

      if (ax > 0.8) {
        const signX = Math.sign(rotAxis.x);
        if (layerX === 1) {
          return signX < 0 ? 'R' : "R'";
        } else if (layerX === -1) {
          return signX > 0 ? 'L' : "L'";
        } else {
          // Middle layer dragged vertically -> rotate whole cube
          return signX < 0 ? 'x' : "x'";
        }
      }

      if (az > 0.8) {
        const signZ = Math.sign(rotAxis.z);
        if (layerZ === 1) {
          return signZ < 0 ? 'F' : "F'";
        } else if (layerZ === -1) {
          return signZ > 0 ? 'B' : "B'";
        } else {
          // Middle layer dragged in Z -> rotate whole cube
          return signZ < 0 ? 'z' : "z'";
        }
      }

      return null;
    }

    // --- Scramble & Reset ---

    scramble() {
      if (this.isRotating) return;
      this.stopPlayback();

      // Reset to original solved materials first
      this.createCube();

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
        if (!this.wasSolved) {
          this.wasSolved = true;
          this.updateStatus('Cube Solved!', 'ready');
          this.celebrateSolve(false);
          this.updateUserTitle();
        }
      } else {
        this.wasSolved = false;
      }
    }

    // --- UI and HUD Binding ---
    setupHUD() {
      const tabBtns = document.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.dataset.tab;
          this.switchTab(targetTab);
        });
      });

      document.getElementById('btn-scramble')?.addEventListener('click', () => this.scramble());
      document.getElementById('btn-solve')?.addEventListener('click', () => this.solve());
      document.getElementById('btn-reset')?.addEventListener('click', () => this.resetCube());

      document.getElementById('btn-play-pause')?.addEventListener('click', () => this.togglePlayPause());
      document.getElementById('btn-step-prev')?.addEventListener('click', () => this.stepBackward());
      document.getElementById('btn-step-next')?.addEventListener('click', () => this.stepForward());

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

      const manualBtns = document.querySelectorAll('.manual-turn-btn');
      manualBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const move = btn.dataset.move;
          if (move) this.queueMove(move);
        });
      });

      document.getElementById('btn-copy-solution')?.addEventListener('click', () => {
        if (this.solutionMoves.length > 0) {
          navigator.clipboard.writeText(this.solutionMoves.join(' '));
          const btn = document.getElementById('btn-copy-solution');
          const origText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = origText; }, 1500);
        }
      });

      document.querySelectorAll('.camera-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = btn.dataset.preset;
          this.setCameraPreset(preset);
        });
      });

      const soundToggle = document.getElementById('sound-toggle');
      if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
          this.audio.enabled = e.target.checked;
        });
      }

      // 3D Cube Orientation D-Pad Controls
      document.querySelectorAll('.orient-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.orient;
          if (action === 'reset') {
            this.setCameraPreset('iso');
          } else if (action === 'up') {
            this.queueMove('x', { duration: 180 });
          } else if (action === 'down') {
            this.queueMove("x'", { duration: 180 });
          } else if (action === 'left') {
            this.queueMove("y'", { duration: 180 });
          } else if (action === 'right') {
            this.queueMove('y', { duration: 180 });
          } else if (action === 'roll') {
            this.queueMove('z', { duration: 180 });
          }
        });
      });

      // Top Header quick shortcut buttons
      document.getElementById('btn-top-timer')?.addEventListener('click', () => {
        this.switchTab('timer-tab');
      });
      document.getElementById('btn-top-cheatsheet')?.addEventListener('click', () => {
        this.switchTab('cheatsheet-tab');
      });

      // Zen Focus Mode
      document.getElementById('btn-toggle-focus')?.addEventListener('click', () => this.toggleFocusMode());
      document.getElementById('btn-exit-focus')?.addEventListener('click', () => this.toggleFocusMode());

      // Personalization: Cube Theme Pickers
      document.querySelectorAll('.theme-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.theme-card-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentTheme = btn.dataset.theme;
          this.updateMaterials();
        });
      });

      // Personalization: Material Finish Chips
      document.querySelectorAll('.finish-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.finish-chip-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentFinish = btn.dataset.finish;
          this.updateMaterials();
        });
      });

      // Personalization: Plastic Core Chips
      document.querySelectorAll('.core-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.core-chip-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentCore = btn.dataset.core;
          this.updateMaterials();
        });
      });

      // Personalization: 3D Environments
      document.querySelectorAll('.env-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.env-card-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.setEnvironment(btn.dataset.env);
        });
      });

      // Personalization: Sound Packs
      document.querySelectorAll('.sound-pack-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.sound-pack-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.audio.soundPack = btn.dataset.sound;
          this.audio.playTurnSound();
          this.saveUserProfile();
        });
      });

      // Volume slider
      const volSlider = document.getElementById('volume-slider');
      if (volSlider) {
        volSlider.value = Math.round(this.audio.volume * 100);
        volSlider.addEventListener('input', (e) => {
          this.audio.volume = parseInt(e.target.value, 10) / 100;
          this.saveUserProfile();
        });
      }

      // Haptics toggle
      const hapticToggle = document.getElementById('haptics-toggle');
      if (hapticToggle) {
        hapticToggle.checked = this.audio.hapticsEnabled;
        hapticToggle.addEventListener('change', (e) => {
          this.audio.hapticsEnabled = e.target.checked;
          this.saveUserProfile();
        });
      }

      // Avatar picker
      document.querySelectorAll('.avatar-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.avatar-pick-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.userProfile.avatar = btn.dataset.avatar;
          this.updateUserProfileDisplay();
          this.saveUserProfile();
        });
      });

      // Nickname save
      document.getElementById('btn-save-nickname')?.addEventListener('click', () => {
        const input = document.getElementById('input-user-nickname');
        if (input && input.value.trim()) {
          this.userProfile.nickname = input.value.trim();
          this.updateUserProfileDisplay();
          this.saveUserProfile();
          const btn = document.getElementById('btn-save-nickname');
          btn.textContent = 'Đã lưu!';
          setTimeout(() => { btn.textContent = 'Lưu'; }, 1500);
        }
      });
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

        // If Timer is running or timer tab is active, let timer handle Spacebar & keys
        const isTimerTab = document.getElementById('timer-tab')?.classList.contains('active');
        if (isTimerTab || (this.speedTimer && this.speedTimer.isTimerActive())) {
          return;
        }

        const key = e.key.toUpperCase();
        const isShift = e.shiftKey;

        // Arrow keys with Shift: rotate entire 3D cube
        if (isShift && e.code.startsWith('Arrow')) {
          e.preventDefault();
          if (e.code === 'ArrowUp') this.queueMove('x', { duration: 180 });
          else if (e.code === 'ArrowDown') this.queueMove("x'", { duration: 180 });
          else if (e.code === 'ArrowLeft') this.queueMove("y'", { duration: 180 });
          else if (e.code === 'ArrowRight') this.queueMove('y', { duration: 180 });
          return;
        }

        if (['U', 'D', 'L', 'R', 'F', 'B'].includes(key)) {
          const move = isShift ? `${key}'` : key;
          this.queueMove(move);
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          this.togglePlayPause();
        } else if (e.code === 'KeyF' && !e.ctrlKey) {
          this.toggleFocusMode();
        } else if (e.code === 'ArrowRight') {
          this.stepForward();
        } else if (e.code === 'ArrowLeft') {
          this.stepBackward();
        } else if (key === 'S' && !e.ctrlKey) {
          this.scramble();
        } else if (e.code === 'Enter') {
          this.solve();
        } else if (e.code === 'Escape') {
          if (this.isFocusMode) {
            this.toggleFocusMode();
          } else {
            this.resetCube();
          }
        }
      });
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      if (this.controls) this.controls.update();
      if (this.starField) {
        this.starField.rotation.y += 0.0004;
        this.starField.rotation.x += 0.0001;
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  // --- Real Physical Cube Scanner & 2D Net Controller ---
  class RealCubeScanner {
    constructor(app) {
      this.app = app;
      this.modal = document.getElementById('scanner-modal');
      this.video = document.getElementById('scanner-video');
      this.canvas = document.getElementById('scanner-canvas');
      this.stream = null;

      // Face order in 54-facelet string: U(0-8), R(9-17), F(18-26), D(27-35), L(36-44), B(45-53)
      this.faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
      this.currentFace = 'U';
      this.activeBrushColor = 'U';

      // 54 facelet state array (initialized to solved state)
      this.facelets = SOLVED_FACELETS.split('');

      this.initUI();
    }

    initUI() {
      // Open / Close Modal
      document.getElementById('btn-open-scanner')?.addEventListener('click', () => this.open());
      document.getElementById('btn-top-scanner')?.addEventListener('click', () => this.open());
      document.getElementById('btn-close-scanner')?.addEventListener('click', () => this.close());
      document.querySelector('.scanner-backdrop')?.addEventListener('click', () => this.close());

      // Scanner Mode Switching (Camera vs Manual Net)
      document.querySelectorAll('.scanner-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.scanMode;
          this.switchMode(mode);
        });
      });

      // Face Selection Pills in Camera View
      document.querySelectorAll('.face-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          this.setCurrentFace(btn.dataset.face);
        });
      });

      // Camera Controls
      document.getElementById('btn-start-camera')?.addEventListener('click', () => this.toggleCamera());
      document.getElementById('btn-capture-face')?.addEventListener('click', () => this.captureAndDetect());

      // Photo Upload
      const fileInput = document.getElementById('camera-file-input');
      fileInput?.addEventListener('change', (e) => this.handlePhotoUpload(e));

      // Color Palette Buttons
      document.querySelectorAll('.palette-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeBrushColor = btn.dataset.color;
        });
      });

      // Reset Colors
      document.getElementById('btn-reset-scan')?.addEventListener('click', () => {
        this.facelets = SOLVED_FACELETS.split('');
        this.render2DNet();
        this.renderDetectedMiniGrid();
        this.validateState();
      });

      // Apply & Solve
      document.getElementById('btn-apply-scan-solve')?.addEventListener('click', () => {
        const stateStr = this.facelets.join('');
        this.app.applyFaceletStringToCube(stateStr);
        this.close();
      });

      this.render2DNet();
      this.renderDetectedMiniGrid();
      this.validateState();
    }

    open() {
      this.modal?.classList.remove('hidden');
      this.render2DNet();
      this.renderDetectedMiniGrid();
      this.validateState();
    }

    close() {
      this.stopCamera();
      this.modal?.classList.add('hidden');
    }

    switchMode(mode) {
      document.querySelectorAll('.scanner-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scanMode === mode);
      });
      document.querySelectorAll('.scan-view').forEach(view => {
        view.classList.toggle('active', view.id === `scan-view-${mode}`);
      });
    }

    setCurrentFace(face) {
      this.currentFace = face;
      document.querySelectorAll('.face-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.face === face);
      });

      const centerNameEl = document.getElementById('current-face-center-name');
      if (centerNameEl) {
        centerNameEl.textContent = COLOR_SCHEME[face].name;
        centerNameEl.style.color = COLOR_SCHEME[face].css;
      }

      const indicator = document.getElementById('center-color-indicator');
      if (indicator) {
        indicator.style.backgroundColor = COLOR_SCHEME[face].css;
      }

      this.renderDetectedMiniGrid();
    }

    // --- Camera Handling ---
    async toggleCamera() {
      if (this.stream) {
        this.stopCamera();
      } else {
        await this.startCamera();
      }
    }

    async startCamera() {
      const btn = document.getElementById('btn-start-camera');
      const captureBtn = document.getElementById('btn-capture-face');
      const loading = document.getElementById('camera-loading');

      try {
        loading?.classList.remove('hidden');
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 720 },
            height: { ideal: 720 }
          }
        });

        this.video.srcObject = this.stream;
        await this.video.play();

        loading?.classList.add('hidden');
        if (btn) btn.innerHTML = '<span>Stop Camera</span>';
        if (captureBtn) captureBtn.disabled = false;
      } catch (err) {
        loading?.classList.add('hidden');
        alert('Could not access camera: ' + err.message + '\nYou can also click "Upload Photo" to use a saved picture!');
      }
    }

    stopCamera() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      if (this.video) this.video.srcObject = null;

      const btn = document.getElementById('btn-start-camera');
      const captureBtn = document.getElementById('btn-capture-face');
      if (btn) btn.innerHTML = '<span>Start Camera</span>';
      if (captureBtn) captureBtn.disabled = true;
    }

    captureAndDetect() {
      if (!this.video || !this.video.videoWidth) return;

      const size = Math.min(this.video.videoWidth, this.video.videoHeight);
      const startX = (this.video.videoWidth - size) / 2;
      const startY = (this.video.videoHeight - size) / 2;

      // Sample 9 facelets
      const detected = sampleFaceletColors(this.video, startX, startY, size);
      this.applyDetectedToFace(this.currentFace, detected);
      this.advanceToNextFace();
    }

    handlePhotoUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const size = Math.min(img.width, img.height);
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;

          const detected = sampleFaceletColors(img, startX, startY, size);
          this.applyDetectedToFace(this.currentFace, detected);
          this.advanceToNextFace();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    applyDetectedToFace(face, detectedList) {
      const faceOffsetMap = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
      const offset = faceOffsetMap[face];

      detectedList.forEach((sample, i) => {
        // Keep the center facelet locked to its face definition
        if (i === 4) {
          this.facelets[offset + 4] = face;
        } else {
          this.facelets[offset + i] = sample.colorKey;
        }
      });

      this.render2DNet();
      this.renderDetectedMiniGrid();
      this.validateState();
    }

    advanceToNextFace() {
      const sequence = ['U', 'L', 'F', 'R', 'B', 'D'];
      const currentIdx = sequence.indexOf(this.currentFace);
      if (currentIdx < sequence.length - 1) {
        this.setCurrentFace(sequence[currentIdx + 1]);
      }
    }

    renderDetectedMiniGrid() {
      const grid = document.getElementById('detected-mini-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const faceOffsetMap = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
      const offset = faceOffsetMap[this.currentFace];

      for (let i = 0; i < 9; i++) {
        const faceletIdx = offset + i;
        const colorKey = this.facelets[faceletIdx];
        const tile = document.createElement('div');
        tile.className = `mini-tile color-${colorKey}`;
        tile.style.backgroundColor = COLOR_SCHEME[colorKey].css;
        if (i === 4) tile.classList.add('center-tile');

        tile.addEventListener('click', () => {
          if (i !== 4) {
            this.facelets[faceletIdx] = this.activeBrushColor;
            this.renderDetectedMiniGrid();
            this.render2DNet();
            this.validateState();
          }
        });

        grid.appendChild(tile);
      }
    }

    // --- 2D Interactive Cube Net ---
    render2DNet() {
      const netContainer = document.getElementById('cube-net-grid');
      if (!netContainer) return;
      netContainer.innerHTML = '';

      // Unfolded net layout:
      // Row 0: .  U  .  .
      // Row 1: L  F  R  B
      // Row 2: .  D  .  .
      const netLayout = [
        [null, 'U', null, null],
        ['L',  'F', 'R',  'B'],
        [null, 'D', null, null]
      ];

      const faceOffsetMap = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

      netLayout.forEach(row => {
        row.forEach(faceKey => {
          const faceBox = document.createElement('div');
          faceBox.className = 'net-face-slot';

          if (faceKey) {
            faceBox.classList.add(`face-${faceKey}`);
            const faceHeader = document.createElement('div');
            faceHeader.className = 'net-face-header';
            faceHeader.textContent = `${faceKey} (${COLOR_SCHEME[faceKey].name})`;
            faceBox.appendChild(faceHeader);

            const grid3x3 = document.createElement('div');
            grid3x3.className = 'net-3x3-grid';

            const offset = faceOffsetMap[faceKey];

            for (let i = 0; i < 9; i++) {
              const faceletIdx = offset + i;
              const colorKey = this.facelets[faceletIdx];
              const cell = document.createElement('div');
              cell.className = `net-tile color-${colorKey} ${i === 4 ? 'is-center' : ''}`;
              cell.style.backgroundColor = COLOR_SCHEME[colorKey].css;

              cell.addEventListener('click', () => {
                if (i !== 4) { // Centers are fixed
                  this.facelets[faceletIdx] = this.activeBrushColor;
                  this.render2DNet();
                  this.renderDetectedMiniGrid();
                  this.validateState();
                }
              });

              grid3x3.appendChild(cell);
            }
            faceBox.appendChild(grid3x3);
          } else {
            faceBox.classList.add('empty-slot');
          }
          netContainer.appendChild(faceBox);
        });
      });
    }

    validateState() {
      const stateStr = this.facelets.join('');
      const validation = validateFaceletCounts(stateStr);

      // Update palette badges
      for (const [key, cnt] of Object.entries(validation.counts)) {
        const badge = document.getElementById(`count-${key}`);
        if (badge) {
          badge.textContent = `${cnt}/9`;
          badge.classList.toggle('valid', cnt === 9);
        }
      }

      const statusEl = document.getElementById('scanner-status-text');
      const applyBtn = document.getElementById('btn-apply-scan-solve');

      if (!validation.isValid) {
        if (statusEl) {
          statusEl.textContent = `Need exactly 9 of each color. Currently: ${validation.message}`;
          statusEl.className = 'status-msg status-warning';
        }
        if (applyBtn) applyBtn.disabled = true;
        return;
      }

      // Check solvability via min2phase
      if (window.min2phase) {
        const sol = window.min2phase.solve(stateStr);
        if (sol && !sol.startsWith('Error')) {
          if (statusEl) {
            statusEl.textContent = `Valid state! Solvable in ${sol.trim().split(/\s+/).length} moves.`;
            statusEl.className = 'status-msg status-success';
          }
          if (applyBtn) applyBtn.disabled = false;
        } else {
          if (statusEl) {
            statusEl.textContent = `Parity issue (${sol}). Please check corner or edge orientations.`;
            statusEl.className = 'status-msg status-error';
          }
          if (applyBtn) applyBtn.disabled = true;
        }
      }
    }
  }

  // ==========================================================================
  // Speedcubing Competition Timer (WCA StackMat Style)
  // ==========================================================================
  class SpeedcubingTimer {
    constructor(app) {
      this.app = app;
      this.state = 'IDLE'; // 'IDLE' | 'HOLDING' | 'READY' | 'RUNNING' | 'STOPPED' | 'INSPECTION'
      this.startTime = 0;
      this.elapsedTime = 0;
      this.timerInterval = null;
      this.holdTimeout = null;
      this.inspectionInterval = null;
      this.inspectionSeconds = 15;
      this.inspectionEnabled = false;
      this.currentScramble = generateWCAScramble(20).join(' ');

      // Load solves from localStorage
      this.solves = [];
      try {
        const saved = localStorage.getItem('rubik_speed_solves');
        if (saved) this.solves = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to load solves from localStorage:', e);
      }

      this.initUI();
    }

    isTimerActive() {
      return ['HOLDING', 'READY', 'RUNNING', 'INSPECTION'].includes(this.state);
    }

    initUI() {
      this.clockDisplay = document.getElementById('timer-clock-display');
      this.statusHint = document.getElementById('timer-status-hint');
      this.scrambleDisplay = document.getElementById('timer-scramble-display');
      this.inspectionToggle = document.getElementById('timer-inspection-toggle');

      if (this.scrambleDisplay) {
        this.scrambleDisplay.textContent = this.currentScramble;
      }

      // New Scramble button
      document.getElementById('btn-timer-new-scramble')?.addEventListener('click', () => {
        this.generateNewScramble();
      });

      // Send scramble to 3D cube button
      document.getElementById('btn-timer-apply-3d')?.addEventListener('click', () => {
        if (this.currentScramble) {
          this.app.createCube();
          this.app.queueSequence(this.currentScramble, { duration: 100 });
          this.app.updateScrambleDisplay(this.currentScramble);
        }
      });

      // Inspection toggle
      this.inspectionToggle?.addEventListener('change', (e) => {
        this.inspectionEnabled = e.target.checked;
      });

      // Clear all solves
      document.getElementById('btn-clear-solves')?.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xoá toàn bộ lịch sử bấm giờ?')) {
          this.solves = [];
          this.persistSolves();
          this.renderStats();
          this.renderSolvesList();
        }
      });

      // Export / copy solves
      document.getElementById('btn-export-solves')?.addEventListener('click', () => {
        if (this.solves.length === 0) return;
        const text = this.solves.map((s, i) => `${i + 1}. ${this.formatTime(s.time)} - Scramble: ${s.scramble}`).join('\n');
        navigator.clipboard.writeText(text);
        const btn = document.getElementById('btn-export-solves');
        if (btn) {
          const old = btn.textContent;
          btn.textContent = 'Đã sao chép!';
          setTimeout(() => { btn.textContent = old; }, 1500);
        }
      });

      // Spacebar controls
      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        const isTimerTab = document.getElementById('timer-tab')?.classList.contains('active');
        if (!isTimerTab && !this.isTimerActive()) return;

        if (this.state === 'RUNNING') {
          e.preventDefault();
          this.stopTimer();
          return;
        }

        if (e.code === 'Space' && !e.repeat) {
          e.preventDefault();
          this.handleHoldStart();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          this.handleHoldRelease();
        }
      });

      // Touch pads for mobile / mouse
      const padLeft = document.getElementById('pad-left');
      const padRight = document.getElementById('pad-right');

      let padLeftActive = false;
      let padRightActive = false;

      const checkPads = () => {
        if (this.state === 'RUNNING') {
          this.stopTimer();
          return;
        }
        if (padLeftActive && padRightActive) {
          this.handleHoldStart();
        } else {
          this.handleHoldRelease();
        }
      };

      const bindPad = (el, setLeft) => {
        if (!el) return;
        const activate = (e) => {
          e.preventDefault();
          if (setLeft) padLeftActive = true; else padRightActive = true;
          el.classList.add('active');
          checkPads();
        };
        const deactivate = (e) => {
          e.preventDefault();
          if (setLeft) padLeftActive = false; else padRightActive = false;
          el.classList.remove('active');
          checkPads();
        };
        el.addEventListener('mousedown', activate);
        el.addEventListener('mouseup', deactivate);
        el.addEventListener('mouseleave', deactivate);
        el.addEventListener('touchstart', activate, { passive: false });
        el.addEventListener('touchend', deactivate, { passive: false });
      };

      bindPad(padLeft, true);
      bindPad(padRight, false);

      // Stop on tap anywhere inside timer viewport when running
      document.querySelector('.timer-viewport')?.addEventListener('click', () => {
        if (this.state === 'RUNNING') {
          this.stopTimer();
        }
      });

      this.renderStats();
      this.renderSolvesList();
    }

    generateNewScramble() {
      const moves = generateWCAScramble(20);
      this.currentScramble = moves.join(' ');
      if (this.scrambleDisplay) {
        this.scrambleDisplay.textContent = this.currentScramble;
      }
    }

    handleHoldStart() {
      if (this.state === 'RUNNING') {
        this.stopTimer();
        return;
      }

      if (this.inspectionEnabled && this.state !== 'INSPECTION' && this.state !== 'READY') {
        this.startInspection();
        return;
      }

      this.state = 'HOLDING';
      this.updateClockStyle('holding');
      if (this.statusHint) this.statusHint.textContent = 'Giữ yên... (Chờ đổi sang xanh lá)';

      clearTimeout(this.holdTimeout);
      this.holdTimeout = setTimeout(() => {
        if (this.state === 'HOLDING') {
          this.state = 'READY';
          this.updateClockStyle('ready');
          if (this.statusHint) this.statusHint.textContent = 'SẴN SÀNG! Thả tay để bấm giờ';
          this.app.audio.playBeep(880, 0.08);
        }
      }, 300);
    }

    handleHoldRelease() {
      clearTimeout(this.holdTimeout);
      if (this.state === 'READY') {
        this.startRunning();
      } else if (this.state === 'HOLDING') {
        this.state = this.inspectionEnabled && this.inspectionInterval ? 'INSPECTION' : 'IDLE';
        this.updateClockStyle(this.state === 'INSPECTION' ? 'inspection' : 'idle');
        if (this.statusHint) {
          this.statusHint.textContent = 'Chưa đủ thời gian giữ (cần 0.3s). Thử lại!';
        }
      }
    }

    startInspection() {
      this.state = 'INSPECTION';
      this.inspectionSeconds = 15;
      clearInterval(this.inspectionInterval);

      if (this.clockDisplay) {
        this.clockDisplay.textContent = `${this.inspectionSeconds}`;
      }
      this.updateClockStyle('inspection');
      if (this.statusHint) {
        this.statusHint.textContent = 'Thời gian quan sát WCA (15 giây). Giữ phím cách khi sẵn sàng!';
      }

      this.inspectionInterval = setInterval(() => {
        this.inspectionSeconds--;
        if (this.clockDisplay) {
          this.clockDisplay.textContent = `${this.inspectionSeconds}`;
        }

        if (this.inspectionSeconds === 8) {
          this.app.audio.playBeep(520, 0.1);
          if (this.statusHint) this.statusHint.textContent = '⚠️ Đã qua 8 giây!';
        } else if (this.inspectionSeconds === 12) {
          this.app.audio.playBeep(700, 0.15);
          if (this.statusHint) this.statusHint.textContent = '🚨 Đã qua 12 giây!';
        } else if (this.inspectionSeconds <= 0) {
          clearInterval(this.inspectionInterval);
          this.inspectionInterval = null;
          if (this.statusHint) this.statusHint.textContent = 'Hết giờ quan sát! Phạt +2s nếu bắt đầu ngay.';
        }
      }, 1000);
    }

    startRunning() {
      clearInterval(this.inspectionInterval);
      this.inspectionInterval = null;

      this.state = 'RUNNING';
      this.startTime = performance.now();
      this.updateClockStyle('running');
      if (this.statusHint) this.statusHint.textContent = 'BẤM PHÍM BẤT KỲ HOẶC CHẠM MÀN HÌNH ĐỂ DỪNG';

      this.timerInterval = setInterval(() => {
        const now = performance.now();
        const elapsed = now - this.startTime;
        if (this.clockDisplay) {
          this.clockDisplay.textContent = this.formatTime(elapsed);
        }
      }, 10);
    }

    stopTimer() {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.state = 'STOPPED';

      const finalMs = performance.now() - this.startTime;
      let finalFormatted = this.formatTime(finalMs);

      // Check inspection penalties
      if (this.inspectionEnabled && this.inspectionSeconds < 0 && this.inspectionSeconds >= -2) {
        finalFormatted += ' (+2)';
      }

      if (this.clockDisplay) {
        this.clockDisplay.textContent = finalFormatted;
      }
      this.updateClockStyle('stopped');
      if (this.statusHint) {
        this.statusHint.textContent = `Hoàn thành: ${finalFormatted}! Giữ phím cách để bắt đầu lượt mới.`;
      }

      const prevBest = this.solves.length > 0 ? Math.min(...this.solves.map(s => s.time)) : Infinity;
      const isNewPB = finalMs < prevBest && this.solves.length > 0;

      this.recordSolve(finalMs);
      this.generateNewScramble();

      if (isNewPB) {
        this.app.celebrateSolve(true);
      } else {
        this.app.audio.playBeep(440, 0.12);
      }
      this.app.updateUserTitle();
    }

    recordSolve(ms) {
      const solve = {
        id: Date.now(),
        time: ms,
        scramble: this.currentScramble,
        date: new Date().toLocaleTimeString()
      };
      this.solves.unshift(solve);
      this.persistSolves();
      this.renderStats();
      this.renderSolvesList();
    }

    deleteSolve(id) {
      this.solves = this.solves.filter(s => s.id !== id);
      this.persistSolves();
      this.renderStats();
      this.renderSolvesList();
    }

    persistSolves() {
      try {
        localStorage.setItem('rubik_speed_solves', JSON.stringify(this.solves));
      } catch (e) {
        console.warn('Failed to save solves:', e);
      }
    }

    updateClockStyle(stateClass) {
      if (!this.clockDisplay) return;
      this.clockDisplay.className = `timer-clock timer-${stateClass}`;
    }

    formatTime(ms) {
      if (ms < 0) return '0.00';
      const totalSec = ms / 1000;
      if (totalSec < 60) {
        return totalSec.toFixed(2);
      }
      const mins = Math.floor(totalSec / 60);
      const secs = (totalSec % 60).toFixed(2);
      return `${mins}:${secs.padStart(5, '0')}`;
    }

    calcAo(count) {
      if (this.solves.length < count) return null;
      const recent = this.solves.slice(0, count).map(s => s.time);
      recent.sort((a, b) => a - b);
      // Drop fastest and slowest
      const trimmed = recent.slice(1, count - 1);
      const sum = trimmed.reduce((acc, t) => acc + t, 0);
      return sum / trimmed.length;
    }

    renderStats() {
      const times = this.solves.map(s => s.time);
      const best = times.length > 0 ? Math.min(...times) : null;
      const worst = times.length > 0 ? Math.max(...times) : null;
      const ao5 = this.calcAo(5);
      const ao12 = this.calcAo(12);

      const elPb = document.getElementById('stat-timer-pb');
      const elWorst = document.getElementById('stat-timer-worst');
      const elAo5 = document.getElementById('stat-timer-ao5');
      const elAo12 = document.getElementById('stat-timer-ao12');
      const elCount = document.getElementById('stat-timer-count');

      if (elPb) elPb.textContent = best ? this.formatTime(best) : '--';
      if (elWorst) elWorst.textContent = worst ? this.formatTime(worst) : '--';
      if (elAo5) elAo5.textContent = ao5 ? this.formatTime(ao5) : '--';
      if (elAo12) elAo12.textContent = ao12 ? this.formatTime(ao12) : '--';
      if (elCount) elCount.textContent = `${this.solves.length}`;
    }

    renderSolvesList() {
      const tbody = document.getElementById('solves-list-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (this.solves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-solves">Chưa có lượt giải nào. Hãy giữ phím cách để bấm giờ!</td></tr>';
        return;
      }

      this.solves.forEach((s, idx) => {
        const row = document.createElement('tr');
        const num = this.solves.length - idx;
        row.innerHTML = `
          <td class="col-num">#${num}</td>
          <td class="col-time font-mono"><strong>${this.formatTime(s.time)}</strong></td>
          <td class="col-scramble font-mono" title="${s.scramble}">${s.scramble}</td>
          <td class="col-del"><button class="btn-del-solve" data-id="${s.id}" title="Xoá">&times;</button></td>
        `;

        row.querySelector('.btn-del-solve')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteSolve(s.id);
        });

        tbody.appendChild(row);
      });
    }
  }

  // ==========================================================================
  // Formula Cheat Sheet (Beginner & CFOP Speedcubing Algorithms)
  // ==========================================================================
  class FormulaCheatSheet {
    constructor(app) {
      this.app = app;
      this.activeCategory = 'all';

      this.formulas = [
        // --- Beginner 7 Steps ---
        {
          id: 'beg-1',
          category: 'beginner',
          title: 'Bước 1: Hoa Cúc & Dấu Cộng Trắng',
          subtitle: 'Daisy to White Cross',
          algs: ['F2'],
          algString: 'F2 (hoặc đưa cạnh trắng về quanh tâm vàng trước)',
          desc: 'Tập hợp 4 viên cạnh trắng về quanh tâm vàng, sau đó xoay tầng U khớp tâm màu rồi xoay F2 đưa xuống mặt đáy trắng.'
        },
        {
          id: 'beg-2',
          category: 'beginner',
          title: 'Bước 2: Hoàn thành tầng 1 (Sexy Move)',
          subtitle: 'First Layer Corners',
          algs: ["R", "U", "R'", "U'"],
          algString: "R U R' U'",
          desc: 'Đưa viên góc trắng lên phía trên vị trí cần đến, lặp lại công thức 1 đến 5 lần cho đến khi viên góc vào đúng vị trí.'
        },
        {
          id: 'beg-3r',
          category: 'beginner',
          title: 'Bước 3: Tầng 2 - Đưa Cạnh Sang Phải',
          subtitle: 'Second Layer Right',
          algs: ["U", "R", "U'", "R'", "U'", "F'", "U", "F"],
          algString: "U R U' R' U' F' U F",
          desc: 'Khi viên cạnh ở tầng 3 trùng màu tâm mặt trước và cần đưa sang bên phải tầng 2.'
        },
        {
          id: 'beg-3l',
          category: 'beginner',
          title: 'Bước 3: Tầng 2 - Đưa Cạnh Sang Trái',
          subtitle: 'Second Layer Left',
          algs: ["U'", "L'", "U", "L", "U", "F", "U'", "F'"],
          algString: "U' L' U L U F U' F'",
          desc: 'Khi viên cạnh ở tầng 3 trùng màu tâm mặt trước và cần đưa sang bên trái tầng 2.'
        },
        {
          id: 'beg-4',
          category: 'beginner',
          title: 'Bước 4: Tạo Dấu Cộng Vàng',
          subtitle: 'Yellow Cross (FRUR\'U\'F\')',
          algs: ["F", "R", "U", "R'", "U'", "F'"],
          algString: "F R U R' U' F'",
          desc: 'Áp dụng cho Chữ L ngược (hướng 9h-12h), Đường ngang hoặc Dấu chấm để tạo dấu cộng vàng.'
        },
        {
          id: 'beg-5',
          category: 'beginner',
          title: 'Bước 5: Hoán vị 4 cạnh vàng (Sune)',
          subtitle: 'Permute Edges (Sune)',
          algs: ["R", "U", "R'", "U", "R", "U2", "R'"],
          algString: "R U R' U R U2 R'",
          desc: 'Đổi chỗ các viên cạnh vàng sao cho trùng màu với 4 tâm xung quanh.'
        },
        {
          id: 'beg-6',
          category: 'beginner',
          title: 'Bước 6: Định vị 4 góc vàng (Niklas)',
          subtitle: 'Position Yellow Corners',
          algs: ["U", "R", "U'", "L'", "U", "R'", "U'", "L"],
          algString: "U R U' L' U R' U' L",
          desc: 'Đưa 4 viên góc vàng về đúng vị trí (chưa cần đúng hướng lật).'
        },
        {
          id: 'beg-7',
          category: 'beginner',
          title: 'Bước 7: Lật đúng hướng góc vàng',
          subtitle: 'Orient Corners (R\' D\' R D)',
          algs: ["R'", "D'", "R", "D"],
          algString: "R' D' R D (lặp lại đến khi mặt vàng hướng lên)",
          desc: 'Giữ cố định khối, lặp lại R\' D\' R D đến khi góc vàng hướng lên trên, sau đó chỉ xoay U để đưa góc tiếp theo vào vị trí trên bên phải.'
        },

        // --- CFOP: 2-Look OLL ---
        {
          id: 'oll-sune',
          category: 'oll',
          title: 'OLL: Sune (Con Cá 1)',
          subtitle: '1 góc vàng hướng lên, góc trước mặt hướng phải',
          algs: ["R", "U", "R'", "U", "R", "U2", "R'"],
          algString: "R U R' U R U2 R'",
          desc: 'Công thức Sune kinh điển, finger-trick cực nhanh.'
        },
        {
          id: 'oll-antisune',
          category: 'oll',
          title: 'OLL: Anti-Sune (Con Cá 2)',
          subtitle: '1 góc vàng hướng lên, góc trước mặt hướng thẳng',
          algs: ["R", "U2", "R'", "U'", "R", "U'", "R'"],
          algString: "R U2 R' U' R U' R'",
          desc: 'Nghịch đảo của Sune, giải quyết con cá quay hướng ngược lại.'
        },
        {
          id: 'oll-h',
          category: 'oll',
          title: 'OLL: Chữ H (2 Cặp Đèn Đối Xứng)',
          subtitle: 'Không góc vàng nào hướng lên, 2 cặp đối nhau',
          algs: ["R", "U", "R'", "U", "R", "U'", "R'", "U", "R", "U2", "R'"],
          algString: "R U R' U R U' R' U R U2 R'",
          desc: 'Hai cặp đèn pha đối diện nhau ở mặt trước và mặt sau.'
        },
        {
          id: 'oll-pi',
          category: 'oll',
          title: 'OLL: Chữ Pi',
          subtitle: '1 cặp đèn pha + 2 góc ngược chiều nhau',
          algs: ["R", "U2", "R2", "U'", "R2", "U'", "R2", "U2", "R"],
          algString: "R U2 R2 U' R2 U' R2 U2 R",
          desc: 'Để cặp đèn pha sang bên trái và thực hiện chuỗi xoay.'
        },
        {
          id: 'oll-u',
          category: 'oll',
          title: 'OLL: Headlights (Đèn Pha U)',
          subtitle: '2 góc vàng hướng lên, 2 góc còn lại hướng về trước',
          algs: ["R2", "D", "R'", "U2", "R", "D'", "R'", "U2", "R'"],
          algString: "R2 D R' U2 R D' R' U2 R'",
          desc: 'Hai góc vàng liền kề hướng lên, hai góc còn lại tạo thành 2 đèn pha chiếu về trước.'
        },
        {
          id: 'oll-t',
          category: 'oll',
          title: 'OLL: Chameleon (T)',
          subtitle: '2 góc vàng hướng lên, 2 góc còn lại hướng ra 2 bên',
          algs: ["F", "R", "U", "R'", "U'", "F'"],
          algString: "F R U R' U' F'",
          desc: 'Dạng chữ T, áp dụng công thức để hoàn thành toàn bộ mặt vàng.'
        },

        // --- CFOP: 2-Look & Full PLL ---
        {
          id: 'pll-t',
          category: 'pll',
          title: 'PLL: T-Perm',
          subtitle: 'Hoán vị 2 góc kề nhau + 2 cạnh đối xứng',
          algs: ["R", "U", "R'", "U'", "R'", "F", "R2", "U'", "R'", "U'", "R", "U", "R'", "F'"],
          algString: "R U R' U' R' F R2 U' R' U' R U R' F'",
          desc: 'Công thức PLL thông dụng và quan trọng nhất, finger-trick cực nhanh.'
        },
        {
          id: 'pll-y',
          category: 'pll',
          title: 'PLL: Y-Perm',
          subtitle: 'Hoán vị 2 góc chéo nhau + 2 cạnh',
          algs: ["F", "R", "U'", "R'", "U'", "R", "U", "R'", "F'", "R", "U", "R'", "U'", "R'", "F", "R", "F'"],
          algString: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
          desc: 'Giải quyết toàn bộ các trường hợp hoán vị 2 góc chéo.'
        },
        {
          id: 'pll-ua',
          category: 'pll',
          title: 'PLL: Ua-Perm',
          subtitle: 'Hoán vị 3 cạnh theo chiều kim đồng hồ',
          algs: ["R", "U'", "R", "U", "R", "U", "R", "U'", "R'", "U'", "R2"],
          algString: "R U' R U R U R U' R' U' R2",
          desc: 'Mặt đã giải xong để ở phía sau, 3 cạnh còn lại xoay theo chiều kim đồng hồ.'
        },
        {
          id: 'pll-ub',
          category: 'pll',
          title: 'PLL: Ub-Perm',
          subtitle: 'Hoán vị 3 cạnh ngược chiều kim đồng hồ',
          algs: ["R2", "U", "R", "U", "R'", "U'", "R'", "U'", "R'", "U", "R'"],
          algString: "R2 U R U R' U' R' U' R' U R'",
          desc: 'Mặt đã giải xong để ở phía sau, 3 cạnh còn lại xoay ngược chiều kim đồng hồ.'
        },
        {
          id: 'pll-h',
          category: 'pll',
          title: 'PLL: H-Perm',
          subtitle: 'Hoán vị chéo 4 cạnh đối diện nhau',
          algs: ["M2", "U", "M2", "U2", "M2", "U", "M2"],
          algString: "M2 U M2 U2 M2 U M2",
          desc: '4 viên cạnh đối xứng đổi chỗ cho nhau (Trước - Sau, Trái - Phải).'
        },
        {
          id: 'pll-z',
          category: 'pll',
          title: 'PLL: Z-Perm',
          subtitle: 'Hoán vị 2 cặp cạnh kề nhau',
          algs: ["M2", "U", "M2", "U", "M'", "U2", "M2", "U2", "M'"],
          algString: "M2 U M2 U M' U2 M2 U2 M'",
          desc: 'Hai cặp cạnh liền kề đổi chỗ cho nhau (Trước - Phải, Sau - Trái).'
        }
      ];

      this.initUI();
    }

    initUI() {
      // Filter buttons
      document.querySelectorAll('.cheat-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.cheat-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeCategory = btn.dataset.category;
          this.renderFormulas();
        });
      });

      this.renderFormulas();
    }

    renderFormulas() {
      const container = document.getElementById('cheat-sheet-list');
      if (!container) return;
      container.innerHTML = '';

      const filtered = this.activeCategory === 'all'
        ? this.formulas
        : this.formulas.filter(f => f.category === this.activeCategory);

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'formula-card';

        // Format tokens
        const tokensHtml = item.algs
          .map(tok => `<span class="alg-token">${tok}</span>`)
          .join(' ');

        card.innerHTML = `
          <div class="formula-card-header">
            <div>
              <div class="formula-title">${item.title}</div>
              <div class="formula-subtitle">${item.subtitle}</div>
            </div>
            <span class="formula-category-badge badge-${item.category}">${item.category.toUpperCase()}</span>
          </div>
          <div class="formula-code-box">
            ${tokensHtml}
          </div>
          <p class="formula-desc">${item.desc}</p>
          <div class="formula-actions">
            <button class="btn-try-3d action-btn btn-secondary" title="Xem trên khối 3D">
              <span class="btn-icon">▶</span>
              <span>Thử trên 3D</span>
            </button>
            <button class="btn-copy-alg btn-outline" title="Sao chép công thức">
              <span class="btn-icon">📋</span>
              <span>Copy</span>
            </button>
          </div>
        `;

        // "Try on 3D" button
        card.querySelector('.btn-try-3d')?.addEventListener('click', () => {
          this.app.queueSequence(item.algs, { duration: 200 });
        });

        // "Copy" button
        card.querySelector('.btn-copy-alg')?.addEventListener('click', (e) => {
          navigator.clipboard.writeText(item.algs.join(' '));
          const btn = e.currentTarget;
          const origText = btn.innerHTML;
          btn.innerHTML = '<span>Đã chép!</span>';
          setTimeout(() => { btn.innerHTML = origText; }, 1500);
        });

        container.appendChild(card);
      });
    }
  }

  // Expose to global scope
  global.RubikApp = RubikApp;
  global.RealCubeScanner = RealCubeScanner;
  global.SpeedcubingTimer = SpeedcubingTimer;
  global.FormulaCheatSheet = FormulaCheatSheet;
  global.AudioFeedback = AudioFeedback;
  global.CONFIG = CONFIG;

  function initApp() {
    if (!global.rubikAppInstance) {
      global.rubikAppInstance = new RubikApp();
      global.rubikApp = global.rubikAppInstance;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})(typeof window !== 'undefined' ? window : this);
