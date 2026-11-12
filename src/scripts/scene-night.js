import * as THREE from 'three';

export function mountNightScene(canvas) {
  if (!canvas) return () => {};

  const mobile = window.matchMedia('(max-width: 760px)').matches;
  let disposed = false;
  let raf = 0;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (e) {
    return () => {};
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.05 : 1.4));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0c14, 0.035);

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 1.2, 8);
  camera.lookAt(0, 2, 0);

  // Soft moonlight & cool nocturnal ambient
  const ambient = new THREE.AmbientLight(0x1a2436, 1.2);
  scene.add(ambient);

  const moonLight = new THREE.DirectionalLight(0xd4e5ff, 1.4);
  moonLight.position.set(6, 12, -4);
  scene.add(moonLight);

  // ── Starfield (800 gentle twinkling stars) ──
  const starCount = mobile ? 350 : 850;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starTwinkles = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 45;
    starPositions[i * 3 + 1] = Math.random() * 22 + 0.5;
    starPositions[i * 3 + 2] = -5 - Math.random() * 25;
    starTwinkles[i] = Math.random() * Math.PI * 2;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

  const starMat = new THREE.PointsMaterial({
    color: 0xf5f8ff,
    size: mobile ? 0.08 : 0.09,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ── Soft Glowing Moon ──
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 256;
  moonCanvas.height = 256;
  const mCtx = moonCanvas.getContext('2d');
  if (mCtx) {
    const grad = mCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(255, 252, 240, 1)');
    grad.addColorStop(0.35, 'rgba(235, 245, 255, 0.75)');
    grad.addColorStop(0.7, 'rgba(180, 210, 255, 0.25)');
    grad.addColorStop(1, 'rgba(140, 180, 255, 0)');
    mCtx.fillStyle = grad;
    mCtx.fillRect(0, 0, 256, 256);
  }
  const moonTexture = new THREE.CanvasTexture(moonCanvas);
  const moonSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: moonTexture,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
  );
  moonSprite.position.set(7.5, 9.5, -16);
  moonSprite.scale.set(6, 6, 1);
  scene.add(moonSprite);

  // ── Silhouetted Mountain Ridges in Distance ──
  const ridgeGeo = new THREE.PlaneGeometry(60, 8, 32, 4);
  const pos = ridgeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const wave = Math.sin(x * 0.18) * 1.2 + Math.cos(x * 0.42) * 0.6;
    pos.setY(i, pos.getY(i) + wave);
  }
  ridgeGeo.computeVertexNormals();

  const ridgeMat = new THREE.MeshBasicMaterial({
    color: 0x070910,
    side: THREE.DoubleSide
  });
  const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
  ridge.position.set(0, 0, -20);
  scene.add(ridge);

  // ── Foreground Terrain Silhouette ──
  const fgGeo = new THREE.PlaneGeometry(40, 5, 16, 2);
  const fgMat = new THREE.MeshBasicMaterial({
    color: 0x05070c,
    side: THREE.DoubleSide
  });
  const fg = new THREE.Mesh(fgGeo, fgMat);
  fg.position.set(0, -1.8, -4);
  scene.add(fg);

  // ── Firefly Particle Swarm (24 glowing motes) ──
  const fireflyCount = mobile ? 12 : 28;
  const fireflies = [];
  const fireflyMat = new THREE.MeshBasicMaterial({
    color: 0xd4ff88,
    transparent: true,
    opacity: 0.8
  });
  const fireflyGeo = new THREE.SphereGeometry(0.04, 6, 6);

  for (let i = 0; i < fireflyCount; i++) {
    const mesh = new THREE.Mesh(fireflyGeo, fireflyMat.clone());
    const origin = new THREE.Vector3(
      (Math.random() - 0.5) * 16,
      Math.random() * 3.5 - 0.5,
      Math.random() * 6 - 2
    );
    mesh.position.copy(origin);
    mesh.userData = {
      origin,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: 0.2 + Math.random() * 0.3,
      speedZ: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2
    };
    scene.add(mesh);
    fireflies.push(mesh);
  }

  // Pointer movement tracking
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Tab visibility
  let visible = true;
  const onVisibility = () => {
    visible = document.visibilityState === 'visible';
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Resize handling
  const resize = () => {
    if (disposed) return;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || 500;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const clock = new THREE.Clock();

  const animate = () => {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    if (!visible) return;

    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    pointer.x += (pointer.tx - pointer.x) * 0.03;
    pointer.y += (pointer.ty - pointer.y) * 0.03;

    // Gentle camera drift
    camera.position.x = pointer.x * 0.4;
    camera.position.y = 1.2 + pointer.y * -0.2;
    camera.lookAt(pointer.x * 0.15, 2, 0);

    // Twinkling stars
    starMat.opacity = 0.75 + Math.sin(t * 1.5) * 0.15;

    // Animate fireflies
    fireflies.forEach((ff) => {
      const u = ff.userData;
      ff.position.x = u.origin.x + Math.sin(t * u.speedX + u.phase) * 1.2;
      ff.position.y = u.origin.y + Math.cos(t * u.speedY + u.phase) * 0.6;
      ff.position.z = u.origin.z + Math.sin(t * u.speedZ + u.phase) * 0.8;

      // Pulse glow
      const glow = Math.max(0.1, Math.sin(t * 2.2 + u.phase));
      (ff.material).opacity = glow * 0.85;
    });

    renderer.render(scene, camera);
  };
  animate();

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVisibility);

    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    renderer.dispose();
  };

  window.addEventListener('pagehide', cleanup, { once: true });
  return cleanup;
}
