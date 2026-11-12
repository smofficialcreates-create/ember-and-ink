import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Creates an elegant canvas texture for the book cover.
 * Loads actual cover image if available, else renders a rich literary binding.
 */
function makeBookCoverTexture(imageUrl, title, author = 'Ember & Ink') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Literary book cloth background
  const grad = ctx.createLinearGradient(0, 0, 512, 768);
  grad.addColorStop(0, '#42151f');
  grad.addColorStop(0.5, '#5c1f2c');
  grad.addColorStop(1, '#2b1016');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 768);

  // Gold foil border
  ctx.strokeStyle = '#c9a14a';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, 512 - 56, 768 - 56);
  ctx.strokeStyle = 'rgba(201, 161, 74, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38, 38, 512 - 76, 768 - 76);

  // Embossed corner ornaments
  const drawCorner = (x, y, sX, sY) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sX, sY);
    ctx.fillStyle = '#c9a14a';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawCorner(50, 50, 1, 1);
  drawCorner(512 - 50, 50, -1, 1);
  drawCorner(50, 768 - 50, 1, -1);
  drawCorner(512 - 50, 768 - 50, -1, -1);

  // Typography
  ctx.fillStyle = '#f9f4eb';
  ctx.font = 'italic 28px "Fraunces Variable", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ember & Ink Select', 256, 120);

  ctx.fillStyle = '#e8d5a3';
  ctx.font = '600 36px "Fraunces Variable", Georgia, serif';
  
  // Word wrap title
  const words = title.split(' ');
  let line = '';
  let y = 340;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 420 && n > 0) {
      ctx.fillText(line.trim(), 256, y);
      line = words[n] + ' ';
      y += 46;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), 256, y);

  ctx.fillStyle = '#c9a14a';
  ctx.font = '18px "Inter Variable", sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('FEATURED READING', 256, 680);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  if (imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, 512, 768);
      ctx.drawImage(img, 0, 0, 512, 768);
      
      // Subtle vintage glaze overlay on top of cover
      ctx.fillStyle = 'rgba(42, 33, 24, 0.08)';
      ctx.fillRect(0, 0, 512, 768);
      
      // Embossed edge shadow
      const edgeGrad = ctx.createLinearGradient(0, 0, 30, 0);
      edgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
      edgeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, 30, 768);
      
      texture.needsUpdate = true;
    };
    img.src = imageUrl;
  }

  return texture;
}

/**
 * Creates aged deckle-edge paper texture for the page block
 */
function makePageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = '#f6efe1';
  ctx.fillRect(0, 0, 128, 512);

  // Subtle page line grooves
  ctx.fillStyle = 'rgba(110, 97, 85, 0.09)';
  for (let i = 0; i < 512; i += 3) {
    if (Math.random() > 0.3) {
      ctx.fillRect(0, i, 128, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates cloth spine texture with gold foil title and bands
 */
function makeSpineTexture(title) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, '#2d0e15');
  grad.addColorStop(0.5, '#4a1923');
  grad.addColorStop(1, '#1f090e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 768);

  // Gold raised ribs (head & tail bands)
  const drawRib = (y) => {
    ctx.fillStyle = '#c9a14a';
    ctx.fillRect(10, y, 108, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(10, y + 3, 108, 2);
  };
  drawRib(60);
  drawRib(68);
  drawRib(700);
  drawRib(708);

  // Vertical spine title
  ctx.save();
  ctx.translate(64, 384);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#e8d5a3';
  ctx.font = '500 22px "Fraunces Variable", Georgia, serif';
  ctx.textAlign = 'center';
  const shortTitle = title.length > 28 ? title.slice(0, 26) + '…' : title;
  ctx.fillText(shortTitle, 0, 7);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function mountBooksScene(canvas, bookData = []) {
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.6));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
  camera.position.set(0, 0.4, 5.2);
  camera.lookAt(0, 0, 0);

  // Warm studio library lighting
  const hemi = new THREE.HemisphereLight(0xfff7ed, 0xbab29e, 1.25);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff3df, 2.2);
  keyLight.position.set(4, 5, 5);
  keyLight.castShadow = !mobile;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xe5b869, 1.1);
  rimLight.position.set(-5, 2, -2);
  scene.add(rimLight);

  // Subtle floating particles / dust motes in sunbeam
  const particleCount = mobile ? 28 : 64;
  const particleGeo = new THREE.BufferGeometry();
  const particlePos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePos[i * 3] = (Math.random() - 0.5) * 8;
    particlePos[i * 3 + 1] = (Math.random() - 0.5) * 4;
    particlePos[i * 3 + 2] = (Math.random() - 0.5) * 4;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xecd59e,
    size: 0.04,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Create 3D Books
  const books = [];
  const bookCount = Math.min(bookData.length || 3, 3);
  const spacing = mobile ? 1.6 : 1.75;
  const startX = -((bookCount - 1) * spacing) / 2;

  const pageTexture = makePageTexture();

  for (let i = 0; i < bookCount; i++) {
    const data = bookData[i] || { title: `Featured Book ${i + 1}` };
    const coverTexture = makeBookCoverTexture(data.coverImage, data.title);
    const spineTexture = makeSpineTexture(data.title);

    const group = new THREE.Group();

    // Book geometry: X = thickness (0.24), Y = height (2.1), Z = width (1.45)
    const thickness = 0.22;
    const height = 2.05;
    const width = 1.42;

    const bookGeo = new THREE.BoxGeometry(thickness, height, width);

    const bookMatCover = new THREE.MeshStandardMaterial({
      map: coverTexture,
      roughness: 0.72,
      metalness: 0.05
    });

    const bookMatSpine = new THREE.MeshStandardMaterial({
      map: spineTexture,
      roughness: 0.68,
      metalness: 0.12
    });

    const bookMatPages = new THREE.MeshStandardMaterial({
      map: pageTexture,
      roughness: 0.95
    });

    // Box faces: [+X, -X, +Y, -Y, +Z, -Z]
    const materials = [
      bookMatPages,  // front edges (+X)
      bookMatSpine,  // spine (-X)
      bookMatPages,  // top (+Y)
      bookMatPages,  // bottom (-Y)
      bookMatCover,  // front cover (+Z)
      bookMatSpine   // back cover (-Z)
    ];

    const bookMesh = new THREE.Mesh(bookGeo, materials);
    bookMesh.castShadow = !mobile;
    bookMesh.receiveShadow = !mobile;
    group.add(bookMesh);

    // Silk bookmark ribbon peaking out bottom
    const ribbonShape = new THREE.Shape();
    ribbonShape.moveTo(-0.04, 0);
    ribbonShape.lineTo(0.04, 0);
    ribbonShape.lineTo(0.04, -0.32);
    ribbonShape.lineTo(0, -0.26);
    ribbonShape.lineTo(-0.04, -0.32);
    ribbonShape.closePath();

    const ribbonGeo = new THREE.ShapeGeometry(ribbonShape);
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0x9b3c4a,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.position.set(0.02, -height / 2, 0.2);
    ribbon.rotation.x = 0.15;
    group.add(ribbon);

    // Layout position
    const baseX = startX + i * spacing;
    const baseY = 0;
    const baseZ = (i === 1) ? 0.35 : -0.15; // middle book slightly forward
    const baseRotY = (i === 0) ? 0.28 : (i === 1) ? 0.0 : -0.28;
    const baseRotX = 0.05;

    group.position.set(baseX, baseY, baseZ);
    group.rotation.set(baseRotX, baseRotY, 0);

    group.userData = {
      baseX,
      baseY,
      baseZ,
      baseRotY,
      baseRotX,
      floatSpeed: 0.8 + i * 0.25,
      floatOffset: i * 1.8
    };

    scene.add(group);
    books.push(group);
  }

  // Pointer parallax tracking
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const onPointerMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Tab visibility
  let visible = true;
  const onVisibility = () => {
    visible = document.visibilityState === 'visible';
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Scroll entrance with GSAP
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const section = canvas.closest('section') || canvas.parentElement;
    if (section) {
      books.forEach((book, idx) => {
        gsap.from(book.position, {
          y: -3.5,
          z: -2,
          duration: 1.4,
          delay: 0.15 * idx,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            once: true
          }
        });

        gsap.from(book.rotation, {
          y: book.userData.baseRotY + (idx % 2 === 0 ? 0.8 : -0.8),
          duration: 1.6,
          delay: 0.15 * idx,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            once: true
          }
        });
      });
    }
  }

  // Resize handling
  const resize = () => {
    if (disposed) return;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || 500;
    camera.aspect = w / h;
    camera.fov = mobile ? 48 : 40;
    camera.position.z = mobile ? 6.2 : 5.2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // Animation Loop
  const clock = new THREE.Clock();

  const animate = () => {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    if (!visible) return;

    const t = clock.getElapsedTime();

    // Lerp pointer
    pointer.x += (pointer.targetX - pointer.x) * 0.05;
    pointer.y += (pointer.targetY - pointer.y) * 0.05;

    // Animate books
    books.forEach((book) => {
      const u = book.userData;
      const floatY = Math.sin(t * u.floatSpeed + u.floatOffset) * 0.07;
      const swayRot = Math.sin(t * (u.floatSpeed * 0.7) + u.floatOffset) * 0.03;

      book.position.y = u.baseY + floatY + pointer.y * -0.15;
      book.rotation.y = u.baseRotY + swayRot + pointer.x * 0.12;
      book.rotation.x = u.baseRotX + pointer.y * -0.08;
    });

    // Animate dust particles
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.002 - 0.001;
      if (positions[i * 3 + 1] < -2) positions[i * 3 + 1] = 2;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y = t * 0.02;

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
