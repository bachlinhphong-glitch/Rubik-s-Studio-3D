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

  // --- Multi-Language Localization Catalog (Bilingual Engine) ---
  const I18N = {
    vi: {
      title: "Rubik's Studio 3D - Khối Rubik 3D & Bộ Giải Kociemba Hai Giai Đoạn",
      brandTitleTooltip: "Bấm vào đây để chọn loại Rubik khác (2x2, 3x3, 4x4, Mirror Blocks, GAN, MoYu...)",
      brandSubtext: "Kociemba Two-Phase & Trợ lý AI",
      statusSolved: "ĐÃ GIẢI",
      statusBusy: "ĐANG XỬ LÝ...",
      statusScrambled: "ĐÃ XÁO",
      statusError: "LỖI",
      scrambleLabel: "Chuỗi xáo:",
      coachTitle: "Trợ Lý AI Rubik - Soi khối & Gợi ý nước đi",
      navCoach: "Trợ Lý AI",
      masterclassTitle: "Kinh nghiệm từ các kỷ lục gia thế giới",
      navMasterclass: "Tuyển Thủ",
      timerTitle: "Bấm giờ thi đấu Speedcubing WCA",
      navTimer: "Bấm Giờ",
      formulaTitle: "Bảng công thức giải CFOP & Cơ bản",
      navFormulas: "Công Thức",
      scannerTitle: "Quét khối Rubik thật bằng camera",
      navScanner: "Quét 3D",
      focusTitle: "Chế độ tập trung Zen Focus (Phím F)",
      navFocus: "Tập Trung",
      turnsTitle: "Tổng số lượt xoay mặt",
      statTurns: "Nước",
      profileTitle: "Hồ sơ Speedcuber & Tùy biến",
      solutionTitle: "Các Bước Giải Tối Ưu",
      noSolutionText: "Chưa có lời giải",
      emptyTimelineText: "Bấm \"Giải Bằng AI\" để tính toán các bước giải tối ưu nhất.",
      tabControls: "Điều Khiển",
      tabTimer: "Bấm Giờ",
      tabFormulas: "Công Thức",
      tabMasterclass: "Tuyển Thủ",
      tabSolution: "Lời Giải",
      tabCustom: "Tùy Biến",
      btnScramble: "Xáo Khối",
      btnSolve: "Giải Bằng AI",
      btnReset: "Đặt Lại",
      btnScan: "Quét Khối Thật",
      playbackTitle: "Xem Từng Bước Giải",
      btnPrev: "Lùi",
      btnPlay: "Phát",
      btnPause: "Tạm Dừng",
      btnNext: "Tiến",
      manualTurnsTitle: "Xoay Thủ Công",
      manualTurnsHint: "Hoặc bấm U, D, L, R, F, B",
      timerScrambleTitle: "Chuỗi Xáo WCA",
      btnNewScramble: "Đổi Mới",
      btnApply3D: "Nạp Vào 3D",
      timerIdleHint: "Chạm hoặc Giữ Phím Cách (Space) để sẵn sàng",
      type3x3: "3x3x3 Tiêu Chuẩn",
      type2x2: "2x2x2 Pocket Cube",
      typeMirror: "Mirror Blocks 3x3",
      type4x4: "4x4x4 Rubik's Revenge",
      type3x3Badge: "WCA Chuẩn",
      type2x2Badge: "Tốc Độ Mini",
      typeMirrorBadge: "Gương Bạc Chrome",
      type4x4Badge: "Nâng Cao 4 Tầng",
      type3x3Desc: "Khối thi đấu kinh điển WCA. Hỗ trợ giải tự động Kociemba và gợi ý từng bước CFOP.",
      type2x2Desc: "Gồm 8 viên góc nhỏ gọn, xoay siêu tốc, hoàn hảo cho luyện phản xạ ngón tay và người mới.",
      typeMirrorDesc: "Các khối lệch kích thước độc đáo, biến dạng không gian 3D khi xáo, mạ bạc gương phản chiếu.",
      type4x4Desc: "Khối 4 tầng với 56 viên cubie, thử thách giải tâm di động và ghép cặp cạnh nâng cao cho try-hard."
    },
    en: {
      title: "Rubik's Studio 3D - Interactive 3D Cube & Two-Phase Kociemba Solver",
      brandTitleTooltip: "Click here to choose another Cube (2x2, 3x3, 4x4, Mirror Blocks, GAN, MoYu...)",
      brandSubtext: "Kociemba Two-Phase & AI Coach",
      statusSolved: "SOLVED",
      statusBusy: "SOLVING...",
      statusScrambled: "SCRAMBLED",
      statusError: "ERROR",
      scrambleLabel: "Scramble:",
      coachTitle: "Rubik AI Coach - Diagnostics & Move Hints",
      navCoach: "AI Coach",
      masterclassTitle: "World Champions Masterclass & Tips",
      navMasterclass: "Masterclass",
      timerTitle: "Speedcubing WCA Competition Timer",
      navTimer: "Timer",
      formulaTitle: "Algorithms Cheat Sheet (CFOP & Beginner)",
      navFormulas: "Algorithms",
      scannerTitle: "Scan real physical cube with camera",
      navScanner: "3D Scan",
      focusTitle: "Zen Focus Mode (Key F)",
      navFocus: "Focus",
      turnsTitle: "Total face turns made",
      statTurns: "Moves",
      profileTitle: "Speedcuber Profile & Customization",
      solutionTitle: "Optimal Solution Steps",
      noSolutionText: "No active solution",
      emptyTimelineText: "Click \"AI Solve\" to calculate the optimal solution steps.",
      tabControls: "Controls",
      tabTimer: "Timer",
      tabFormulas: "Algorithms",
      tabMasterclass: "Masterclass",
      tabSolution: "Solution",
      tabCustom: "Customize",
      btnScramble: "Scramble",
      btnSolve: "AI Solve",
      btnReset: "Reset",
      btnScan: "Scan Real Cube",
      playbackTitle: "Step-by-Step Playback",
      btnPrev: "Prev",
      btnPlay: "Play",
      btnPause: "Pause",
      btnNext: "Next",
      manualTurnsTitle: "Manual Turns",
      manualTurnsHint: "Or press U, D, L, R, F, B",
      timerScrambleTitle: "WCA Scramble",
      btnNewScramble: "New",
      btnApply3D: "Send to 3D",
      timerIdleHint: "Touch or Hold Spacebar to prepare",
      type3x3: "3x3x3 Standard",
      type2x2: "2x2x2 Pocket Cube",
      typeMirror: "Mirror Blocks 3x3",
      type4x4: "4x4x4 Rubik's Revenge",
      type3x3Badge: "WCA Standard",
      type2x2Badge: "Speed Mini",
      typeMirrorBadge: "Silver Chrome",
      type4x4Badge: "4-Layer Revenge",
      type3x3Desc: "Classic WCA competition cube. Full support for Kociemba Two-Phase AI Solver and CFOP coaching.",
      type2x2Desc: "8 corner cubies, ultra-fast turning, perfect for finger dexterity and beginners.",
      typeMirrorDesc: "Unique asymmetric blocks that transform into crazy 3D shapes when scrambled, brushed chrome finish.",
      type4x4Desc: "4-layer cube with 56 cubies, mobile center pieces and edge pairing challenge for try-hards."
    }
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
    primary: { name: 'Milky White (Trắng Sữa GAN)', color: 0xe2e8f0 },
    cyan_ballcore: { name: 'Cyan Ball-Core (Lõi Ngọc MoYu WRM)', color: 0x06b6d4 },
    midnight: { name: 'Midnight Cyber (Tím Đêm Pha Lê)', color: 0x1e1b4b }
  };

  const ICONIC_CUBES = {
    gan14: {
      id: 'gan14',
      name: 'GAN 14 MagLev Pro UV',
      brand: 'GAN CUBE',
      theme: 'classic',
      finish: 'glossy',
      core: 'primary',
      sound: 'magnetic',
      speed: 180,
      centerLogo: 'GAN',
      isCarbonTexture: false
    },
    moyu_v9: {
      id: 'moyu_v9',
      name: 'MoYu WeiLong WRM V9 Ball-Core',
      brand: 'MoYu Culture',
      theme: 'classic',
      finish: 'glossy',
      core: 'cyan_ballcore',
      sound: 'magnetic',
      speed: 160,
      centerLogo: 'MoYu',
      isCarbonTexture: false
    },
    carbon_3d: {
      id: 'carbon_3d',
      name: 'Carbon Fiber 3D Stealth',
      brand: 'HyperMod Custom',
      theme: 'carbon',
      finish: 'matte',
      core: 'black',
      sound: 'keyboard',
      speed: 220,
      centerLogo: '⚡',
      isCarbonTexture: true
    },
    qiyi_macaron: {
      id: 'qiyi_macaron',
      name: 'QiYi Warrior Macaron Pastel',
      brand: 'QiYi MoFangGe',
      theme: 'pastel',
      finish: 'matte',
      core: 'primary',
      sound: 'acoustic',
      speed: 250,
      centerLogo: 'QiYi',
      isCarbonTexture: false
    },
    crystal_phantom: {
      id: 'crystal_phantom',
      name: 'Crystal Jelly Phantom Limited',
      brand: 'X-Cube Lab',
      theme: 'cyberpunk',
      finish: 'metallic',
      core: 'midnight',
      sound: 'magnetic',
      speed: 200,
      centerLogo: '❄️',
      isCarbonTexture: false
    },
    vintage_1980: {
      id: 'vintage_1980',
      name: 'Vintage 1980s Erno Rubik Original',
      brand: 'Ideal Toy (1980)',
      theme: 'vintage',
      finish: 'glossy',
      core: 'black',
      sound: 'acoustic',
      speed: 280,
      centerLogo: 'RUBIK',
      isCarbonTexture: false
    }
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
      // User requirement: No celebration sounds or fanfare in the app
      return;
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
      // User requirement: No confetti or celebration particles
      return;
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

      // Cube Format ('3x3' | '2x2' | 'mirror' | '4x4')
      this.cubeType = '3x3';

      // Multi-language state ('vi' | 'en')
      this.currentLang = 'vi';
      try {
        const savedLang = localStorage.getItem('rubik_language');
        if (savedLang && ['vi', 'en'].includes(savedLang)) {
          this.currentLang = savedLang;
        }
      } catch (e) {}

      // Personalization Preferences (loaded from localStorage)
      this.currentIconicCube = 'gan14';
      this.centerLogo = 'GAN';
      this.isCarbonTexture = false;
      this.currentTheme = 'classic';
      this.currentFinish = 'glossy';
      this.currentCore = 'primary';
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
          if (p.iconicCube && ICONIC_CUBES[p.iconicCube]) {
            this.currentIconicCube = p.iconicCube;
            this.centerLogo = ICONIC_CUBES[p.iconicCube].centerLogo;
            this.isCarbonTexture = !!ICONIC_CUBES[p.iconicCube].isCarbonTexture;
          }
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
        this.setLanguage(this.currentLang);
        this.setupKeyboardShortcuts();
        this.animate();
        this.updateStatus(I18N[this.currentLang].statusSolved, 'ready');

        // Initialize Camera / Photo Real-Cube Scanner
        this.scanner = new RealCubeScanner(this);
        // Initialize Speedcubing Competition Timer & Formulas Cheat Sheet
        this.speedTimer = new SpeedcubingTimer(this);
        this.cheatSheet = new FormulaCheatSheet(this);
        this.masterclass = new MasterclassManager(this);
        this.aiCoach = new RubikAICoach(this);

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

      // Studio HDR-style environment map for PBR metallic reflections
      const studioEnv = this.createStudioEnvironment();
      if (studioEnv) {
        this.scene.environment = studioEnv;
      }

      window.addEventListener('resize', () => this.onWindowResize());
    }

    createStudioEnvironment() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Smooth studio lighting gradient
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.35, '#94a3b8');
        grad.addColorStop(0.55, '#64748b');
        grad.addColorStop(0.8, '#334155');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Softbox highlights for metallic gleam
        const drawSoftbox = (cx, cy, rx, ry, color) => {
          const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
          rad.addColorStop(0, color);
          rad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rad;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        };

        drawSoftbox(140, 70, 110, 50, 'rgba(255, 255, 255, 0.95)');
        drawSoftbox(380, 80, 95, 45, 'rgba(224, 242, 254, 0.85)');
        drawSoftbox(256, 170, 70, 35, 'rgba(254, 243, 199, 0.55)');

        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        return texture;
      } catch (e) {
        return null;
      }
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

        // Plastic border color based on core
        if (this.currentCore === 'primary') {
          ctx.fillStyle = '#e2e8f0';
        } else if (this.currentCore === 'cyan_ballcore') {
          ctx.fillStyle = '#0891b2';
        } else if (this.currentCore === 'midnight') {
          ctx.fillStyle = '#1e1b4b';
        } else {
          ctx.fillStyle = '#0a0a0c';
        }
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

        // If Carbon Fiber texture is active:
        if (this.isCarbonTexture) {
          ctx.save();
          ctx.clip();
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(margin, margin, w, h);

          // Carbon fiber 3D cross-weave diagonal pattern
          ctx.strokeStyle = scheme.css;
          ctx.lineWidth = 3.5;
          for (let x = -256; x < 512; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 256, 256);
            ctx.stroke();
          }

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.lineWidth = 3.5;
          for (let x = -256; x < 512; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x + 256, 0);
            ctx.lineTo(x, 256);
            ctx.stroke();
          }

          // Subtle racing border
          ctx.lineWidth = 8;
          ctx.strokeStyle = scheme.css;
          ctx.stroke();
          ctx.restore();
        } else {
          const grad = ctx.createLinearGradient(margin, margin, margin + w, margin + h);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
          grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Center piece logo watermark on face U (White)
        if (faceKey === 'U' && this.centerLogo) {
          ctx.save();
          ctx.font = '800 32px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = this.isCarbonTexture ? '#ffffff' : 'rgba(15, 23, 42, 0.45)';
          ctx.fillText(this.centerLogo, 128, 128);
          ctx.restore();
        }

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

    applyIconicSpeedcube(cubeId) {
      const cube = ICONIC_CUBES[cubeId] || ICONIC_CUBES.gan14;
      this.currentIconicCube = cube.id;
      this.currentTheme = cube.theme;
      this.currentFinish = cube.finish;
      this.currentCore = cube.core;
      this.turnDuration = cube.speed;
      this.audio.soundPack = cube.sound;
      this.centerLogo = cube.centerLogo;
      this.isCarbonTexture = !!cube.isCarbonTexture;

      const slider = document.getElementById('speed-slider');
      const valDisplay = document.getElementById('speed-val-display');
      if (slider) slider.value = cube.speed;
      if (valDisplay) valDisplay.textContent = `${cube.speed}ms`;

      document.querySelectorAll('.speedcube-card-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.cube === cube.id);
      });
      document.querySelectorAll('.cs-speedcube-card').forEach(b => {
        b.classList.toggle('active', b.dataset.cube === cube.id);
      });
      document.querySelectorAll('.finish-chip-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.finish === cube.finish);
      });
      document.querySelectorAll('.core-chip-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.core === cube.core);
      });
      document.querySelectorAll('.sound-pack-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.sound === cube.sound);
      });

      this.updateMaterials();
      this.saveUserProfile();
    }

    updateMaterials() {
      this.initMaterials();
      for (const cubie of this.cubies) {
        cubie.material = this.coreMaterial;
        if (cubie.userData && cubie.userData.stickers) {
          for (const s of cubie.userData.stickers) {
            s.mesh.material = this.stickerMaterials[s.faceKey || s.face];
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
      // User requirement: No celebration toasts, confetti or fanfare
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

      if (this.cubeType === '2x2') {
        this.create2x2Cube();
      } else if (this.cubeType === 'mirror') {
        this.createMirrorCube();
      } else if (this.cubeType === '4x4') {
        this.create4x4Cube();
      } else {
        this.create3x3Cube();
      }
    }

    create3x3Cube() {
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
              stickers.push({ face: 'U', faceKey: 'U', localNormal: new THREE.Vector3(0, 1, 0), mesh: sm });
            }
            // -Y -> D (Yellow)
            if (y === -1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.D);
              sm.position.set(0, -offset, 0);
              sm.rotation.x = Math.PI / 2;
              sm.userData = { face: 'D', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'D', faceKey: 'D', localNormal: new THREE.Vector3(0, -1, 0), mesh: sm });
            }
            // +X -> R (Red)
            if (x === 1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.R);
              sm.position.set(offset, 0, 0);
              sm.rotation.y = Math.PI / 2;
              sm.userData = { face: 'R', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'R', faceKey: 'R', localNormal: new THREE.Vector3(1, 0, 0), mesh: sm });
            }
            // -X -> L (Orange)
            if (x === -1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.L);
              sm.position.set(-offset, 0, 0);
              sm.rotation.y = -Math.PI / 2;
              sm.userData = { face: 'L', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'L', faceKey: 'L', localNormal: new THREE.Vector3(-1, 0, 0), mesh: sm });
            }
            // +Z -> F (Green)
            if (z === 1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.F);
              sm.position.set(0, 0, offset);
              sm.userData = { face: 'F', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'F', faceKey: 'F', localNormal: new THREE.Vector3(0, 0, 1), mesh: sm });
            }
            // -Z -> B (Blue)
            if (z === -1) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.B);
              sm.position.set(0, 0, -offset);
              sm.rotation.y = Math.PI;
              sm.userData = { face: 'B', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'B', faceKey: 'B', localNormal: new THREE.Vector3(0, 0, -1), mesh: sm });
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

    create2x2Cube() {
      const size = 0.96;
      const boxGeo = new THREE.BoxGeometry(size, size, size);
      const stickerSize = size * 0.88;
      const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
      const offset = size / 2 + 0.003;
      const coords = [-0.5, 0.5];

      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.castShadow = true;

            const coreMesh = new THREE.Mesh(boxGeo, this.coreMaterial);
            coreMesh.castShadow = true;
            coreMesh.receiveShadow = true;
            cubie.add(coreMesh);

            const stickers = [];

            if (y > 0) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.U);
              sm.position.set(0, offset, 0);
              sm.rotation.x = -Math.PI / 2;
              sm.userData = { face: 'U', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'U', faceKey: 'U', localNormal: new THREE.Vector3(0, 1, 0), mesh: sm });
            } else {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.D);
              sm.position.set(0, -offset, 0);
              sm.rotation.x = Math.PI / 2;
              sm.userData = { face: 'D', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'D', faceKey: 'D', localNormal: new THREE.Vector3(0, -1, 0), mesh: sm });
            }

            if (x > 0) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.R);
              sm.position.set(offset, 0, 0);
              sm.rotation.y = Math.PI / 2;
              sm.userData = { face: 'R', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'R', faceKey: 'R', localNormal: new THREE.Vector3(1, 0, 0), mesh: sm });
            } else {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.L);
              sm.position.set(-offset, 0, 0);
              sm.rotation.y = -Math.PI / 2;
              sm.userData = { face: 'L', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'L', faceKey: 'L', localNormal: new THREE.Vector3(-1, 0, 0), mesh: sm });
            }

            if (z > 0) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.F);
              sm.position.set(0, 0, offset);
              sm.userData = { face: 'F', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'F', faceKey: 'F', localNormal: new THREE.Vector3(0, 0, 1), mesh: sm });
            } else {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.B);
              sm.position.set(0, 0, -offset);
              sm.rotation.y = Math.PI;
              sm.userData = { face: 'B', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'B', faceKey: 'B', localNormal: new THREE.Vector3(0, 0, -1), mesh: sm });
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

    createMirrorCube() {
      // Dark sleek titanium chassis
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x181e29,
        metalness: 0.35,
        roughness: 0.45
      });

      // Vibrant Metallic Jewel Face Finish (Gleaming studio reflections)
      const mirrorMaterials = {
        U: new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85, roughness: 0.14 }), // Platinum White
        D: new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.15 }), // Royal Gold
        F: new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.85, roughness: 0.14 }), // Emerald Green
        B: new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.88, roughness: 0.14 }), // Sapphire Blue
        R: new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.85, roughness: 0.14 }), // Ruby Red
        L: new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.88, roughness: 0.15 })  // Sunset Copper
      };

      const wArr = [0.65, 0.96, 1.28];
      const hArr = [0.56, 0.96, 1.38];
      const dArr = [0.72, 0.96, 1.22];
      const c = [-1.15, 0, 1.15];

      for (let ix = -1; ix <= 1; ix++) {
        for (let iy = -1; iy <= 1; iy++) {
          for (let iz = -1; iz <= 1; iz++) {
            if (ix === 0 && iy === 0 && iz === 0) continue;

            const w = wArr[ix + 1] * 0.96;
            const h = hArr[iy + 1] * 0.96;
            const d = dArr[iz + 1] * 0.96;

            const cubie = new THREE.Group();
            cubie.position.set(c[ix + 1], c[iy + 1], c[iz + 1]);
            cubie.castShadow = true;

            const boxGeo = new THREE.BoxGeometry(w, h, d);
            const coreMesh = new THREE.Mesh(boxGeo, coreMat);
            coreMesh.castShadow = true;
            coreMesh.receiveShadow = true;
            cubie.add(coreMesh);

            const stickers = [];

            if (iy === 1) {
              const sGeo = new THREE.PlaneGeometry(w * 0.90, d * 0.90);
              const sm = new THREE.Mesh(sGeo, mirrorMaterials.U);
              sm.position.set(0, h / 2 + 0.003, 0);
              sm.rotation.x = -Math.PI / 2;
              sm.userData = { face: 'U', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'U', faceKey: 'U', localNormal: new THREE.Vector3(0, 1, 0), mesh: sm });
            }
            if (iy === -1) {
              const sGeo = new THREE.PlaneGeometry(w * 0.90, d * 0.90);
              const sm = new THREE.Mesh(sGeo, mirrorMaterials.D);
              sm.position.set(0, -h / 2 - 0.003, 0);
              sm.rotation.x = Math.PI / 2;
              sm.userData = { face: 'D', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'D', faceKey: 'D', localNormal: new THREE.Vector3(0, -1, 0), mesh: sm });
            }
            if (ix === 1) {
              const sGeo = new THREE.PlaneGeometry(d * 0.90, h * 0.90);
              const sm = new THREE.Mesh(sGeo, mirrorMaterials.R);
              sm.position.set(w / 2 + 0.003, 0, 0);
              sm.rotation.y = Math.PI / 2;
              sm.userData = { face: 'R', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'R', faceKey: 'R', localNormal: new THREE.Vector3(1, 0, 0), mesh: sm });
            }
            if (ix === -1) {
              const sGeo = new THREE.PlaneGeometry(d * 0.90, h * 0.90);
              const sm = new THREE.Mesh(sGeo, mirrorMaterials.L);
              sm.position.set(-w / 2 - 0.003, 0, 0);
              sm.rotation.y = -Math.PI / 2;
              sm.userData = { face: 'L', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'L', faceKey: 'L', localNormal: new THREE.Vector3(-1, 0, 0), mesh: sm });
            }
            if (iz === 1) {
              const sGeo = new THREE.PlaneGeometry(w * 0.90, h * 0.90);
              const sm = new THREE.Mesh(sGeo, mirrorMaterials.F);
              sm.position.set(0, 0, d / 2 + 0.003);
              sm.userData = { face: 'F', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'F', faceKey: 'F', localNormal: new THREE.Vector3(0, 0, 1), mesh: sm });
            }
            if (iz === -1) {
              const sGeo = new THREE.PlaneGeometry(w * 0.90, h * 0.90);
              const sm = new THREE.Mesh(sGeo, mirrorMaterials.B);
              sm.position.set(0, 0, -d / 2 - 0.003);
              sm.rotation.y = Math.PI;
              sm.userData = { face: 'B', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'B', faceKey: 'B', localNormal: new THREE.Vector3(0, 0, -1), mesh: sm });
            }

            cubie.userData = {
              initialPos: new THREE.Vector3(c[ix + 1], c[iy + 1], c[iz + 1]),
              stickers,
              isCubie: true
            };

            this.scene.add(cubie);
            this.cubies.push(cubie);
          }
        }
      }
    }

    create4x4Cube() {
      const step = 0.72;
      const coords = [-1.5 * step, -0.5 * step, 0.5 * step, 1.5 * step];
      const size = 0.68;
      const boxGeo = new THREE.BoxGeometry(size, size, size);
      const stickerSize = size * 0.88;
      const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
      const offset = size / 2 + 0.003;
      const outerThresh = step;

      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            if (Math.abs(x) < outerThresh && Math.abs(y) < outerThresh && Math.abs(z) < outerThresh) {
              continue;
            }

            const cubie = new THREE.Group();
            cubie.position.set(x, y, z);
            cubie.castShadow = true;

            const coreMesh = new THREE.Mesh(boxGeo, this.coreMaterial);
            coreMesh.castShadow = true;
            coreMesh.receiveShadow = true;
            cubie.add(coreMesh);

            const stickers = [];

            if (y > outerThresh) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.U);
              sm.position.set(0, offset, 0);
              sm.rotation.x = -Math.PI / 2;
              sm.userData = { face: 'U', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'U', faceKey: 'U', localNormal: new THREE.Vector3(0, 1, 0), mesh: sm });
            }
            if (y < -outerThresh) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.D);
              sm.position.set(0, -offset, 0);
              sm.rotation.x = Math.PI / 2;
              sm.userData = { face: 'D', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'D', faceKey: 'D', localNormal: new THREE.Vector3(0, -1, 0), mesh: sm });
            }
            if (x > outerThresh) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.R);
              sm.position.set(offset, 0, 0);
              sm.rotation.y = Math.PI / 2;
              sm.userData = { face: 'R', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'R', faceKey: 'R', localNormal: new THREE.Vector3(1, 0, 0), mesh: sm });
            }
            if (x < -outerThresh) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.L);
              sm.position.set(-offset, 0, 0);
              sm.rotation.y = -Math.PI / 2;
              sm.userData = { face: 'L', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'L', faceKey: 'L', localNormal: new THREE.Vector3(-1, 0, 0), mesh: sm });
            }
            if (z > outerThresh) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.F);
              sm.position.set(0, 0, offset);
              sm.userData = { face: 'F', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'F', faceKey: 'F', localNormal: new THREE.Vector3(0, 0, 1), mesh: sm });
            }
            if (z < -outerThresh) {
              const sm = new THREE.Mesh(stickerGeo, this.stickerMaterials.B);
              sm.position.set(0, 0, -offset);
              sm.rotation.y = Math.PI;
              sm.userData = { face: 'B', isSticker: true };
              cubie.add(sm);
              stickers.push({ face: 'B', faceKey: 'B', localNormal: new THREE.Vector3(0, 0, -1), mesh: sm });
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
      if (this.cubeType === '2x2') {
        cubie.position.x = cubie.position.x > 0 ? 0.5 : -0.5;
        cubie.position.y = cubie.position.y > 0 ? 0.5 : -0.5;
        cubie.position.z = cubie.position.z > 0 ? 0.5 : -0.5;
      } else if (this.cubeType === 'mirror') {
        const snapM = (v) => (v > 0.4 ? 1.15 : (v < -0.4 ? -1.15 : 0));
        cubie.position.x = snapM(cubie.position.x);
        cubie.position.y = snapM(cubie.position.y);
        cubie.position.z = snapM(cubie.position.z);
      } else if (this.cubeType === '4x4') {
        const snap4 = (v) => {
          if (v > 0.72) return 1.08;
          if (v > 0) return 0.36;
          if (v > -0.72) return -0.36;
          return -1.08;
        };
        cubie.position.x = snap4(cubie.position.x);
        cubie.position.y = snap4(cubie.position.y);
        cubie.position.z = snap4(cubie.position.z);
      } else {
        cubie.position.x = Math.round(cubie.position.x);
        cubie.position.y = Math.round(cubie.position.y);
        cubie.position.z = Math.round(cubie.position.z);
      }

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

      const threshold = this.cubeType === '4x4' ? 0.72 : 0.2;
      const isPositive = (v) => v > threshold;
      const isNegative = (v) => v < -threshold;
      const isMiddle = (v) => Math.abs(v) <= threshold;

      const layerCubies = [];
      for (const cubie of this.cubies) {
        if (isWholeCube) {
          layerCubies.push(cubie);
          this.pivot.attach(cubie);
        } else {
          const posVal = cubie.position[coordKey];
          let matches = false;
          if (coordVal === 1) matches = isPositive(posVal);
          else if (coordVal === -1) matches = isNegative(posVal);
          else if (coordVal === 0) matches = isMiddle(posVal);

          if (matches) {
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
      const threshold = this.cubeType === '4x4' ? 0.72 : 0.2;

      if (ay > 0.8) {
        const signY = Math.sign(rotAxis.y);
        if (pos.y > threshold) {
          return signY < 0 ? 'U' : "U'";
        } else if (pos.y < -threshold) {
          return signY > 0 ? 'D' : "D'";
        } else {
          // Middle layer dragged horizontally -> rotate whole cube
          return signY < 0 ? 'y' : "y'";
        }
      }

      if (ax > 0.8) {
        const signX = Math.sign(rotAxis.x);
        if (pos.x > threshold) {
          return signX < 0 ? 'R' : "R'";
        } else if (pos.x < -threshold) {
          return signX > 0 ? 'L' : "L'";
        } else {
          // Middle layer dragged vertically -> rotate whole cube
          return signX < 0 ? 'x' : "x'";
        }
      }

      if (az > 0.8) {
        const signZ = Math.sign(rotAxis.z);
        if (pos.z > threshold) {
          return signZ < 0 ? 'F' : "F'";
        } else if (pos.z < -threshold) {
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

      if (this.cubeType !== '3x3') {
        const msg = this.currentLang === 'vi'
          ? 'Bộ giải Kociemba Two-Phase được thiết kế chuẩn quốc tế cho khối 3x3x3.\n\nBạn có thể nhấp vào tên Rubik ở góc trên để chuyển về khối 3x3x3 bất kỳ lúc nào!'
          : 'The two-phase Kociemba solver is designed specifically for 3x3x3 cubes.\n\nYou can click the cube title in the top header to switch back to 3x3x3!';
        alert(msg);
        return;
      }

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
      if (this.cubeType !== '3x3') return;
      const faceletStr = extractFaceletString(this.cubies, THREE);
      if (isCubeSolved(faceletStr)) {
        if (!this.wasSolved) {
          this.wasSolved = true;
          const dict = I18N[this.currentLang] || I18N.vi;
          this.updateStatus(dict.statusSolved, 'ready');
          this.celebrateSolve(false);
          this.updateUserTitle();
        }
      } else {
        this.wasSolved = false;
      }
      if (this.aiCoach && this.aiCoach.isOpen) {
        this.aiCoach.analyze();
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
      document.getElementById('btn-top-masterclass')?.addEventListener('click', () => {
        this.switchTab('masterclass-tab');
      });
      document.getElementById('btn-top-coach')?.addEventListener('click', () => {
        if (this.aiCoach) this.aiCoach.toggle();
      });
      document.getElementById('btn-floating-coach')?.addEventListener('click', () => {
        if (this.aiCoach) this.aiCoach.toggle();
      });

      // Scramble text click to copy
      document.querySelector('.scramble-bar')?.addEventListener('click', () => {
        const text = document.getElementById('scramble-text')?.textContent;
        if (text && text !== 'Solved') {
          navigator.clipboard.writeText(text);
          const bar = document.querySelector('.scramble-bar');
          if (bar) {
            const orig = bar.title;
            bar.title = 'Đã sao chép scramble!';
            setTimeout(() => { bar.title = orig; }, 1500);
          }
        }
      });

      // Zen Focus Mode
      document.getElementById('btn-toggle-focus')?.addEventListener('click', () => this.toggleFocusMode());
      document.getElementById('btn-exit-focus')?.addEventListener('click', () => this.toggleFocusMode());

      // Personalization: Iconic Speedcube Pickers
      document.querySelectorAll('.speedcube-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.applyIconicSpeedcube(btn.dataset.cube);
        });
      });

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

      // Language Switcher Toggle
      document.getElementById('btn-lang-toggle')?.addEventListener('click', () => {
        const nextLang = this.currentLang === 'vi' ? 'en' : 'vi';
        this.setLanguage(nextLang);
      });

      // Brand Click to open Cube Selector Modal
      const brandBtn = document.getElementById('brand-cube-selector');
      const cubeModal = document.getElementById('cube-selector-modal');
      const cubeBackdrop = document.getElementById('cube-selector-backdrop');
      const btnCloseCube = document.getElementById('btn-close-cube-selector');

      const openCubeModal = () => {
        if (cubeModal) cubeModal.classList.remove('hidden');
      };
      const closeCubeModal = () => {
        if (cubeModal) cubeModal.classList.add('hidden');
      };

      if (brandBtn) brandBtn.addEventListener('click', openCubeModal);
      if (btnCloseCube) btnCloseCube.addEventListener('click', closeCubeModal);
      if (cubeBackdrop) cubeBackdrop.addEventListener('click', closeCubeModal);

      // Cube format cards in selector modal (2x2, 3x3, mirror, 4x4)
      document.querySelectorAll('.cs-type-card').forEach(card => {
        card.addEventListener('click', () => {
          this.setCubeType(card.dataset.type);
          closeCubeModal();
        });
      });

      // Speedcube cards in selector modal
      document.querySelectorAll('.cs-speedcube-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.cs-speedcube-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          if (this.cubeType !== '3x3') {
            this.setCubeType('3x3');
          }
          this.applyIconicSpeedcube(card.dataset.cube);
          closeCubeModal();
        });
      });

      // User profile button in top nav opens settings tab
      document.getElementById('top-user-pill')?.addEventListener('click', () => {
        this.switchTab('settings-tab');
      });

      // Mobile Bottom Nav buttons
      document.querySelectorAll('.mob-nav-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchTab(btn.dataset.tab);
        });
      });
      document.getElementById('btn-mob-coach')?.addEventListener('click', () => {
        if (this.aiCoach) this.aiCoach.toggle();
      });
      document.getElementById('btn-mob-scanner')?.addEventListener('click', () => {
        if (this.scanner) this.scanner.open();
      });
    }

    setLanguage(lang) {
      if (!['vi', 'en'].includes(lang)) lang = 'vi';
      this.currentLang = lang;
      try {
        localStorage.setItem('rubik_language', lang);
      } catch (e) {}

      const dict = I18N[lang];
      if (!dict) return;

      document.title = dict.title;

      const codeEl = document.getElementById('lang-current-code');
      if (codeEl) codeEl.textContent = lang.toUpperCase();

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (dict[key]) el.textContent = dict[key];
      });

      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        if (dict[key]) el.setAttribute('title', dict[key]);
      });

      if (this.wasSolved) {
        this.updateStatus(dict.statusSolved, 'ready');
      }

      this.updateBrandSubtext();
    }

    updateBrandSubtext() {
      const sub = document.getElementById('brand-subtext');
      if (!sub) return;
      const lang = this.currentLang;
      if (this.cubeType === '2x2') {
        sub.textContent = lang === 'vi' ? 'Khối Bỏ Túi • 8 Viên Góc' : 'Pocket Cube • 8 Corners';
      } else if (this.cubeType === 'mirror') {
        sub.textContent = lang === 'vi' ? 'Gương Bạc Chrome Phản Chiếu' : 'Brushed Silver Chrome';
      } else if (this.cubeType === '4x4') {
        sub.textContent = lang === 'vi' ? "Khối 4 Tầng • 56 Viên Cubie" : "Rubik's Revenge • 56 Cubies";
      } else {
        const cubeInfo = ICONIC_CUBES[this.currentIconicCube];
        const cubeName = cubeInfo ? cubeInfo.name : 'GAN 14';
        sub.textContent = `${cubeName} • ${I18N[lang].brandSubtext}`;
      }
    }

    setCubeType(type) {
      if (!['3x3', '2x2', 'mirror', '4x4'].includes(type)) type = '3x3';
      this.cubeType = type;

      const badge = document.getElementById('current-cube-name-badge');
      const badgeNames = {
        '3x3': '3x3x3',
        '2x2': '2x2x2',
        'mirror': 'Mirror 3x3',
        '4x4': '4x4x4'
      };
      if (badge) badge.textContent = badgeNames[type];

      document.querySelectorAll('.cs-type-card').forEach(c => {
        c.classList.toggle('active', c.dataset.type === type);
      });

      this.stopPlayback();
      this.turnQueue = [];
      this.isRotating = false;
      this.moveCount = 0;
      this.updateMoveCounter();
      this.createCube();
      this.updateBrandSubtext();

      // Dynamic video & formula recommendations for the selected cube type
      if (this.cheatSheet) {
        this.cheatSheet.setCubeType(type);
      }
      if (this.masterclass) {
        this.masterclass.setCubeType(type);
      }

      const dict = I18N[this.currentLang];
      this.updateStatus(`${badgeNames[type]} ${dict.statusSolved}`, 'ready');
      this.clearSolutionUI();

      if (this.controls) {
        if (type === '4x4') {
          this.camera.position.set(5.5, 4.8, 6.8);
        } else if (type === '2x2') {
          this.camera.position.set(3.8, 3.4, 4.8);
        } else {
          this.camera.position.set(4.6, 4.2, 5.8);
        }
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
      }
    }

    switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      document.querySelectorAll('.mob-nav-btn[data-tab]').forEach(btn => {
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
        const dict = I18N[this.currentLang] || I18N.vi;
        let localized = text;
        if (text === 'Solved') localized = dict.statusSolved;
        else if (text === 'Scrambling...') localized = dict.statusBusy;
        else if (text === 'Scrambled') localized = dict.statusScrambled;
        else if (text.startsWith('Solver Error:')) localized = dict.statusError;
        else if (text === 'Calculating Solution...') localized = dict.statusBusy;
        el.textContent = localized;
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
      this.selectedTileIndex = 0; // Active tile for 1-tap quick color fixing

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

      // Next / Prev Face Navigation
      document.getElementById('btn-prev-face')?.addEventListener('click', () => this.advanceToPrevFace());
      document.getElementById('btn-next-face')?.addEventListener('click', () => this.advanceToNextFace());

      // 1-Tap Quick Swatch Color Fix
      document.querySelectorAll('.quick-swatch-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.applyColorToSelectedTile(btn.dataset.color);
        });
      });

      // Camera Controls
      document.getElementById('btn-start-camera')?.addEventListener('click', () => this.toggleCamera());
      document.getElementById('btn-capture-face')?.addEventListener('click', () => this.captureAndDetect());

      // Photo Upload (Single or Multiple Photos)
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
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      if (files.length === 1) {
        const file = files[0];
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
      } else {
        // Multi-image upload: map up to 6 images to faces in order ['U', 'L', 'F', 'R', 'B', 'D']
        const sequence = ['U', 'L', 'F', 'R', 'B', 'D'];
        let processedCount = 0;
        files.slice(0, 6).forEach((file, index) => {
          const face = sequence[index];
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const size = Math.min(img.width, img.height);
              const startX = (img.width - size) / 2;
              const startY = (img.height - size) / 2;
              const detected = sampleFaceletColors(img, startX, startY, size);
              this.applyDetectedToFace(face, detected);
              processedCount++;
              if (processedCount === Math.min(files.length, 6)) {
                this.setCurrentFace('U');
                const statusEl = document.getElementById('scanner-status-text');
                if (statusEl) {
                  statusEl.textContent = `Đã nhận diện thành công ${processedCount} mặt ảnh! Vui lòng kiểm tra lại sơ đồ bên dưới.`;
                  statusEl.className = 'status-msg status-success';
                }
              }
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      }
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

    advanceToPrevFace() {
      const sequence = ['U', 'L', 'F', 'R', 'B', 'D'];
      const currentIdx = sequence.indexOf(this.currentFace);
      if (currentIdx > 0) {
        this.setCurrentFace(sequence[currentIdx - 1]);
      } else {
        this.setCurrentFace(sequence[sequence.length - 1]);
      }
    }

    advanceToNextFace() {
      const sequence = ['U', 'L', 'F', 'R', 'B', 'D'];
      const currentIdx = sequence.indexOf(this.currentFace);
      if (currentIdx < sequence.length - 1) {
        this.setCurrentFace(sequence[currentIdx + 1]);
      } else {
        this.setCurrentFace(sequence[0]);
      }
    }

    applyColorToSelectedTile(colorKey) {
      if (this.selectedTileIndex === 4) return; // Center is locked
      const faceOffsetMap = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
      const offset = faceOffsetMap[this.currentFace];
      this.facelets[offset + this.selectedTileIndex] = colorKey;

      // Auto advance to next non-center tile for fast continuous fixing
      let nextTile = this.selectedTileIndex + 1;
      if (nextTile === 4) nextTile = 5;
      if (nextTile < 9) {
        this.selectedTileIndex = nextTile;
      }
      this.renderDetectedMiniGrid();
      this.render2DNet();
      this.validateState();
    }

    renderDetectedMiniGrid() {
      const grid = document.getElementById('detected-mini-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const faceOffsetMap = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
      const offset = faceOffsetMap[this.currentFace];

      const nameEl = document.getElementById('mini-grid-face-name');
      if (nameEl && COLOR_SCHEME[this.currentFace]) {
        nameEl.textContent = `${this.currentFace} (${COLOR_SCHEME[this.currentFace].name})`;
        nameEl.style.color = COLOR_SCHEME[this.currentFace].css;
      }

      for (let i = 0; i < 9; i++) {
        const faceletIdx = offset + i;
        const colorKey = this.facelets[faceletIdx];
        const tile = document.createElement('div');
        tile.className = `mini-tile color-${colorKey}`;
        tile.style.backgroundColor = COLOR_SCHEME[colorKey]?.css || '#fff';
        tile.textContent = colorKey;
        if (i === 4) tile.classList.add('center-tile');
        if (i === this.selectedTileIndex) tile.classList.add('selected');

        tile.addEventListener('click', () => {
          if (i !== 4) {
            this.selectedTileIndex = i;
            this.renderDetectedMiniGrid();
          }
        });

        // Double click or right click cycles color directly
        tile.addEventListener('dblclick', () => {
          if (i !== 4) {
            const colors = ['U', 'D', 'F', 'B', 'R', 'L'];
            const curIdx = colors.indexOf(this.facelets[faceletIdx]);
            const nextColor = colors[(curIdx + 1) % colors.length];
            this.facelets[faceletIdx] = nextColor;
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
  // Formula Cheat Sheet (Beginner, CFOP, 2x2, Mirror, 4x4 Algorithms)
  // ==========================================================================
  class FormulaCheatSheet {
    constructor(app) {
      this.app = app;
      this.cubeType = '3x3';
      this.activeCategory = 'all';

      this.dataByType = {
        '3x3': {
          categories: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'beginner', name: 'Cơ Bản (7 Bước)' },
            { id: 'oll', name: '2-Look OLL' },
            { id: 'pll', name: '2-Look PLL' }
          ],
          formulas: [
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
          ]
        },
        '2x2': {
          categories: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'layer1', name: 'Mặt Đáy (First Face)' },
            { id: 'oll2', name: 'OLL 2x2 (7 Thế)' },
            { id: 'pbl', name: 'PBL (Đổi Tầng)' }
          ],
          formulas: [
            {
              id: '2x2-face1',
              category: 'layer1',
              title: 'Mặt Đáy: Ghép 4 viên góc cùng màu',
              subtitle: 'First Face (Ortega Method)',
              algs: ["R", "U", "R'"],
              algString: "R U R' hoặc R' D' R D",
              desc: 'Với phương pháp Ortega, bạn chỉ cần gom 4 góc cùng màu về một mặt (ví dụ mặt trắng), KHÔNG cần khớp màu viền xung quanh như 3x3!'
            },
            {
              id: '2x2-oll-sune',
              category: 'oll2',
              title: 'OLL 2x2: Sune (Con Cá)',
              subtitle: '1 góc vàng hướng lên trên',
              algs: ["R", "U", "R'", "U", "R", "U2", "R'"],
              algString: "R U R' U R U2 R'",
              desc: 'Góc vàng hướng lên đặt ở vị trí dưới-trái (Front-Left), thực hiện Sune để hoàn thành mặt vàng.'
            },
            {
              id: '2x2-oll-antisune',
              category: 'oll2',
              title: 'OLL 2x2: Anti-Sune',
              subtitle: '1 góc vàng hướng lên trên',
              algs: ["R", "U2", "R'", "U'", "R", "U'", "R'"],
              algString: "R U2 R' U' R U' R'",
              desc: 'Góc vàng hướng lên đặt ở vị trí trên-phải (Back-Right), thực hiện Anti-Sune.'
            },
            {
              id: '2x2-oll-h',
              category: 'oll2',
              title: 'OLL 2x2: Chữ H (2 Cặp Đèn)',
              subtitle: 'Không góc vàng nào hướng lên',
              algs: ["R2", "U2", "R", "U2", "R2"],
              algString: "R2 U2 R U2 R2",
              desc: 'Đặt 2 cặp đèn pha chiếu về trước và sau, xoay R2 U2 R U2 R2.'
            },
            {
              id: '2x2-oll-pi',
              category: 'oll2',
              title: 'OLL 2x2: Chữ Pi',
              subtitle: '1 cặp đèn bên trái, 2 góc rời bên phải',
              algs: ["F", "R", "U", "R'", "U'", "R", "U", "R'", "U'", "F'"],
              algString: "F (R U R' U') (R U R' U') F'",
              desc: 'Đặt cặp đèn sang bên trái, thực hiện 2 lần Sexy Move kẹp giữa F và F\'.'
            },
            {
              id: '2x2-oll-t',
              category: 'oll2',
              title: 'OLL 2x2: Chữ T',
              subtitle: '1 cặp đèn chiếu sang 2 bên',
              algs: ["R", "U", "R'", "U'", "R'", "F", "R", "F'"],
              algString: "(R U R' U') (R' F R F')",
              desc: 'Đặt 2 góc vàng đã lật ở bên phải, thực hiện Sexy Move rồi Sledgehammer.'
            },
            {
              id: '2x2-oll-u',
              category: 'oll2',
              title: 'OLL 2x2: Đèn Pha U',
              subtitle: '2 góc vàng hướng lên, 2 góc chiếu trước',
              algs: ["F", "R", "U", "R'", "U'", "F'"],
              algString: "F (R U R' U') F'",
              desc: 'Đặt 2 góc vàng ở phía sau, 2 đèn chiếu về trước, xoay F R U R\' U\' F\'.'
            },
            {
              id: '2x2-oll-l',
              category: 'oll2',
              title: 'OLL 2x2: Cánh Cung L',
              subtitle: '2 góc vàng chéo nhau',
              algs: ["F", "R'", "F'", "R", "U", "R", "U'", "R'"],
              algString: "F R' F' R U R U' R'",
              desc: 'Thế góc chéo, đưa khối về mặt phẳng vàng hoàn chỉnh.'
            },
            {
              id: '2x2-pbl-both-bars',
              category: 'pbl',
              title: 'PBL: 2 Thanh Cạnh Kề Cả 2 Tầng',
              subtitle: 'Cả tầng trên và tầng dưới đều có 1 cặp trùng màu',
              algs: ["R", "U'", "R'", "U'", "F2", "U'", "R", "U", "R'", "D", "R2"],
              algString: "R U' R' U' F2 U' R U R' D R2",
              desc: 'Đặt 2 thanh kề cùng ở mặt trước, thực hiện công thức để giải hoàn tất cả 2 tầng trong 1 bước.'
            },
            {
              id: '2x2-pbl-diag-both',
              category: 'pbl',
              title: 'PBL: Chéo Cả 2 Tầng (Không có thanh kề)',
              subtitle: 'Cả 2 tầng đều không có cặp màu nào trùng nhau',
              algs: ["R2", "F2", "R2"],
              algString: "R2 F2 R2",
              desc: 'Công thức thần thánh chỉ 3 nước đi giải quyết trường hợp chéo đôi!'
            },
            {
              id: '2x2-pbl-top-bar',
              category: 'pbl',
              title: 'PBL: Tầng Trên Có Thanh, Tầng Dưới Đã Xong',
              subtitle: 'T-Perm hoặc J-Perm',
              algs: ["R", "U", "R'", "U'", "R'", "F", "R2", "U'", "R'", "U'", "R", "U", "R'", "F'"],
              algString: "R U R' U' R' F R2 U' R' U' R U R' F'",
              desc: 'Đưa thanh trùng màu sang bên trái và thực hiện T-Perm.'
            },
            {
              id: '2x2-pbl-top-diag',
              category: 'pbl',
              title: 'PBL: Tầng Trên Chéo, Tầng Dưới Đã Xong',
              subtitle: 'Y-Perm 2x2',
              algs: ["F", "R", "U'", "R'", "U'", "R", "U", "R'", "F'", "R", "U", "R'", "U'", "R'", "F", "R", "F'"],
              algString: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
              desc: 'Giải quyết góc chéo tầng trên khi tầng dưới đã hoàn thành.'
            }
          ]
        },
        'mirror': {
          categories: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'm-cross', name: 'Tầng 1 (Khối Dày Nhất)' },
            { id: 'm-f2l', name: 'Tầng 2 (Khối Dài)' },
            { id: 'm-top', name: 'Tầng 3 (Mặt Phẳng)' }
          ],
          formulas: [
            {
              id: 'mirror-cross',
              category: 'm-cross',
              title: 'Quy Tắc Vàng: Chọn Tâm Dày Nhất Làm Đáy',
              subtitle: 'Thickest Center as White Cross',
              algs: ["F2"],
              algString: "Xoay thử các cạnh quanh tâm dày nhất",
              desc: 'Tìm mặt tâm có độ lồi cao nhất khối. Ghép 4 viên cạnh có cùng độ cao với tâm này để tạo dấu cộng phẳng đầu tiên.'
            },
            {
              id: 'mirror-corner',
              category: 'm-cross',
              title: 'Ghép 4 Góc Tầng 1 Bằng Sexy Move',
              subtitle: 'Sexy Move theo xúc giác độ dày',
              algs: ["R", "U", "R'", "U'"],
              algString: "R U R' U' (1 - 5 lần)",
              desc: 'Đưa viên góc to nhất vào vị trí. Dùng ngón tay sờ mép: nếu khớp phẳng lì với 2 cạnh xung quanh là chính xác!'
            },
            {
              id: 'mirror-f2l-right',
              category: 'm-f2l',
              title: 'Tầng 2: Đưa Cạnh Sang Phải',
              subtitle: 'Cạnh tầng 2 có chiều rộng trùng tâm',
              algs: ["U", "R", "U'", "R'", "U'", "F'", "U", "F"],
              algString: "U R U' R' U' F' U F",
              desc: 'Xoay tầng trên tìm cạnh phẳng với tâm mặt trước, áp dụng công thức để đẩy sang bên phải.'
            },
            {
              id: 'mirror-f2l-left',
              category: 'm-f2l',
              title: 'Tầng 2: Đưa Cạnh Sang Trái',
              subtitle: 'Cạnh tầng 2 có chiều rộng trùng tâm',
              algs: ["U'", "L'", "U", "L", "U", "F", "U'", "F'"],
              algString: "U' L' U L U F U' F'",
              desc: 'Xoay tầng trên tìm cạnh phẳng với tâm mặt trước, áp dụng công thức để đẩy sang bên trái.'
            },
            {
              id: 'mirror-top-cross',
              category: 'm-top',
              title: 'Tầng 3: Tạo Dấu Cộng Phẳng Đỉnh',
              subtitle: 'Nhận diện theo chiều cao các cạnh nhô lên',
              algs: ["F", "R", "U", "R'", "U'", "F'"],
              algString: "F R U R' U' F'",
              desc: 'Chỉ quan sát các cạnh có chiều cao bằng phẳng với tâm đỉnh. Dùng công thức để đưa cả 4 cạnh về cùng một độ cao.'
            },
            {
              id: 'mirror-top-oll',
              category: 'm-top',
              title: 'Tầng 3: Làm Phẳng Toàn Bộ Mặt Đỉnh (Sune)',
              subtitle: 'Cả 4 góc bằng phẳng với tâm đỉnh',
              algs: ["R", "U", "R'", "U", "R", "U2", "R'"],
              algString: "R U R' U R U2 R'",
              desc: 'Áp dụng Sune cho đến khi toàn bộ 9 ô của mặt trên tạo thành một mặt phẳng hoàn hảo.'
            },
            {
              id: 'mirror-top-pll',
              category: 'm-top',
              title: 'Tầng 3: Hoán Vị Góc Về Đúng Kích Thước Khối (T-Perm)',
              subtitle: 'Khối Rubik trở lại hình lập phương hoàn hảo',
              algs: ["R", "U", "R'", "U'", "R'", "F", "R2", "U'", "R'", "U'", "R", "U", "R'", "F'"],
              algString: "R U R' U' R' F R2 U' R' U' R U R' F'",
              desc: 'Tìm 2 góc đã khớp phẳng với cạnh viền để sang bên trái, thực hiện T-Perm để trả khối về hình hộp vuông vức!'
            }
          ]
        },
        '4x4': {
          categories: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'centers', name: 'Gom Tâm (Centers)' },
            { id: 'edges', name: 'Ghép Cạnh (Edges)' },
            { id: 'parity', name: 'Lỗi Parity 4x4' }
          ],
          formulas: [
            {
              id: '4x4-center-bar',
              category: 'centers',
              title: 'Ghép Cặp Tâm 1x2 & Đưa Vào Vị Trí',
              subtitle: 'Half-Center Bar',
              algs: ["Rw", "U", "Rw'"],
              algString: "Rw U Rw'",
              desc: 'Ghép 2 viên tâm cùng màu thành 1 thanh 1x2, xoay U để né và đưa Rw\' để bảo toàn tâm đối diện.'
            },
            {
              id: '4x4-center-swap',
              category: 'centers',
              title: 'Hoán Vị Tâm Cuối Không Phá Tâm Trước',
              subtitle: 'Last 2 Centers Commutator',
              algs: ["Rw", "U", "Rw'", "U", "Rw", "U2", "Rw'"],
              algString: "Rw U Rw' U Rw U2 Rw'",
              desc: 'Giải quyết 2 tâm cuối cùng (thường là Cam và Xanh lá) mà không làm vỡ các tâm đã hoàn thành.'
            },
            {
              id: '4x4-edge-pair',
              category: 'edges',
              title: 'Ghép Cạnh 4x4: Thuật Toán Lật Cạnh (Flipping Alg)',
              subtitle: 'Edge Pairing (Slice-Flip-Slice)',
              algs: ["R", "U", "R'", "F", "R'", "F'", "R"],
              algString: "Uw' (R U R' F R' F' R) Uw",
              desc: 'Đưa 2 viên cạnh cùng màu về vị trí đối diện ở tầng giữa, xoay Uw\' ghép cặp, lật bằng (R U R\' F R\' F\' R) rồi trả lại Uw.'
            },
            {
              id: '4x4-oll-parity',
              category: 'parity',
              title: 'Lỗi OLL Parity: Lật 1 Cạnh Đơn Tầng Cuối',
              subtitle: 'Trường hợp không thể xảy ra trên 3x3',
              algs: ["Rw", "U2", "x", "Rw", "U2", "Rw", "U2", "Rw'", "U2", "Lw", "U2", "Rw'", "U2", "Rw", "U2", "Rw'", "U2", "Rw'"],
              algString: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
              desc: 'Công thức thần thánh lật 1 viên cạnh duy nhất ở tầng 3 để tạo dấu cộng hợp lệ.'
            },
            {
              id: '4x4-pll-parity',
              category: 'parity',
              title: 'Lỗi PLL Parity: Đổi Chỗ 2 Cạnh Đối Diện',
              subtitle: '2 cạnh tầng cuối bị tráo đổi',
              algs: ["2R2", "U2", "2R2", "Uw2", "2R2", "2Uw2"],
              algString: "2R2 U2 2R2 Uw2 2R2 2Uw2",
              desc: 'Chỉ 6 bước xoay tầng trong 2R2 U2 2R2 Uw2 2R2 2Uw2 để hoán đổi 2 viên cạnh đối xứng về vị trí chuẩn.'
            }
          ]
        }
      };

      this.initUI();
    }

    setCubeType(type) {
      if (!this.dataByType[type]) type = '3x3';
      this.cubeType = type;
      this.activeCategory = 'all';
      this.renderCategoryFilterBar();
      this.renderFormulas();
    }

    initUI() {
      this.renderCategoryFilterBar();
      this.renderFormulas();
    }

    renderCategoryFilterBar() {
      const bar = document.getElementById('cheat-filter-bar');
      if (!bar) return;
      const typeData = this.dataByType[this.cubeType] || this.dataByType['3x3'];
      bar.innerHTML = '';
      typeData.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `cheat-filter-btn ${cat.id === this.activeCategory ? 'active' : ''}`;
        btn.dataset.category = cat.id;
        btn.textContent = cat.name;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.cheat-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeCategory = cat.id;
          this.renderFormulas();
        });
        bar.appendChild(btn);
      });
    }

    renderFormulas() {
      const container = document.getElementById('cheat-sheet-list');
      if (!container) return;
      container.innerHTML = '';

      const typeData = this.dataByType[this.cubeType] || this.dataByType['3x3'];
      const formulasList = typeData.formulas;

      const filtered = this.activeCategory === 'all'
        ? formulasList
        : formulasList.filter(f => f.category === this.activeCategory);

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
            <button class="btn-try-3d" title="Xem trên khối 3D">
              <span class="btn-icon">▶</span>
              <span>Thử trên 3D</span>
            </button>
            <button class="btn-copy-alg" title="Sao chép công thức">
              <span class="btn-icon">📋</span>
              <span>Copy</span>
            </button>
          </div>
        `;

        card.querySelector('.btn-try-3d')?.addEventListener('click', () => {
          this.app.queueSequence(item.algs, { duration: 200 });
        });

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

  // ==========================================================================
  // Masterclass & World Champions Video Guides (Dynamic for 3x3, 2x2, Mirror, 4x4)
  // ==========================================================================
  class MasterclassManager {
    constructor(app) {
      this.app = app;
      this.cubeType = '3x3';
      this.activePro = 'all';

      this.dataByType = {
        '3x3': {
          filters: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'jperm', name: 'J Perm' },
            { id: 'feliks', name: 'Feliks Zemdegs' },
            { id: 'maxpark', name: 'Max Park (WR)' },
            { id: 'tymon', name: 'Tymon Kolasiński' }
          ],
          videos: [
            {
              id: 'jperm_beginner',
              pro: 'jperm',
              author: 'J Perm',
              authorSub: '5.2M Subscribers • Thánh Hướng Dẫn',
              avatar: '🎓',
              level: 'Beginner (Cơ Bản)',
              badgeClass: 'badge-beginner',
              title: 'Hướng Dẫn Giải Rubik 3x3 Cơ Bản 7 Bước Dễ Hiểu Nhất',
              ytId: 'R-R0KrXvWbc',
              duration: '10:14',
              quote: '“Đừng học thuộc lòng vẹt! Hãy hiểu cơ chế hoán vị của từng viên cạnh và góc. Nắm vững Sexy Move (R U R\' U\') sẽ giải quyết được 80% tình huống.”',
              scramble: "D' R2 U' B2 U F2 D' B2 L2 D2 L' U B' R2 B2 D2 U' F L",
              tryType: 'scramble',
              tryLabel: '⚡ Nạp Scramble Luyện Tập'
            },
            {
              id: 'jperm_cfop',
              pro: 'jperm',
              author: 'J Perm',
              authorSub: '5.2M Subscribers • Thánh Hướng Dẫn',
              avatar: '⚡',
              level: 'CFOP (Sub-20)',
              badgeClass: 'badge-cfop',
              title: 'Lộ Trình Học Full CFOP Từ Sub-60 Xuống Sub-20',
              ytId: 'x5jB_6jYk4M',
              duration: '14:32',
              quote: '“Look-ahead quan trọng hơn TPS rất nhiều. Khi xoay cặp F2L hiện tại, mắt bạn phải quét tìm cặp F2L tiếp theo. Tuyệt đối không nhìn vào viên đang xoay!”',
              scramble: "R U R' U' R' F R2 U' R' U' R U R' F'",
              tryType: 'alg',
              tryLabel: '⚡ Thử T-Perm Kinh Điển'
            },
            {
              id: 'feliks_inspection',
              pro: 'feliks',
              author: 'Feliks Zemdegs',
              authorSub: '2x World Champion • 120+ Kỷ Lục Thế Giới',
              avatar: '🏆',
              level: 'Nâng Cao (Sub-15)',
              badgeClass: 'badge-wr',
              title: 'Masterclass: Cách Quan Sát 15s (Inspection) & Lập Kế Hoạch Cross + 1st Pair',
              ytId: 'MS5jhby2VdY',
              duration: '11:45',
              quote: '“15 giây quan sát đầu trận là 70% chiến thắng. Mục tiêu là lập kế hoạch giải xong Chữ Thập (Cross) nhắm mắt dưới 8 bước, đồng thời bám vết cặp F2L đầu tiên!”',
              scramble: "B2 L2 U2 R2 D' F2 D B2 R2 D2 U' F' L' B' D' R' F' D R2 U",
              tryType: 'scramble',
              tryLabel: '⚡ Thử Scramble 4.22s Của Feliks'
            },
            {
              id: 'max_park_wr',
              pro: 'maxpark',
              author: 'Max Park',
              authorSub: 'WR 3.13s Single • Huyền Thoại Tốc Độ',
              avatar: '🔥',
              level: 'Kỷ Lục Thế Giới (WR)',
              badgeClass: 'badge-wr',
              title: 'Max Park Phân Tích Kỷ Lục Thế Giới 3.13 Giây & Kỹ Thuật Rotationless F2L',
              ytId: 'fbdQn3Z3gM4',
              duration: '08:20',
              quote: '“Hạn chế tối đa việc xoay toàn bộ khối (Cube Rotations). Hãy học cách chèn F2L vào các khe phía sau (Back-slot insertion) bằng cả hai tay để giữ nhịp TPS trên 10 turns/s!”',
              scramble: "D2 F' R2 U' B2 L2 F2 R2 U' B2 U F R' D' F2 L' B2 D2 F' R2",
              tryType: 'scramble',
              tryLabel: '⚡ Nạp Kỷ Lục WR 3.13s Của Max'
            },
            {
              id: 'tymon_fingertricks',
              pro: 'tymon',
              author: 'Tymon Kolasiński',
              authorSub: 'Vô Địch Châu Âu • Bậc Thầy TPS & FMC',
              avatar: '⚡',
              level: 'Chuyên Nghiệp (Sub-10)',
              badgeClass: 'badge-tps',
              title: 'Tymon Hướng Dẫn Finger-tricks Mượt Mà Cho Sexy Move, Sune & PLL',
              ytId: '3bV-3-J3E0E',
              duration: '13:05',
              quote: '“Đừng gồng cổ tay! Xoay bằng đầu đốt ngón trỏ và ngón áp út. Thành thạo U2 Double Flick (ngón trỏ rồi ngón giữa kéo bồi) sẽ nhân đôi TPS của bạn!”',
              scramble: "R U2 R' U' R U' R'",
              tryType: 'alg',
              tryLabel: '⚡ Luyện Sune Siêu Tốc'
            }
          ]
        },
        '2x2': {
          filters: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'jperm', name: 'J Perm' },
            { id: 'zayn', name: 'Zayn Khanani (WR)' },
            { id: 'cubehead', name: 'CubeHead' }
          ],
          videos: [
            {
              id: '2x2_jperm',
              pro: 'jperm',
              author: 'J Perm',
              authorSub: '5.2M Subscribers • Thánh Hướng Dẫn',
              avatar: '⚡',
              level: 'Cơ Bản & Tốc Độ',
              badgeClass: 'badge-beginner',
              title: 'Hướng Dẫn Giải Rubik 2x2 Cực Nhanh Bằng Phương Pháp Ortega',
              ytId: '7v_Hw1zXz0w',
              duration: '09:40',
              quote: '“Ortega là bí quyết giải 2x2 dưới 5 giây nhanh nhất: Giải mặt đáy bất kỳ -> OLL mặt trên -> Hoán vị cả 2 tầng (PBL) chỉ với 1 thuật toán.”',
              scramble: "R U' R' U' F2 U' R U R' D R2",
              tryType: 'alg',
              tryLabel: '⚡ Thử PBL Cạnh Kề'
            },
            {
              id: '2x2_zayn',
              pro: 'zayn',
              author: 'Zayn Khanani',
              authorSub: 'Kỷ Lục Gia WR 2x2 0.43s • Bậc Thầy One-Look',
              avatar: '🏆',
              level: 'Kỷ Lục Thế Giới (WR)',
              badgeClass: 'badge-wr',
              title: 'Zayn Khanani Phân Tích Kỷ Lục 2x2 Dưới 1 Giây & Kỹ Thuật 1-Look CLL',
              ytId: '3uGvC139z-o',
              duration: '11:15',
              quote: '“Trong 15 giây quan sát, bạn phải giải xong cả khối trong đầu trước khi chạm tay vào Rubik. Tốc độ quay đạt tới 14 turns/giây.”',
              scramble: "R2 F2 R2",
              tryType: 'alg',
              tryLabel: '⚡ Thử 3 Nước Diệu Kỳ R2 F2 R2'
            },
            {
              id: '2x2_cubehead',
              pro: 'cubehead',
              author: 'CubeHead',
              authorSub: '2.1M Subscribers • Chuyên Gia Speedcubing',
              avatar: '🎯',
              level: 'Sub-4 Giây',
              badgeClass: 'badge-cfop',
              title: 'Lộ Trình Tập 2x2 Xuống Sub-3 Giây & Tối Ưu Hóa Finger-tricks Tầng Đáy',
              ytId: 'sO6rO-5b01M',
              duration: '08:50',
              quote: '“Sử dụng ngón áp út tay trái kéo tầng D và tập thói quen không bao giờ xoay cả khối (Zero Rotations) khi giải 2x2.”',
              scramble: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
              tryType: 'alg',
              tryLabel: '⚡ Luyện Y-Perm 2x2'
            }
          ]
        },
        'mirror': {
          filters: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'jperm', name: 'J Perm' },
            { id: 'tingman', name: 'Tingman' },
            { id: 'cubehead', name: 'CubeHead' }
          ],
          videos: [
            {
              id: 'mirror_jperm',
              pro: 'jperm',
              author: 'J Perm',
              authorSub: '5.2M Subscribers • Thánh Hướng Dẫn',
              avatar: '🪞',
              level: 'Toàn Diện',
              badgeClass: 'badge-beginner',
              title: 'Hướng Dẫn Giải Rubik Gương (Mirror Blocks) Dễ Nhất',
              ytId: 'iL3Q9p9G7Zg',
              duration: '12:20',
              quote: '“Đừng bị đánh lừa bởi màu sắc đồng nhất! Khối Rubik Gương chính là 3x3 nhưng mã hóa bằng kích thước. Tìm tâm có độ nhô cao nhất làm tầng đáy và giải theo CFOP.”',
              scramble: "R U R' U' R' F R2 U' R' U' R U R' F'",
              tryType: 'alg',
              tryLabel: '⚡ Thử T-Perm Cho Mirror Cube'
            },
            {
              id: 'mirror_tingman',
              pro: 'tingman',
              author: 'Tingman',
              authorSub: '1.8M Subscribers • Speedcuber & Reviewer',
              avatar: '💡',
              level: 'Mẹo Xúc Giác & Nhận Diện',
              badgeClass: 'badge-tps',
              title: 'Mẹo Nhận Diện Khối Rubik Gương Siêu Tốc Bằng Cảm Giác Độ Phẳng Của Bề Mặt',
              ytId: 'w49-2e6Vomg',
              duration: '10:05',
              quote: '“Ngón tay bạn là cảm biến nhạy nhất: vuốt nhẹ ngón cái qua gờ giữa các khối. Nếu trơn tru không gợn, bạn đã tìm đúng vị trí của viên cạnh!”',
              scramble: "F R U R' U' F'",
              tryType: 'alg',
              tryLabel: '⚡ Thử Mặt Phẳng Tầng Đỉnh'
            },
            {
              id: 'mirror_cubehead',
              pro: 'cubehead',
              author: 'CubeHead',
              authorSub: '2.1M Subscribers • Chuyên Gia Speedcubing',
              avatar: '🔥',
              level: 'Tốc Độ Sub-30s',
              badgeClass: 'badge-wr',
              title: 'Thử Thách Giải Rubik Gương Tốc Độ Dưới 30 Giây',
              ytId: 'X0e3xP9WbYs',
              duration: '07:45',
              quote: '“Khối Rubik biến hình cực kỳ ấn tượng khi xáo trộn. Luyện tập trí tưởng tượng không gian 3D sẽ giúp bạn giải nó nhanh như 3x3 thông thường!”',
              scramble: "R U R' U R U2 R'",
              tryType: 'alg',
              tryLabel: '⚡ Thử Sune Tầng 3'
            }
          ]
        },
        '4x4': {
          filters: [
            { id: 'all', name: 'Tất Cả' },
            { id: 'jperm', name: 'J Perm' },
            { id: 'maxpark', name: 'Max Park (WR)' },
            { id: 'feliks', name: 'Feliks Zemdegs' }
          ],
          videos: [
            {
              id: '4x4_jperm',
              pro: 'jperm',
              author: 'J Perm',
              authorSub: '5.2M Subscribers • Thánh Hướng Dẫn',
              avatar: '⚡',
              level: 'Yau Method Chuẩn Thi Đấu',
              badgeClass: 'badge-cfop',
              title: 'Hướng Dẫn Giải Rubik 4x4 Toàn Diện Bằng Phương Pháp Yau Method',
              ytId: 'KMWz8wvxvNE',
              duration: '16:50',
              quote: '“Yau Method giải quyết triệt để vấn đề mất dấu Chữ Thập. Hoàn thành 2 tâm đối diện -> 3 cạnh chữ thập trắng -> 4 tâm còn lại -> ghép cạnh 3-2-2-2!”',
              scramble: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
              tryType: 'alg',
              tryLabel: '⚡ Nạp Công Thức OLL Parity'
            },
            {
              id: '4x4_maxpark',
              pro: 'maxpark',
              author: 'Max Park',
              authorSub: 'WR 4x4 Single 15.71s & Avg 19.38s • Huyền Thoại 4x4',
              avatar: '🏆',
              level: 'Kỷ Lục Thế Giới (WR)',
              badgeClass: 'badge-wr',
              title: 'Max Park Phân Tích Kỷ Lục Thế Giới 4x4 15.71s & Kỹ Năng Ghép Cạnh Tốc Độ',
              ytId: '4j076Z_V-i4',
              duration: '09:30',
              quote: '“Khi ghép cạnh 4x4, luôn giữ tầm nhìn rộng mở bao quát toàn khối. Đừng bao giờ chớp mắt ở giai đoạn 3-2-2-2 và chuẩn bị sẵn tay cho thuật toán Parity.”',
              scramble: "2R2 U2 2R2 Uw2 2R2 2Uw2",
              tryType: 'alg',
              tryLabel: '⚡ Nạp Công Thức PLL Parity'
            },
            {
              id: '4x4_feliks',
              pro: 'feliks',
              author: 'Feliks Zemdegs',
              authorSub: 'Cựu Kỷ Lục Gia Thế Giới 4x4 • Bậc Thầy Kỹ Thuật',
              avatar: '🎯',
              level: 'Nâng Cao (Sub-35s)',
              badgeClass: 'badge-wr',
              title: 'Kỹ Thuật Ghép Cạnh 4x4 3-2-2-2 & Xử Lý Triệt Để Các Thế Parity',
              ytId: 'd3tKz8k_D5s',
              duration: '12:10',
              quote: '“Nắm chắc công thức hoán đổi 2 cạnh đối diện Uw\' (R U R\' F R\' F\' R) Uw để ghép cặp mượt mà không cần suy nghĩ.”',
              scramble: "R U R' F R' F' R",
              tryType: 'alg',
              tryLabel: '⚡ Thử Thuật Toán Lật Cạnh'
            }
          ]
        }
      };

      this.currentModalVideo = null;
      this.initEvents();
      this.renderFilterBar();
      this.render();
    }

    setCubeType(type) {
      if (!this.dataByType[type]) type = '3x3';
      this.cubeType = type;
      this.activePro = 'all';
      this.renderFilterBar();
      this.render();
    }

    renderFilterBar() {
      const bar = document.getElementById('masterclass-filter-bar');
      if (!bar) return;
      const typeData = this.dataByType[this.cubeType] || this.dataByType['3x3'];
      bar.innerHTML = '';
      typeData.filters.forEach(f => {
        const btn = document.createElement('button');
        btn.className = `masterclass-filter-btn ${f.id === this.activePro ? 'active' : ''}`;
        btn.dataset.pro = f.id;
        btn.textContent = f.name;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.masterclass-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activePro = f.id;
          this.render();
        });
        bar.appendChild(btn);
      });
    }

    initEvents() {
      // YouTube Modal Close & Backdrop
      document.getElementById('btn-close-yt-modal')?.addEventListener('click', () => this.closeModal());
      document.getElementById('yt-backdrop')?.addEventListener('click', () => this.closeModal());

      // Modal "Try on 3D" action button
      document.getElementById('btn-yt-try-3d')?.addEventListener('click', () => {
        if (this.currentModalVideo) {
          this.executeVideoAction(this.currentModalVideo);
          this.closeModal();
        }
      });
    }

    openModal(video) {
      this.currentModalVideo = video;
      const modal = document.getElementById('youtube-modal');
      const iframe = document.getElementById('yt-iframe');
      const title = document.getElementById('yt-modal-title');
      const desc = document.getElementById('yt-modal-desc');
      const actionText = document.getElementById('btn-yt-try-3d-text');

      if (title) title.textContent = video.title;
      if (desc) desc.textContent = `${video.author} (${video.authorSub}) • ${video.quote}`;
      if (actionText) actionText.textContent = video.tryLabel;
      if (iframe) iframe.src = `https://www.youtube-nocookie.com/embed/${video.ytId}?autoplay=1`;

      if (modal) modal.classList.remove('hidden');
    }

    closeModal() {
      const modal = document.getElementById('youtube-modal');
      const iframe = document.getElementById('yt-iframe');
      if (iframe) iframe.src = '';
      if (modal) modal.classList.add('hidden');
      this.currentModalVideo = null;
    }

    executeVideoAction(video) {
      if (video.tryType === 'scramble') {
        this.app.createCube();
        this.app.queueSequence(video.scramble, { duration: 120 });
        this.app.updateScrambleDisplay(video.scramble);
        this.app.updateStatus('Scrambled', 'scrambled');
      } else {
        this.app.queueSequence(video.scramble, { duration: 200 });
      }
      this.app.switchTab('controls-tab');
    }

    render() {
      const container = document.getElementById('masterclass-card-list');
      if (!container) return;
      container.innerHTML = '';

      const typeData = this.dataByType[this.cubeType] || this.dataByType['3x3'];
      const videoList = typeData.videos;

      const filtered = this.activePro === 'all'
        ? videoList
        : videoList.filter(v => v.pro === this.activePro);

      filtered.forEach(video => {
        const card = document.createElement('div');
        card.className = 'pro-card';

        const thumbUrl = `https://img.youtube.com/vi/${video.ytId}/hqdefault.jpg`;

        card.innerHTML = `
          <div class="pro-card-header">
            <div class="pro-author-wrap">
              <div class="pro-avatar">${video.avatar}</div>
              <div>
                <div class="pro-author-name">${video.author}</div>
                <div class="pro-author-sub">${video.authorSub}</div>
              </div>
            </div>
            <span class="pro-level-badge ${video.badgeClass}">${video.level}</span>
          </div>

          <div class="pro-thumb-container" title="Bấm để xem video">
            <img src="${thumbUrl}" alt="${video.title}" loading="lazy">
            <div class="pro-play-overlay">▶</div>
            <span class="pro-duration-pill">${video.duration}</span>
          </div>

          <h4 class="pro-video-title">${video.title}</h4>

          <div class="pro-quote-box">
            ${video.quote}
          </div>

          <div class="pro-card-actions">
            <button class="pro-btn-watch btn-watch-video" title="Xem video hướng dẫn">
              <span>▶</span>
              <span>Xem Video</span>
            </button>
            <button class="pro-btn-try btn-try-action" title="${video.tryLabel}">
              <span>⚡</span>
              <span>${video.tryLabel}</span>
            </button>
          </div>
        `;

        card.querySelector('.pro-thumb-container')?.addEventListener('click', () => this.openModal(video));
        card.querySelector('.btn-watch-video')?.addEventListener('click', () => this.openModal(video));
        card.querySelector('.btn-try-action')?.addEventListener('click', () => this.executeVideoAction(video));

        container.appendChild(card);
      });
    }
  }

  // ==========================================================================
  // Interactive AI Rubik Coach & Assistant
  // ==========================================================================
  class RubikAICoach {
    constructor(app) {
      this.app = app;
      this.isOpen = false;
      this.currentHintMoves = [];
      this.currentStage = 'cross';
      this.initEvents();
      setTimeout(() => this.analyze(), 600);
    }

    initEvents() {
      document.getElementById('btn-close-coach')?.addEventListener('click', () => this.close());
      document.getElementById('btn-refresh-coach')?.addEventListener('click', () => this.analyze());

      document.getElementById('btn-coach-demo-step')?.addEventListener('click', () => this.executeHintDemo());
      document.getElementById('btn-coach-auto-solve')?.addEventListener('click', () => {
        this.close();
        this.app.solve();
      });

      document.querySelectorAll('.coach-prompt-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          this.handleQuickPrompt(btn.dataset.prompt);
        });
      });

      document.getElementById('btn-coach-send')?.addEventListener('click', () => this.sendUserMessage());
      document.getElementById('coach-user-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendUserMessage();
        }
      });
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      const drawer = document.getElementById('ai-coach-drawer');
      if (drawer) drawer.classList.remove('hidden');
      this.analyze();
    }

    close() {
      this.isOpen = false;
      const drawer = document.getElementById('ai-coach-drawer');
      if (drawer) drawer.classList.add('hidden');
    }

    analyze() {
      if (this.app.cubeType !== '3x3') {
        const stageBadge = document.getElementById('coach-stage-badge');
        const stageDesc = document.getElementById('coach-stage-desc');
        const isVi = this.app.currentLang === 'vi';
        if (stageBadge) {
          stageBadge.textContent = isVi ? `KHỐI ${this.app.cubeType.toUpperCase()}` : `${this.app.cubeType.toUpperCase()} CUBE`;
          stageBadge.className = 'stage-badge badge-ready';
        }
        if (stageDesc) {
          stageDesc.innerHTML = isVi
            ? `Bạn đang luyện tập khối <strong>${this.app.cubeType.toUpperCase()}</strong>. Hãy tự do luyện tập xoay, hoặc nhấp vào tiêu đề để chuyển về khối 3x3x3 nhận phân tích CFOP nhé!`
            : `You are currently training on the <strong>${this.app.cubeType.toUpperCase()}</strong> cube. Feel free to practice, or click the title to switch to 3x3x3 for full CFOP diagnostics!`;
        }
        this.updateHintDisplay([], isVi ? 'Chế độ luyện tập tự do' : 'Free practice mode', 'ready');
        return;
      }

      let faceletStr = '';
      try {
        faceletStr = extractFaceletString(this.app.cubies, THREE);
      } catch (e) {
        return;
      }

      const isSolved = isCubeSolved(faceletStr);
      const stageBadge = document.getElementById('coach-stage-badge');
      const progressBar = document.getElementById('coach-stage-progress');
      const stageDesc = document.getElementById('coach-stage-desc');
      const statCross = document.getElementById('stat-cross-val');
      const statFirst = document.getElementById('stat-first-val');
      const statF2L = document.getElementById('stat-f2l-val');
      const statLL = document.getElementById('stat-ll-val');

      if (isSolved) {
        this.currentStage = 'solved';
        if (stageBadge) {
          stageBadge.textContent = 'ĐÃ GIẢI HOÀN TẤT (100%)';
          stageBadge.className = 'stage-badge badge-ready';
        }
        if (progressBar) progressBar.style.width = '100%';
        if (stageDesc) stageDesc.innerHTML = 'Khối Rubik 3D đã được giải hoàn chỉnh 100%. Sẵn sàng xáo trộn (Scramble) hoặc bấm giờ luyện tập.';
        if (statCross) statCross.textContent = '4/4';
        if (statFirst) statFirst.textContent = '4/4';
        if (statF2L) statF2L.textContent = '4/4';
        if (statLL) statLL.textContent = 'Đã xong';

        this.updateHintDisplay([], 'Trạng thái: Hoàn thành 100%', 'solved');
        return;
      }

      // 1. Check White Cross (Face U edges: UB, UL, UR, UF)
      let crossCount = 0;
      if (faceletStr[1] === 'U' && faceletStr[46] === 'B') crossCount++;
      if (faceletStr[3] === 'U' && faceletStr[37] === 'L') crossCount++;
      if (faceletStr[5] === 'U' && faceletStr[10] === 'R') crossCount++;
      if (faceletStr[7] === 'U' && faceletStr[19] === 'F') crossCount++;

      // 2. Check First Layer Corners (U0, U2, U6, U8)
      let cornersCount = 0;
      if (crossCount === 4) {
        if (faceletStr[0] === 'U' && faceletStr[47] === 'B' && faceletStr[36] === 'L') cornersCount++;
        if (faceletStr[2] === 'U' && faceletStr[45] === 'B' && faceletStr[11] === 'R') cornersCount++;
        if (faceletStr[6] === 'U' && faceletStr[18] === 'F' && faceletStr[38] === 'L') cornersCount++;
        if (faceletStr[8] === 'U' && faceletStr[20] === 'F' && faceletStr[9] === 'R') cornersCount++;
      }

      // 3. Check Middle Layer (F2L) Edges (FL, FR, BL, BR)
      let f2lCount = 0;
      if (cornersCount === 4) {
        if (faceletStr[21] === 'F' && faceletStr[39] === 'L') f2lCount++;
        if (faceletStr[23] === 'F' && faceletStr[21] === 'R') f2lCount++;
        if (faceletStr[48] === 'B' && faceletStr[41] === 'L') f2lCount++;
        if (faceletStr[50] === 'B' && faceletStr[14] === 'R') f2lCount++;
      }

      // 4. Check Yellow Face Edges (D28, D30, D32, D34)
      let yellowEdges = 0;
      if (faceletStr[28] === 'D') yellowEdges++;
      if (faceletStr[30] === 'D') yellowEdges++;
      if (faceletStr[32] === 'D') yellowEdges++;
      if (faceletStr[34] === 'D') yellowEdges++;

      if (statCross) statCross.textContent = `${crossCount}/4`;
      if (statFirst) statFirst.textContent = `${cornersCount}/4`;
      if (statF2L) statF2L.textContent = `${f2lCount}/4`;
      if (statLL) statLL.textContent = yellowEdges === 4 ? 'Chữ Thập Vàng' : `${yellowEdges}/4 Cạnh Vàng`;

      let stageName = '';
      let progressPct = 15;
      let explanation = '';

      if (crossCount < 4) {
        this.currentStage = 'cross';
        stageName = 'Bước 1: Chữ Thập Trắng';
        progressPct = 10 + crossCount * 5;
        explanation = `Bạn đã đúng ${crossCount}/4 cạnh Chữ Thập Trắng. Mục tiêu: Tìm các cạnh trắng còn lại và đưa về mặt U khớp màu với các tâm kề.`;
      } else if (cornersCount < 4) {
        this.currentStage = 'first_layer';
        stageName = 'Bước 2: Tầng 1 (Góc Trắng)';
        progressPct = 30 + cornersCount * 5;
        explanation = `Đã xong Chữ Thập Trắng! Đang giải góc tầng 1 (${cornersCount}/4). Áp dụng Sexy Move (R U R' U') để lật viên góc trắng vào đúng vị trí.`;
      } else if (f2lCount < 4) {
        this.currentStage = 'f2l';
        stageName = 'Bước 3: Tầng 2 (F2L Cạnh Giữa)';
        progressPct = 50 + f2lCount * 5;
        explanation = `Tầng 1 đã hoàn thiện! Đang ghép 4 cạnh tầng 2 (${f2lCount}/4). Sử dụng công thức chèn cạnh phải hoặc chèn cạnh trái để đưa cạnh vào khe.`;
      } else if (yellowEdges < 4) {
        this.currentStage = 'oll_cross';
        stageName = 'Bước 4: Chữ Thập Vàng (OLL)';
        progressPct = 72;
        const pattern = yellowEdges === 0 ? 'Dấu chấm (Dot)' : (yellowEdges === 2 ? 'Chữ L ngược / Đường thẳng ngang' : 'Chữ thập');
        explanation = `Nhận diện dạng ${pattern} trên mặt vàng. Công thức thần thánh: F R U R' U' F' để tạo Chữ Thập Vàng!`;
      } else {
        this.currentStage = 'pll';
        stageName = 'Bước 5 & 6: Tầng Cuối (OLL & PLL)';
        progressPct = 88;
        explanation = `Chữ thập vàng đã xong! Áp dụng Sune (R U R' U R U2 R') để hoàn thành mặt vàng, sau đó dùng T-Perm hoặc U-Perm để hoán vị hoàn tất khối!`;
      }

      if (stageBadge) {
        stageBadge.textContent = stageName;
        stageBadge.className = 'stage-badge';
      }
      if (progressBar) progressBar.style.width = `${progressPct}%`;
      if (stageDesc) stageDesc.textContent = explanation;

      this.computeNextMoveHint(faceletStr);
    }

    async computeNextMoveHint(faceletStr) {
      const hintCode = document.getElementById('coach-hint-moves');
      const hintVn = document.getElementById('coach-hint-explanation');
      const hintTag = document.getElementById('coach-hint-stage');

      if (hintCode) hintCode.textContent = 'Đang tính toán...';

      try {
        const solution = await solveCube(faceletStr);
        if (solution && solution.success && solution.moves && solution.moves.length > 0) {
          const chunk = solution.moves.slice(0, Math.min(3, solution.moves.length));
          this.currentHintMoves = chunk;

          const notationStr = chunk.join(' ');
          if (hintCode) hintCode.textContent = notationStr;
          if (hintTag) hintTag.textContent = `Nước đi 1 - ${chunk.length} / ${solution.moves.length}`;

          const translation = this.translateMovesToVietnamese(chunk);
          if (hintVn) hintVn.textContent = translation;
        } else {
          this.currentHintMoves = [];
          if (hintCode) hintCode.textContent = 'None';
          if (hintVn) hintVn.textContent = 'Khối đã ở vị trí giải xong hoặc trạng thái sẵn sàng.';
        }
      } catch (err) {
        this.currentHintMoves = [];
        if (hintCode) hintCode.textContent = 'Lỗi tính toán';
        if (hintVn) hintVn.textContent = 'Hãy thử bấm "Quét Lại" hoặc kiểm tra lại khối.';
      }
    }

    translateMovesToVietnamese(moves) {
      const dict = {
        'U': 'Mặt Trên sang trái',
        "U'": 'Mặt Trên sang phải',
        'U2': 'Mặt Trên xoay 180°',
        'D': 'Mặt Dưới sang phải',
        "D'": 'Mặt Dưới sang trái',
        'D2': 'Mặt Dưới xoay 180°',
        'R': 'Mặt Phải lên',
        "R'": 'Mặt Phải xuống',
        'R2': 'Mặt Phải xoay 180°',
        'L': 'Mặt Trái xuống',
        "L'": 'Mặt Trái lên',
        'L2': 'Mặt Trái xoay 180°',
        'F': 'Mặt Trước xuôi chiều kim đồng hồ',
        "F'": 'Mặt Trước ngược chiều kim đồng hồ',
        'F2': 'Mặt Trước xoay 180°',
        'B': 'Mặt Sau xuôi chiều kim đồng hồ',
        "B'": 'Mặt Sau ngược chiều kim đồng hồ',
        'B2': 'Mặt Sau xoay 180°'
      };

      const steps = moves.map(m => dict[m] || m).join(', sau đó ');
      return `👉 Hướng dẫn: ${steps}.`;
    }

    updateHintDisplay(moves, explanation, tagText) {
      const hintCode = document.getElementById('coach-hint-moves');
      const hintVn = document.getElementById('coach-hint-explanation');
      const hintTag = document.getElementById('coach-hint-stage');
      if (hintCode) hintCode.textContent = moves.length > 0 ? moves.join(' ') : 'None';
      if (hintVn) hintVn.textContent = explanation;
      if (hintTag) hintTag.textContent = tagText;
      this.currentHintMoves = moves;
    }

    executeHintDemo() {
      if (this.currentHintMoves.length === 0) {
        this.addChatMessage('assistant', 'Hiện tại không có nước đi gợi ý nào để demo. Bạn hãy xáo khối để mình hướng dẫn nhé!');
        return;
      }
      const movesToRun = [...this.currentHintMoves];
      this.app.queueSequence(movesToRun, {
        duration: 220,
        onComplete: () => {
          this.analyze();
        }
      });
      this.addChatMessage('assistant', `⚡ Mình vừa xoay demo cho bạn chuỗi: <strong>${movesToRun.join(' ')}</strong> trên khối 3D! Bạn có thể bấm tiếp tục để giải từng bước.`);
    }

    handleQuickPrompt(promptKey) {
      if (promptKey === 'state') {
        this.addChatMessage('user', 'Soi tình trạng khối hiện tại của tôi với!');
        this.analyze();
        const stageDesc = document.getElementById('coach-stage-desc')?.textContent || '';
        this.addChatMessage('assistant', `🔍 <strong>Phân Tích Hiện Tại:</strong> ${stageDesc}<br><br>💡 Gợi ý nước đi tối ưu: <code>${this.currentHintMoves.join(' ') || 'None'}</code>. Bạn bấm nút <strong>"AI Xoay Demo Trên 3D"</strong> để xem trực tiếp nhé!`);
      } else if (promptKey === 'sexy') {
        this.addChatMessage('user', 'Sexy Move là gì và tại sao tuyển thủ hay dùng?');
        this.addChatMessage('assistant', `⚡ <strong>Sexy Move</strong> là tổ hợp 4 bước kinh điển nhất thế giới speedcubing:<br><br>
        <code>R U R' U'</code> (Phải lên, Trên sang trái, Phải xuống, Trên sang phải).<br><br>
        ✨ <em>Bí mật thú vị:</em> Nếu khối Rubik đang giải xong, bạn thực hiện Sexy Move đúng <strong>6 lần liên tiếp</strong>, khối sẽ tự động trở về trạng thái giải hoàn tất ban đầu!`);
      } else if (promptKey === 'oll') {
        this.addChatMessage('user', 'Tôi bị kẹt ở Chữ L / Mặt Vàng, giải thế nào?');
        this.addChatMessage('assistant', `🟡 <strong>Cách giải quyết Chữ Thập Vàng (OLL):</strong><br><br>
        1. <strong>Dấu chấm (Dot):</strong> Xoay <code>F R U R' U' F'</code> để tạo thành chữ L ngược.<br>
        2. <strong>Chữ L ngược:</strong> Để chữ L ở góc trên-trái (vị trí 9h và 12h), xoay <code>f R U R' U' f'</code> (f là xoay cả 2 lớp trước) để thành Chữ Thập Vàng ngay lập tức!<br>
        3. <strong>Đường ngang (Line):</strong> Để đường thẳng nằm ngang, xoay <code>F R U R' U' F'</code>.<br><br>
        👉 Bạn có thể xem tab <strong>Formulas</strong> để thử ngay trên 3D!`);
      } else if (promptKey === 'sub30') {
        this.addChatMessage('user', 'Làm sao để giải Rubik dưới 30 giây (Sub-30)?');
        this.addChatMessage('assistant', `🏎️ <strong>Chiến thuật đạt Sub-30 từ Feliks & J Perm:</strong><br><br>
        1. <strong>Look-ahead (Nhìn trước):</strong> Xoay chậm lại 20-30% nhưng không bao giờ dừng tay (No pause). Dùng mắt tìm cặp F2L tiếp theo trong lúc xoay cặp hiện tại.<br>
        2. <strong>Finger-tricks:</strong> Học cách búng ngón trỏ (U/U') và flick kép (U2) bằng ngón trỏ + ngón giữa.<br>
        3. <strong>Học 2-Look OLL & 2-Look PLL:</strong> Chỉ cần 9 công thức OLL và 6 công thức PLL là đủ để xuống Sub-25!<br>
        4. <strong>Luyện Cross dưới 8 bước:</strong> Tận dụng trọn vẹn 15s inspection.`);
      } else if (promptKey === 'tperm') {
        this.addChatMessage('user', 'T-Perm là gì và cách nhận biết?');
        this.addChatMessage('assistant', `🔄 <strong>T-Perm (PLL):</strong><br><br>
        <code>R U R' U' R' F R2 U' R' U' R U R' F'</code><br><br>
        👁️ <strong>Dấu hiệu nhận biết nhanh:</strong> Có 2 góc đối diện đã đúng màu (Headlights nằm bên trái) và 1 thanh khối 2 viên hoàn chỉnh ở mặt phải. Đây là công thức PLL được sử dụng nhiều nhất trong các giải đấu WCA!`);
      } else if (promptKey === 'lookahead') {
        this.addChatMessage('user', 'Kỹ thuật Look-ahead là gì?');
        this.addChatMessage('assistant', `👁️ <strong>Look-ahead (Nhìn trước):</strong><br><br>
        Khi ngón tay bạn đã quen thuộc một công thức (Muscle Memory), não và mắt bạn không cần nhìn vào viên đang xoay nữa. Thay vào đó, hãy dùng mắt quét tìm cặp F2L tiếp theo hoặc dự đoán góc OLL.<br><br>
        <em>Tuyển thủ số 1 thế giới Tymon Kolasiński từng nói:</em> "TPS 6 turns/giây mà không dừng lại bao giờ cũng đánh bại TPS 12 turns/giây mà khựng lại 1 giây!"`);
      }
    }

    sendUserMessage() {
      const input = document.getElementById('coach-user-input');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      this.addChatMessage('user', text);

      setTimeout(() => {
        const lower = text.toLowerCase();
        if (lower.includes('f2l') || lower.includes('tầng 2')) {
          this.addChatMessage('assistant', `🧩 <strong>Bí quyết F2L:</strong> F2L gồm 41 trường hợp, nhưng bạn không cần học thuộc vẹt thuật toán! Hãy nhớ nguyên tắc 3 bước: <em>1. Đưa viên góc và cạnh lên tầng 3 -> 2. Tách hoặc ghép chúng lại thành 1 cặp cùng hướng -> 3. Chèn vào khe đúng màu (slot)!</em>`);
        } else if (lower.includes('cross') || lower.includes('chữ thập')) {
          this.addChatMessage('assistant', `✝️ <strong>Chữ Thập Trắng (Cross):</strong> Hãy luôn giữ tâm trắng ở dưới đáy (hoặc trên đỉnh nếu bạn mới tập). Mục tiêu của mọi speedcuber chuyên nghiệp là giải xong Cross trong tối đa 8 bước xoay và dưới 2 giây!`);
        } else if (lower.includes('sune') || lower.includes('mặt vàng')) {
          this.addChatMessage('assistant', `🌟 <strong>Công thức Sune:</strong> <code>R U R' U R U2 R'</code>. Đây là thuật toán OLL phổ biến và dễ xoay nhất thế giới, dùng để định hướng các góc vàng lên trên!`);
        } else if (lower.includes('nhanh') || lower.includes('tốc độ') || lower.includes('tps')) {
          this.addChatMessage('assistant', `⚡ <strong>Tăng tốc độ xoay (TPS):</strong> Đừng xoay bằng toàn bộ bàn tay hay cổ tay. Hãy dùng đầu đốt ngón tay trỏ và ngón áp út. Hãy vào tab <strong>Tuyển Thủ</strong> để xem hướng dẫn finger-trick của Tymon nhé!`);
        } else if (lower.includes('kẹt') || lower.includes('giải hộ') || lower.includes('giúp')) {
          this.addChatMessage('assistant', `💪 Đừng lo lắng! Bấm ngay nút <strong>"AI Xoay Demo Trên 3D"</strong> ở trên để mình biểu diễn nước đi trực tiếp trên khối cho bạn xem nhé!`);
        } else {
          this.addChatMessage('assistant', `🤖 Mình đã hiểu! Hiện tại khối Rubik đang ở <strong>${document.getElementById('coach-stage-badge')?.textContent || 'bước giải'}</strong>. Bạn có thể bấm <strong>"AI Xoay Demo Trên 3D"</strong> để xem nước đi tiếp theo, hoặc chọn một trong các câu hỏi gợi ý ở trên nhé!`);
        }
      }, 400);
    }

    addChatMessage(role, htmlContent) {
      const chatContainer = document.getElementById('coach-chat-messages');
      if (!chatContainer) return;

      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-msg ${role === 'user' ? 'user-msg' : 'coach-msg'}`;
      const avatar = role === 'user' ? (this.app.userProfile.avatar || '⚡') : '🤖';

      msgDiv.innerHTML = `
        <div class="msg-avatar">${avatar}</div>
        <div class="msg-bubble">
          <p>${htmlContent}</p>
        </div>
      `;

      chatContainer.appendChild(msgDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Expose to global scope
  global.RubikApp = RubikApp;
  global.RealCubeScanner = RealCubeScanner;
  global.SpeedcubingTimer = SpeedcubingTimer;
  global.FormulaCheatSheet = FormulaCheatSheet;
  global.MasterclassManager = MasterclassManager;
  global.RubikAICoach = RubikAICoach;
  global.AudioFeedback = AudioFeedback;
  global.ICONIC_CUBES = ICONIC_CUBES;
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
