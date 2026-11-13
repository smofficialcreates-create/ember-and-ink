/**
 * anime-particles.js
 * Ultra-smooth, high-performance 2.5D environmental particle engine.
 * Generates Makoto Shinkai / Studio Ghibli style falling cherry petals,
 * waterfall mist, and nocturnal fireflies.
 *
 * Performance optimizations for mobile & desktop:
 * 1. IntersectionObserver pauses RAF loops completely when off-screen (0% CPU/GPU).
 * 2. Pre-rendered offscreen canvas sprites replace per-frame createRadialGradient /
 *    createLinearGradient allocations (zero GC churn, hardware blitted).
 * 3. Mobile particle count scaling & fine-pointer gating.
 */

// Helper: Pause RAF loop when canvas is not visible in viewport
function observeCanvasVisibility(canvas, onVisible, onHidden) {
  let isDocVisible = document.visibilityState === 'visible';
  let isIntersecting = false;

  const updateState = () => {
    if (isDocVisible && isIntersecting) {
      onVisible();
    } else {
      onHidden();
    }
  };

  const onDocVisibilityChange = () => {
    isDocVisible = document.visibilityState === 'visible';
    updateState();
  };
  document.addEventListener('visibilitychange', onDocVisibilityChange);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isIntersecting = entry.isIntersecting;
          updateState();
        }
      },
      { rootMargin: '80px 0px 80px 0px', threshold: 0.01 }
    );
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onDocVisibilityChange);
    };
  }

  // Fallback if IntersectionObserver is not available
  isIntersecting = true;
  updateState();
  return () => {
    document.removeEventListener('visibilitychange', onDocVisibilityChange);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAKURA CHERRY BLOSSOM PETALS
// ─────────────────────────────────────────────────────────────────────────────

// Pre-render soft anime sakura petal sprite to offscreen canvas
function createPetalSprite() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  const w = 48;
  const h = 64;
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.translate(w / 2, 8);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-14, -8, -18, 24, 0, 44);
  ctx.bezierCurveTo(18, 24, 14, -8, 0, 0);

  const grad = ctx.createLinearGradient(0, -8, 0, 44);
  grad.addColorStop(0, 'rgba(255, 230, 238, 0.95)');
  grad.addColorStop(0.5, 'rgba(255, 215, 228, 0.92)');
  grad.addColorStop(1, 'rgba(246, 178, 196, 0.85)');

  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle petal inner vein
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, 32);
  ctx.stroke();

  return c;
}

let cachedPetalSprite = null;

export function mountSakuraPetals(canvas, options = {}) {
  if (!canvas || typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  if (!cachedPetalSprite) {
    cachedPetalSprite = createPetalSprite();
  }

  const isMobile = window.innerWidth < 768;
  const count = options.count || (isMobile ? 14 : 38);

  let animationFrame = 0;
  let disposed = false;
  let isRunning = false;

  let width = (canvas.width = canvas.clientWidth || window.innerWidth);
  let height = (canvas.height = canvas.clientHeight || window.innerHeight);

  const resize = () => {
    if (disposed) return;
    width = canvas.width = canvas.clientWidth || window.innerWidth;
    height = canvas.height = canvas.clientHeight || window.innerHeight;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Mouse wind interaction (only on fine pointer devices)
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mouse = { speedX: 0, lastX: width / 2 };

  const onPointerMove = (e) => {
    const curX = e.clientX;
    mouse.speedX = (curX - mouse.lastX) * 0.08;
    mouse.lastX = curX;
  };

  if (isFinePointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  class Petal {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * (width + 160) - 80;
      this.y = initial ? Math.random() * height : -20 - Math.random() * 40;
      this.size = Math.random() * 8 + 8; // 8px to 16px
      this.speedY = Math.random() * 1.1 + 0.7;
      this.speedX = Math.random() * 0.9 + 0.4;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.025;
      this.flip = Math.random() * Math.PI;
      this.flipSpeed = Math.random() * 0.025 + 0.015;
      this.swayAngle = Math.random() * Math.PI * 2;
      this.swaySpeed = Math.random() * 0.018 + 0.008;
      this.opacity = Math.random() * 0.35 + 0.65;
    }

    update() {
      this.swayAngle += this.swaySpeed;
      this.flip += this.flipSpeed;
      this.rotation += this.rotSpeed;

      const wind = mouse.speedX * 0.05;
      this.y += this.speedY;
      this.x += Math.sin(this.swayAngle) * this.speedX + 0.5 + wind;

      if (this.y > height + 30 || this.x > width + 100 || this.x < -100) {
        this.reset();
      }
    }

    draw() {
      if (!cachedPetalSprite) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(Math.cos(this.flip), 1);
      ctx.globalAlpha = this.opacity;
      const w = this.size;
      const h = this.size * 1.33;
      ctx.drawImage(cachedPetalSprite, -w / 2, 0, w, h);
      ctx.restore();
    }
  }

  const petals = Array.from({ length: count }, () => new Petal());

  const animate = () => {
    if (disposed || !isRunning) return;

    ctx.clearRect(0, 0, width, height);
    mouse.speedX *= 0.94; // damp wind

    for (let i = 0; i < petals.length; i++) {
      petals[i].update();
      petals[i].draw();
    }

    animationFrame = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (isRunning) return;
    isRunning = true;
    animationFrame = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    isRunning = false;
    cancelAnimationFrame(animationFrame);
  };

  const cleanupObserver = observeCanvasVisibility(canvas, startAnimation, pauseAnimation);

  return () => {
    if (disposed) return;
    disposed = true;
    pauseAnimation();
    cleanupObserver();
    ro.disconnect();
    if (isFinePointer) {
      window.removeEventListener('pointermove', onPointerMove);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VOLUMETRIC WATERFALL MIST & LIGHT MOTES
// ─────────────────────────────────────────────────────────────────────────────

// Pre-rendered offscreen mist sprite
function createMistSprite(radius = 64) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = radius * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, 'rgba(225, 242, 255, 1)');
  grad.addColorStop(0.45, 'rgba(200, 230, 252, 0.45)');
  grad.addColorStop(1, 'rgba(180, 215, 245, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

let cachedMistSprite = null;

export function mountWaterfallMist(canvas) {
  if (!canvas || typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  if (!cachedMistSprite) {
    cachedMistSprite = createMistSprite(64);
  }

  const isMobile = window.innerWidth < 768;
  const mistCount = isMobile ? 6 : 14;
  const moteCount = isMobile ? 8 : 22;

  let animationFrame = 0;
  let disposed = false;
  let isRunning = false;

  let width = (canvas.width = canvas.clientWidth || window.innerWidth);
  let height = (canvas.height = canvas.clientHeight || window.innerHeight);

  const resize = () => {
    if (disposed) return;
    width = canvas.width = canvas.clientWidth || window.innerWidth;
    height = canvas.height = canvas.clientHeight || window.innerHeight;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  class MistParticle {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + Math.random() * 30;
      this.radius = Math.random() * 40 + 30;
      this.speedY = -(Math.random() * 0.5 + 0.25);
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = 0;
      this.maxOpacity = Math.random() * 0.12 + 0.05;
      this.life = 0;
      this.maxLife = Math.random() * 160 + 100;
    }
    update() {
      this.life++;
      this.x += this.speedX;
      this.y += this.speedY;
      const progress = this.life / this.maxLife;
      this.opacity = Math.sin(progress * Math.PI) * this.maxOpacity;
      if (this.life >= this.maxLife) this.reset();
    }
    draw() {
      if (!cachedMistSprite || this.opacity <= 0.005) return;
      ctx.globalAlpha = this.opacity;
      const diam = this.radius * 2;
      ctx.drawImage(cachedMistSprite, this.x - this.radius, this.y - this.radius, diam, diam);
    }
  }

  class SprayMote {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.r = Math.random() * 1.8 + 0.8;
      this.speedY = Math.random() * 0.4 - 0.2;
      this.speedX = Math.random() * 0.3 - 0.15;
      this.alpha = Math.random() * 0.55 + 0.25;
      this.phase = Math.random() * Math.PI * 2;
      this.opacity = 0;
    }
    update(t) {
      this.x += this.speedX;
      this.y += this.speedY;
      this.opacity = (Math.sin(t * 1.8 + this.phase) * 0.3 + 0.4) * this.alpha;
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
        this.reset();
      }
    }
    draw() {
      if (this.opacity <= 0.01) return;
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const mist = Array.from({ length: mistCount }, () => new MistParticle());
  const motes = Array.from({ length: moteCount }, () => new SprayMote());

  let t = 0;
  const animate = () => {
    if (disposed || !isRunning) return;

    ctx.clearRect(0, 0, width, height);
    t += 0.018;

    for (let i = 0; i < mist.length; i++) {
      mist[i].update();
      mist[i].draw();
    }
    for (let i = 0; i < motes.length; i++) {
      motes[i].update(t);
      motes[i].draw();
    }
    ctx.globalAlpha = 1;

    animationFrame = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (isRunning) return;
    isRunning = true;
    animationFrame = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    isRunning = false;
    cancelAnimationFrame(animationFrame);
  };

  const cleanupObserver = observeCanvasVisibility(canvas, startAnimation, pauseAnimation);

  return () => {
    if (disposed) return;
    disposed = true;
    pauseAnimation();
    cleanupObserver();
    ro.disconnect();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NOCTURNAL FIREFLIES & AMBIENT GLOW
// ─────────────────────────────────────────────────────────────────────────────

// Pre-render glow sprite for fireflies
function createFireflySprite(isGreen = true) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  const size = 64;
  const r = size / 2;
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  if (isGreen) {
    grad.addColorStop(0, 'rgba(215, 255, 140, 1)');
    grad.addColorStop(0.35, 'rgba(175, 245, 105, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    grad.addColorStop(0, 'rgba(255, 230, 130, 1)');
    grad.addColorStop(0.35, 'rgba(245, 210, 100, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  // Brilliant core speck
  ctx.fillStyle = 'rgba(255, 255, 250, 0.95)';
  ctx.beginPath();
  ctx.arc(r, r, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

let cachedFireflyGreen = null;
let cachedFireflyAmber = null;

export function mountFireflies(canvas) {
  if (!canvas || typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  if (!cachedFireflyGreen) cachedFireflyGreen = createFireflySprite(true);
  if (!cachedFireflyAmber) cachedFireflyAmber = createFireflySprite(false);

  const isMobile = window.innerWidth < 768;
  const count = isMobile ? 10 : 24;

  let animationFrame = 0;
  let disposed = false;
  let isRunning = false;

  let width = (canvas.width = canvas.clientWidth || window.innerWidth);
  let height = (canvas.height = canvas.clientHeight || window.innerHeight);

  const resize = () => {
    if (disposed) return;
    width = canvas.width = canvas.clientWidth || window.innerWidth;
    height = canvas.height = canvas.clientHeight || window.innerHeight;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  class Firefly {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * (height * 0.75) + height * 0.15;
      this.originX = this.x;
      this.originY = this.y;
      this.glowRadius = Math.random() * 12 + 16; // 16px to 28px
      this.speedX = Math.random() * 0.45 + 0.18;
      this.speedY = Math.random() * 0.28 + 0.12;
      this.phase = Math.random() * Math.PI * 2;
      this.isGreen = Math.random() > 0.35;
      this.pulse = 0;
    }
    update(t) {
      this.x = this.originX + Math.sin(t * this.speedX + this.phase) * 45;
      this.y = this.originY + Math.cos(t * this.speedY + this.phase) * 25;
      this.pulse = Math.max(0, Math.sin(t * 2.8 + this.phase));
    }
    draw() {
      const alpha = this.pulse * 0.88;
      if (alpha <= 0.02) return;

      const sprite = this.isGreen ? cachedFireflyGreen : cachedFireflyAmber;
      if (!sprite) return;

      ctx.globalAlpha = alpha;
      const diam = this.glowRadius * 2;
      ctx.drawImage(sprite, this.x - this.glowRadius, this.y - this.glowRadius, diam, diam);
    }
  }

  const fireflies = Array.from({ length: count }, () => new Firefly());

  let t = 0;
  const animate = () => {
    if (disposed || !isRunning) return;

    ctx.clearRect(0, 0, width, height);
    t += 0.018;

    for (let i = 0; i < fireflies.length; i++) {
      fireflies[i].update(t);
      fireflies[i].draw();
    }
    ctx.globalAlpha = 1;

    animationFrame = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (isRunning) return;
    isRunning = true;
    animationFrame = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    isRunning = false;
    cancelAnimationFrame(animationFrame);
  };

  const cleanupObserver = observeCanvasVisibility(canvas, startAnimation, pauseAnimation);

  return () => {
    if (disposed) return;
    disposed = true;
    pauseAnimation();
    cleanupObserver();
    ro.disconnect();
  };
}
