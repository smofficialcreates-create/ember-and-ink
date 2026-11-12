/**
 * anime-particles.js
 * Ultra-smooth, cinematic 2.5D environmental particle engine.
 * Generates Makoto Shinkai / Studio Ghibli style falling cherry petals,
 * volumetric sunbeams, waterfall mist, and nocturnal fireflies.
 */

export function mountSakuraPetals(canvas, options = {}) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const count = options.count || (mobile ? 28 : 55);
  let animationFrame = 0;
  let disposed = false;
  let visible = true;

  let width = (canvas.width = canvas.clientWidth || window.innerWidth);
  let height = (canvas.height = canvas.clientHeight || window.innerHeight);

  const resize = () => {
    if (disposed) return;
    width = canvas.width = canvas.clientWidth || window.innerWidth;
    height = canvas.height = canvas.clientHeight || window.innerHeight;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Mouse wind interaction
  const mouse = { x: width / 2, y: height / 2, speedX: 0, lastX: width / 2 };
  const onPointerMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    mouse.speedX = (curX - mouse.lastX) * 0.12;
    mouse.lastX = curX;
    mouse.x = curX;
    mouse.y = e.clientY - rect.top;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Petals
  class Petal {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * (width + 200) - 100;
      this.y = initial ? Math.random() * height : -20 - Math.random() * 50;
      this.size = Math.random() * 8 + 6;
      this.speedY = Math.random() * 1.2 + 0.8;
      this.speedX = Math.random() * 1.0 + 0.5;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;
      this.flip = Math.random() * Math.PI;
      this.flipSpeed = Math.random() * 0.03 + 0.015;
      this.swayAngle = Math.random() * Math.PI * 2;
      this.swaySpeed = Math.random() * 0.02 + 0.01;
      this.opacity = Math.random() * 0.35 + 0.65;
      // Soft blush / ivory anime palette
      this.color = Math.random() > 0.4 ? 'rgba(255, 218, 226,' : 'rgba(255, 238, 242,';
    }

    update() {
      this.swayAngle += this.swaySpeed;
      this.flip += this.flipSpeed;
      this.rotation += this.rotSpeed;

      const wind = mouse.speedX * 0.08;
      this.y += this.speedY;
      this.x += Math.sin(this.swayAngle) * this.speedX + 0.6 + wind;

      if (this.y > height + 30 || this.x > width + 120 || this.x < -120) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(Math.cos(this.flip), 1);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-this.size * 0.5, -this.size * 0.4, -this.size * 0.7, this.size * 0.6, 0, this.size);
      ctx.bezierCurveTo(this.size * 0.7, this.size * 0.6, this.size * 0.5, -this.size * 0.4, 0, 0);

      const grad = ctx.createLinearGradient(0, -this.size * 0.4, 0, this.size);
      grad.addColorStop(0, this.color + (this.opacity * 0.6) + ')');
      grad.addColorStop(0.6, this.color + this.opacity + ')');
      grad.addColorStop(1, 'rgba(248, 185, 200, ' + (this.opacity * 0.8) + ')');

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  const petals = Array.from({ length: count }, () => new Petal());

  const animate = () => {
    if (disposed) return;
    animationFrame = requestAnimationFrame(animate);
    if (!visible) return;

    ctx.clearRect(0, 0, width, height);

    mouse.speedX *= 0.95; // damp wind

    for (const p of petals) {
      p.update();
      p.draw();
    }
  };
  animate();

  const onVis = () => {
    visible = document.visibilityState === 'visible';
  };
  document.addEventListener('visibilitychange', onVis);

  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    ro.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVis);
  };
}

/**
 * Volumetric Waterfall Mist & Glowing Particles
 */
export function mountWaterfallMist(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let animationFrame = 0;
  let disposed = false;
  let visible = true;

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
      this.y = initial ? Math.random() * height : height + Math.random() * 40;
      this.r = Math.random() * 45 + 25;
      this.speedY = -(Math.random() * 0.6 + 0.3);
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.opacity = 0;
      this.maxOpacity = Math.random() * 0.12 + 0.05;
      this.life = 0;
      this.maxLife = Math.random() * 180 + 120;
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
      ctx.save();
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      g.addColorStop(0, `rgba(220, 240, 255, ${this.opacity})`);
      g.addColorStop(0.6, `rgba(200, 225, 250, ${this.opacity * 0.4})`);
      g.addColorStop(1, 'rgba(180, 215, 245, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Also gentle floating light specks / water spray
  class SprayMote {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : Math.random() * height;
      this.r = Math.random() * 2 + 1;
      this.speedY = Math.random() * 0.5 - 0.25;
      this.speedX = Math.random() * 0.4 - 0.2;
      this.alpha = Math.random() * 0.6 + 0.2;
      this.phase = Math.random() * Math.PI * 2;
    }
    update(t) {
      this.x += this.speedX;
      this.y += this.speedY;
      this.opacity = (Math.sin(t * 2 + this.phase) * 0.3 + 0.4) * this.alpha;
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
        this.reset();
      }
    }
    draw() {
      ctx.save();
      ctx.fillStyle = `rgba(240, 250, 255, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const mist = Array.from({ length: 18 }, () => new MistParticle());
  const motes = Array.from({ length: 30 }, () => new SprayMote());

  let t = 0;
  const animate = () => {
    if (disposed) return;
    animationFrame = requestAnimationFrame(animate);
    if (!visible) return;

    ctx.clearRect(0, 0, width, height);
    t += 0.02;

    for (const m of mist) {
      m.update();
      m.draw();
    }
    for (const s of motes) {
      s.update(t);
      s.draw();
    }
  };
  animate();

  const onVis = () => {
    visible = document.visibilityState === 'visible';
  };
  document.addEventListener('visibilitychange', onVis);

  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}

/**
 * Nocturnal Fireflies and Twinkling Starlight
 */
export function mountFireflies(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let animationFrame = 0;
  let disposed = false;
  let visible = true;

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
      this.y = Math.random() * (height * 0.7) + height * 0.25;
      this.originX = this.x;
      this.originY = this.y;
      this.r = Math.random() * 2.2 + 1.2;
      this.glowRadius = this.r * 7;
      this.speedX = Math.random() * 0.5 + 0.2;
      this.speedY = Math.random() * 0.3 + 0.15;
      this.phase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.03 + 0.015;
      this.color = Math.random() > 0.3 ? '#d4ff88' : '#ffe57f';
    }
    update(t) {
      this.x = this.originX + Math.sin(t * this.speedX + this.phase) * 60;
      this.y = this.originY + Math.cos(t * this.speedY + this.phase) * 35;
      this.pulse = Math.max(0, Math.sin(t * 3 + this.phase));
    }
    draw() {
      const alpha = this.pulse * 0.85;
      if (alpha <= 0.02) return;

      ctx.save();
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.glowRadius);
      g.addColorStop(0, this.color === '#d4ff88' ? `rgba(212, 255, 136, ${alpha})` : `rgba(255, 229, 127, ${alpha})`);
      g.addColorStop(0.3, this.color === '#d4ff88' ? `rgba(180, 245, 110, ${alpha * 0.4})` : `rgba(240, 210, 100, ${alpha * 0.4})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Bright center core
      ctx.fillStyle = `rgba(255, 255, 245, ${alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  const fireflies = Array.from({ length: 28 }, () => new Firefly());

  let t = 0;
  const animate = () => {
    if (disposed) return;
    animationFrame = requestAnimationFrame(animate);
    if (!visible) return;

    ctx.clearRect(0, 0, width, height);
    t += 0.02;

    for (const ff of fireflies) {
      ff.update(t);
      ff.draw();
    }
  };
  animate();

  const onVis = () => {
    visible = document.visibilityState === 'visible';
  };
  document.addEventListener('visibilitychange', onVis);

  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}
