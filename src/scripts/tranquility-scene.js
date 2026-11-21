/**
 * tranquility-scene.js
 * Scene 02 — "Sakura Train Tranquility" cinematic animation engine.
 *
 * Layers rendered on a single canvas (z-stacked via draw order):
 *   1. River shimmer  — soft golden glint ripples across the water surface
 *   2. Sun god rays   — slow radial light beams from top-right (where sun sits in image)
 *   3. Morning mist   — large, slow drifting fog wisps rising from the valley
 *   4. Sakura petals  — pink cherry blossom petals falling & swirling with wind
 *   5. Train steam    — puffs of white smoke emitted from the bridge area
 *
 * Performance: IntersectionObserver pauses RAF when off-screen.
 *              Pre-rendered offscreen sprites eliminate per-frame gradient alloc.
 *              Mobile caps particle counts and runs at 30 fps.
 */

// ─── Shared helpers ────────────────────────────────────────────────────────

function observeVisibility(canvas, onVisible, onHidden) {
  let docVisible = document.visibilityState === 'visible';
  let intersecting = false;
  const sync = () => (docVisible && intersecting ? onVisible() : onHidden());
  document.addEventListener('visibilitychange', () => {
    docVisible = document.visibilityState === 'visible';
    sync();
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([e]) => { intersecting = e.isIntersecting; sync(); },
      { rootMargin: '100px 0px 100px 0px', threshold: 0.01 }
    );
    io.observe(canvas);
    return () => io.disconnect();
  }
  intersecting = true;
  sync();
  return () => {};
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ─── Pre-rendered sprite factories ─────────────────────────────────────────

function makePetalSprite() {
  const c = document.createElement('canvas');
  c.width = 52; c.height = 68;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.translate(26, 8);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-15, -9, -20, 26, 0, 48);
  ctx.bezierCurveTo(20, 26, 15, -9, 0, 0);
  const g = ctx.createLinearGradient(0, -9, 0, 48);
  g.addColorStop(0,   'rgba(255,235,242,0.97)');
  g.addColorStop(0.5, 'rgba(255,215,228,0.93)');
  g.addColorStop(1,   'rgba(246,172,196,0.86)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 4); ctx.lineTo(0, 36);
  ctx.stroke();
  return c;
}

function makeMistSprite(r = 90) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0,    'rgba(240,245,255,0.90)');
  g.addColorStop(0.4,  'rgba(220,235,255,0.40)');
  g.addColorStop(1,    'rgba(200,220,255,0.00)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function makeSmokeSprite(r = 44) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0,   'rgba(255,255,255,0.80)');
  g.addColorStop(0.5, 'rgba(240,240,245,0.35)');
  g.addColorStop(1,   'rgba(230,230,240,0.00)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function makeGlintSprite(r = 18) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0,   'rgba(255,240,180,1.0)');
  g.addColorStop(0.4, 'rgba(255,225,130,0.5)');
  g.addColorStop(1,   'rgba(255,210,100,0.00)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

// ─── Main export ────────────────────────────────────────────────────────────

/**
 * mountTranquilityScene(canvas)
 * Attaches all living animation layers to the given canvas element.
 * Returns a cleanup function.
 */
export function mountTranquilityScene(canvas) {
  if (!canvas || typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  const isMobile = window.innerWidth < 768;

  // Build sprites once
  const petalSprite = makePetalSprite();
  const mistSprite  = makeMistSprite(isMobile ? 60 : 90);
  const smokeSprite = makeSmokeSprite(isMobile ? 28 : 44);
  const glintSprite = makeGlintSprite(isMobile ? 12 : 18);

  let disposed  = false;
  let isRunning = false;
  let raf       = 0;

  let W = (canvas.width  = canvas.clientWidth  || window.innerWidth);
  let H = (canvas.height = canvas.clientHeight || window.innerHeight);
  const ro = new ResizeObserver(() => {
    if (disposed) return;
    W = canvas.width  = canvas.clientWidth  || window.innerWidth;
    H = canvas.height = canvas.clientHeight || window.innerHeight;
  });
  ro.observe(canvas);

  // Mouse wind (fine pointer only)
  const isFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wind = { vx: 0, lastX: W / 2 };
  const onMove = (e) => {
    wind.vx = (e.clientX - wind.lastX) * 0.07;
    wind.lastX = e.clientX;
  };
  if (isFine) window.addEventListener('pointermove', onMove, { passive: true });

  // ── Train emitter position (bridge area, right-center of image) ──────────
  // Approximate: bridge is roughly at 60% x, 55% y of the image.
  // We'll express as fractions so they scale with canvas size.
  const TRAIN_X_FRAC = 0.615;
  const TRAIN_Y_FRAC = 0.52;

  // ── Sun position (top-right, ~80% x, 20% y) ──────────────────────────────
  const SUN_X_FRAC = 0.80;
  const SUN_Y_FRAC = 0.18;

  // ── River band (lower-center, ~30-70% x, 60-80% y) ───────────────────────
  // Glints scatter within this band.
  const RIVER_X_MIN = 0.28;
  const RIVER_X_MAX = 0.68;
  const RIVER_Y_MIN = 0.60;
  const RIVER_Y_MAX = 0.82;

  // ═══════════════════════════════════════════════════════
  // 1. SAKURA PETALS
  // ═══════════════════════════════════════════════════════
  const PETAL_COUNT = isMobile ? 12 : 40;

  class Petal {
    constructor() { this.spawn(true); }
    spawn(initial = false) {
      this.x  = Math.random() * (W + 160) - 80;
      this.y  = initial ? Math.random() * H : -24 - Math.random() * 40;
      this.sz = Math.random() * 9 + 8;        // 8–17 px
      this.vy = Math.random() * 1.1 + 0.65;
      this.vx = Math.random() * 0.9 + 0.35;
      this.rot    = Math.random() * Math.PI * 2;
      this.rotV   = (Math.random() - 0.5) * 0.028;
      this.flip   = Math.random() * Math.PI;
      this.flipV  = Math.random() * 0.025 + 0.013;
      this.swayA  = Math.random() * Math.PI * 2;
      this.swayS  = Math.random() * 0.02 + 0.008;
      this.alpha  = Math.random() * 0.3 + 0.7;
    }
    update() {
      this.swayA  += this.swayS;
      this.flip   += this.flipV;
      this.rot    += this.rotV;
      const wx     = wind.vx * 0.055;
      this.y      += this.vy;
      this.x      += Math.sin(this.swayA) * this.vx + 0.45 + wx;
      if (this.y > H + 32 || this.x > W + 110 || this.x < -110) this.spawn();
    }
    draw() {
      if (!petalSprite) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.scale(Math.cos(this.flip), 1);
      ctx.globalAlpha = this.alpha;
      const pw = this.sz, ph = this.sz * 1.3;
      ctx.drawImage(petalSprite, -pw / 2, 0, pw, ph);
      ctx.restore();
    }
  }
  const petals = Array.from({ length: PETAL_COUNT }, () => new Petal());

  // ═══════════════════════════════════════════════════════
  // 2. MORNING MIST
  // ═══════════════════════════════════════════════════════
  const MIST_COUNT = isMobile ? 4 : 12;

  class MistPuff {
    constructor() { this.spawn(true); }
    spawn(initial = false) {
      // Mist rises from the valley / river area and drifts up-left
      this.x      = lerp(RIVER_X_MIN, RIVER_X_MAX, Math.random()) * W;
      this.y      = initial
        ? lerp(RIVER_Y_MIN, 1.0, Math.random()) * H
        : H + Math.random() * 60;
      this.r      = Math.random() * 50 + 40;
      this.vy     = -(Math.random() * 0.4 + 0.2);
      this.vx     = (Math.random() - 0.6) * 0.25; // slight left drift (like breeze)
      this.life   = 0;
      this.maxLife = Math.random() * 180 + 120;
      this.maxAlpha = Math.random() * 0.11 + 0.04;
      this.alpha  = 0;
    }
    update() {
      this.life++;
      this.x += this.vx;
      this.y += this.vy;
      const p = this.life / this.maxLife;
      this.alpha = Math.sin(p * Math.PI) * this.maxAlpha;
      if (this.life >= this.maxLife) this.spawn();
    }
    draw() {
      if (!mistSprite || this.alpha < 0.004) return;
      ctx.globalAlpha = this.alpha;
      ctx.drawImage(mistSprite, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    }
  }
  const mist = Array.from({ length: MIST_COUNT }, () => new MistPuff());

  // ═══════════════════════════════════════════════════════
  // 3. TRAIN STEAM / SMOKE PUFFS
  // ═══════════════════════════════════════════════════════
  const SMOKE_COUNT = isMobile ? 5 : 14;

  class SmokePuff {
    constructor() { this.spawn(true); }
    spawn(initial = false) {
      const tx  = TRAIN_X_FRAC * W;
      const ty  = TRAIN_Y_FRAC * H;
      this.x    = tx + (Math.random() - 0.5) * 32;
      this.y    = initial
        ? ty - Math.random() * H * 0.3
        : ty + (Math.random() - 0.5) * 10;
      this.r    = Math.random() * 16 + 10;
      // Steam rises up and drifts right (train moves right)
      this.vy   = -(Math.random() * 0.9 + 0.5);
      this.vx   = Math.random() * 0.5 + 0.15;
      this.rotV = (Math.random() - 0.5) * 0.02;
      this.rot  = 0;
      this.life = initial ? Math.random() * 90 : 0;
      this.maxLife = Math.random() * 100 + 70;
      this.maxAlpha = Math.random() * 0.55 + 0.25;
      this.alpha = 0;
    }
    update() {
      this.life++;
      this.r  += 0.2;   // puffs expand as they rise
      this.vx *= 0.998; // very slight deceleration
      this.x  += this.vx;
      this.y  += this.vy;
      this.rot+= this.rotV;
      const p = this.life / this.maxLife;
      this.alpha = Math.sin(p * Math.PI) * this.maxAlpha;
      if (this.life >= this.maxLife) this.spawn();
    }
    draw() {
      if (!smokeSprite || this.alpha < 0.01) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.drawImage(smokeSprite, -this.r, -this.r, this.r * 2, this.r * 2);
      ctx.restore();
    }
  }
  const smoke = Array.from({ length: SMOKE_COUNT }, () => new SmokePuff());

  // ═══════════════════════════════════════════════════════
  // 4. RIVER SHIMMER / WATER GLINTS
  // ═══════════════════════════════════════════════════════
  const GLINT_COUNT = isMobile ? 6 : 20;

  class WaterGlint {
    constructor() { this.spawn(true); }
    spawn(initial = false) {
      this.x     = lerp(RIVER_X_MIN, RIVER_X_MAX, Math.random()) * W;
      this.y     = lerp(RIVER_Y_MIN, RIVER_Y_MAX, Math.random()) * H;
      this.r     = Math.random() * 8 + 6;
      this.phase = initial ? Math.random() * Math.PI * 2 : 0;
      this.speed = Math.random() * 1.8 + 1.2;
      this.alpha = 0;
      this.baseAlpha = Math.random() * 0.5 + 0.3;
      // Drift slightly with current
      this.vx = Math.random() * 0.08 - 0.02;
      this.vy = Math.random() * 0.06;
    }
    update(t) {
      this.phase += 0.04 * this.speed;
      this.x    += this.vx;
      this.y    += this.vy;
      this.alpha = Math.pow(Math.max(0, Math.sin(this.phase)), 2) * this.baseAlpha;

      // If drifted out of river band, respawn
      if (this.x < RIVER_X_MIN * W - 40 || this.x > RIVER_X_MAX * W + 40 ||
          this.y < RIVER_Y_MIN * H - 20 || this.y > RIVER_Y_MAX * H + 20) {
        this.spawn();
      }
    }
    draw() {
      if (!glintSprite || this.alpha < 0.015) return;
      ctx.globalAlpha = this.alpha;
      ctx.drawImage(glintSprite, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    }
  }
  const glints = Array.from({ length: GLINT_COUNT }, () => new WaterGlint());

  // ═══════════════════════════════════════════════════════
  // 5. SUN GOD-RAYS (CSS canvas overlay)
  // ═══════════════════════════════════════════════════════
  // Rendered as slow-rotating radial beams from the sun position.

  const RAY_COUNT    = isMobile ? 4 : 7;
  const RAY_BASE_ANGLE = Math.PI * 0.75; // rays fan downward-left from top-right sun

  class SunRay {
    constructor(index) {
      this.index   = index;
      this.spread  = (Math.random() * 0.3 + 0.1); // extra spread per ray
      this.waveOff = Math.random() * Math.PI * 2; // phase offset for pulsing
      this.width   = Math.random() * 0.025 + 0.01; // angular width fraction
      this.alpha   = Math.random() * 0.06 + 0.03;
    }
    draw(t) {
      const sx = SUN_X_FRAC * W;
      const sy = SUN_Y_FRAC * H;

      // Each ray fans out from sun across the scene diagonally
      const baseA   = RAY_BASE_ANGLE + (this.index / RAY_COUNT) * Math.PI * 0.75;
      const angle   = baseA + Math.sin(t * 0.3 + this.waveOff) * 0.04;
      const halfW   = Math.PI * this.width;
      const length  = Math.hypot(W, H) * 1.1;

      const ax = sx + Math.cos(angle - halfW) * length;
      const ay = sy + Math.sin(angle - halfW) * length;
      const bx = sx + Math.cos(angle + halfW) * length;
      const by = sy + Math.sin(angle + halfW) * length;

      const pulse = (Math.sin(t * 0.5 + this.waveOff) * 0.3 + 0.7);
      const g = ctx.createLinearGradient(sx, sy, (ax + bx) / 2, (ay + by) / 2);
      g.addColorStop(0,   `rgba(255,230,160,${this.alpha * pulse})`);
      g.addColorStop(0.4, `rgba(255,215,120,${this.alpha * pulse * 0.5})`);
      g.addColorStop(1,   'rgba(255,200,80,0)');

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }
  }
  const rays = Array.from({ length: RAY_COUNT }, (_, i) => new SunRay(i));

  // ═══════════════════════════════════════════════════════
  // ANIMATION LOOP
  // ═══════════════════════════════════════════════════════
  const FPS_TARGET   = isMobile ? 30 : 60;
  const FRAME_MS     = 1000 / FPS_TARGET;
  let lastFrame      = 0;
  let t              = 0;

  const animate = (timestamp = 0) => {
    if (disposed || !isRunning) return;
    if (timestamp - lastFrame < FRAME_MS) {
      raf = requestAnimationFrame(animate);
      return;
    }
    lastFrame = timestamp;
    t += 0.016;

    ctx.clearRect(0, 0, W, H);

    // Draw order: rays (screen blend) → mist → glints → smoke → petals
    // Sun rays first (screen composite, doesn't affect subsequent draws)
    for (const ray of rays) ray.draw(t);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Mist
    for (const m of mist)   { m.update(); m.draw(); }
    ctx.globalAlpha = 1;

    // River glints
    for (const g of glints) { g.update(t); g.draw(); }
    ctx.globalAlpha = 1;

    // Train smoke
    for (const s of smoke)  { s.update(); s.draw(); }
    ctx.globalAlpha = 1;

    // Sakura petals (top layer)
    wind.vx *= 0.93;
    for (const p of petals) { p.update(); p.draw(); }
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(animate);
  };

  const start = () => {
    if (isRunning) return;
    isRunning = true;
    raf = requestAnimationFrame(animate);
  };
  const pause = () => {
    isRunning = false;
    cancelAnimationFrame(raf);
  };

  const cleanupIO = observeVisibility(canvas, start, pause);

  return () => {
    if (disposed) return;
    disposed = true;
    pause();
    cleanupIO();
    ro.disconnect();
    if (isFine) window.removeEventListener('pointermove', onMove);
  };
}
