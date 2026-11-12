import * as THREE from 'three';

/**
 * Procedural wood plank texture generator
 */
function makeWoodTexture(baseColor = '#3e2417', grainColor = '#24140b') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Planks lines
  ctx.fillStyle = grainColor;
  for (let i = 0; i < 512; i += 64) {
    ctx.fillRect(0, i, 512, 2);
  }

  // Wood grain streaks
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = Math.random() * 60 + 20;
    ctx.fillStyle = 'rgba(25, 12, 6, 0.08)';
    ctx.fillRect(x, y, w, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function mountLibraryScene(canvas, onSelectBook) {
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a0f14, 8, 22);

  const camera = new THREE.PerspectiveCamera(48, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
  camera.position.set(0, 1.8, 4.2);
  camera.lookAt(0, 1.7, -5);

  // Warm library lighting: ambient + multiple warm lantern point lights
  const ambient = new THREE.AmbientLight(0xffeed6, 0.55);
  scene.add(ambient);

  const sconceColors = [0xffb74d, 0xffa726, 0xffcc80];
  const sconcePositions = [
    [-2.8, 2.5, 0],
    [2.8, 2.5, 0],
    [-2.8, 2.5, -4],
    [2.8, 2.5, -4],
    [-2.8, 2.5, -8],
    [2.8, 2.5, -8],
  ];

  sconcePositions.forEach(([x, y, z], i) => {
    const light = new THREE.PointLight(sconceColors[i % 3], 1.2, 7, 1.8);
    light.position.set(x, y, z);
    light.castShadow = !mobile;
    scene.add(light);

    // Visible small lantern fixture
    const fixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffd580,
        emissive: 0xff9900,
        emissiveIntensity: 0.85
      })
    );
    fixture.position.set(x, y, z);
    scene.add(fixture);
  });

  // Wood Floor
  const woodTex = makeWoodTexture('#2b170e', '#190d07');
  const floorGeo = new THREE.PlaneGeometry(12, 32);
  const floorMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.85,
    metalness: 0.05
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -6);
  floor.receiveShadow = !mobile;
  scene.add(floor);

  // Ceiling
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1f1116, roughness: 0.95 });
  const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.5, -6);
  scene.add(ceiling);

  // Bookshelves on Left & Right walls
  const shelfWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3d2015,
    roughness: 0.82
  });

  const bookColors = [
    0x5c1f2c, 0x1e3a2f, 0x1f2e4d, 0x8c6d3b, 0x4a1923, 0x2d1f3d, 0x6e261a, 0x243b35
  ];

  const interactiveBooks = [];

  function buildBookcase(side = -1, zPos = 0) {
    const caseGroup = new THREE.Group();
    const caseX = side * 2.8;

    // Upright columns
    const uprightGeo = new THREE.BoxGeometry(0.12, 3.8, 0.45);
    for (const offX of [-0.95, 0.95]) {
      const col = new THREE.Mesh(uprightGeo, shelfWoodMat);
      col.position.set(offX, 1.9, 0);
      col.castShadow = !mobile;
      caseGroup.add(col);
    }

    // Horizontal shelves (4 tiers)
    const shelfGeo = new THREE.BoxGeometry(1.9, 0.08, 0.44);
    for (let tier = 0; tier < 4; tier++) {
      const sY = 0.5 + tier * 0.9;
      const shelf = new THREE.Mesh(shelfGeo, shelfWoodMat);
      shelf.position.set(0, sY, 0);
      shelf.castShadow = !mobile;
      shelf.receiveShadow = !mobile;
      caseGroup.add(shelf);

      // Add books on each shelf tier
      let curX = -0.85;
      while (curX < 0.82) {
        const bW = 0.045 + Math.random() * 0.04;
        const bH = 0.45 + Math.random() * 0.3;
        const bD = 0.32 + Math.random() * 0.06;
        const bColor = bookColors[Math.floor(Math.random() * bookColors.length)];

        const bGeo = new THREE.BoxGeometry(bW, bH, bD);
        const bMat = new THREE.MeshStandardMaterial({
          color: bColor,
          roughness: 0.75
        });
        const book = new THREE.Mesh(bGeo, bMat);
        const bY = sY + 0.04 + bH / 2;
        book.position.set(curX + bW / 2, bY, 0.02);
        book.castShadow = !mobile;

        caseGroup.add(book);
        interactiveBooks.push(book);

        curX += bW + 0.008;
      }
    }

    caseGroup.position.set(caseX, 0, zPos);
    if (side > 0) caseGroup.rotation.y = Math.PI;
    scene.add(caseGroup);
  }

  // Build rows of bookcases along the corridor
  for (const z of [2, -2, -6, -10, -14]) {
    buildBookcase(-1, z);
    buildBookcase(1, z);
  }

  // Camera track control via mouse / wheel drag
  let targetCamZ = 4.2;
  let targetCamY = 1.8;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const onPointerMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Scroll or drag navigation through library corridor
  const onWheel = (e) => {
    targetCamZ += e.deltaY * 0.003;
    targetCamZ = Math.max(-10, Math.min(4.5, targetCamZ));
  };
  canvas.addEventListener('wheel', onWheel, { passive: true });

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

    const t = clock.getElapsedTime();

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    // Smooth camera drift down corridor
    camera.position.z += (targetCamZ - camera.position.z) * 0.04;
    camera.position.x = pointer.x * 0.45;
    camera.position.y = targetCamY + pointer.y * -0.25;

    camera.lookAt(pointer.x * 0.2, 1.7, camera.position.z - 8);

    renderer.render(scene, camera);
  };
  animate();

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('wheel', onWheel);
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
