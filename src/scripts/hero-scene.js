import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function makeRng(seed = 731) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}


/**
 * Optional production-ready GLB assets.
 * These lightweight models are used as real mesh assets, while the scene,
 * terrain, lighting, water, petals and motion remain custom Three.js work.
 * Both sources publish free-to-use models; keep these URLs in the asset notes.
 */
function loadExternalModel(url, onLoad) {
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      gltf.scene.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            material.needsUpdate = true;
          }
        }
      });
      onLoad(gltf.scene);
    },
    undefined,
    (error) => {
      console.warn("Ember & Ink: optional 3D asset could not be loaded; using the built-in scene model.", error);
    },
  );
}

function disposeObject3D(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        for (const value of Object.values(material)) {
          if (value && value.isTexture) value.dispose();
        }
        material.dispose();
      });
    }
  });
}

function makeSoftTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, "#a9c982");
  gradient.addColorStop(0.5, "#86ad66");
  gradient.addColorStop(1, "#779d60");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const rng = makeRng(15);
  for (let i = 0; i < 6500; i++) {
    const tone = rng() > 0.52 ? "rgba(44,79,42,.09)" : "rgba(231,222,160,.10)";
    ctx.fillStyle = tone;
    const w = 1 + rng() * 3;
    const h = 1 + rng() * 2;
    ctx.fillRect(rng() * 256, rng() * 256, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(11, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makePetalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.055, 0.035, -0.16, 0.17, 0, 0.29);
  shape.bezierCurveTo(0.16, 0.17, 0.055, 0.035, 0, 0);
  const single = new THREE.ShapeGeometry(shape, 7);
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const g = single.clone();
    const angle = (i / 5) * Math.PI * 2;
    const matrix = new THREE.Matrix4()
      .makeRotationZ(angle)
      .multiply(new THREE.Matrix4().makeTranslation(0, 0.012, 0));
    g.applyMatrix4(matrix);
    petals.push(g);
  }
  single.dispose();
  return mergeGeometries(petals, false);
}

function makeTaperedBranch(points, startRadius, endRadius, material, radialSegments = 9) {
  const curve = new THREE.CatmullRomCurve3(points);
  const segments = 18;
  const positions = [];
  const indices = [];
  const up = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    let normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    if (normal.lengthSq() < 0.001) normal.set(1, 0, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    const radius = lerp(startRadius, endRadius, t) * (1 + Math.sin(t * Math.PI) * 0.035);

    for (let j = 0; j < radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const vertex = point.clone()
        .addScaledVector(normal, Math.cos(a) * radius)
        .addScaledVector(binormal, Math.sin(a) * radius);
      positions.push(vertex.x, vertex.y, vertex.z);
      if (i < segments) {
        const a0 = i * radialSegments + j;
        const a1 = i * radialSegments + ((j + 1) % radialSegments);
        const b0 = (i + 1) * radialSegments + j;
        const b1 = (i + 1) * radialSegments + ((j + 1) % radialSegments);
        indices.push(a0, b0, a1, a1, b0, b1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeFlowerGeometry() {
  const petal = makePetalGeometry();
  const center = new THREE.SphereGeometry(0.035, 8, 6);
  center.translate(0, 0.02, 0.018);
  const combined = mergeGeometries([petal, center], false);
  petal.dispose();
  center.dispose();
  return combined;
}

function groundHeight(x, z) {
  const hill = 1.7 * Math.exp(-(((x - 5.3) ** 2) / 48 + ((z - 1.2) ** 2) / 34));
  const rolling = 0.17 * Math.sin(x * 0.19 + z * 0.12) + 0.11 * Math.cos(z * 0.23 - x * 0.08);
  const riverLine = -17 + Math.sin(x * 0.085) * 1.65;
  const valley = 1.05 * Math.exp(-((z - riverLine) ** 2) / 13);
  return -0.05 + hill + rolling - valley;
}

function createTerrain(scene, mobile, rng) {
  const width = 94;
  const depth = 92;
  const geo = new THREE.PlaneGeometry(width, depth, mobile ? 100 : 164, mobile ? 90 : 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
  }
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: makeSoftTexture(),
      color: 0xc1d4a4,
      roughness: 0.98,
    }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  const bladePositions = [
    -0.035, 0, 0, 0.035, 0, 0, 0.018, 0.13, 0.012,
    -0.035, 0, 0, 0.018, 0.13, 0.012, -0.014, 0.27, 0.026,
  ];
  const blade = new THREE.BufferGeometry();
  blade.setAttribute("position", new THREE.Float32BufferAttribute(bladePositions, 3));
  blade.computeVertexNormals();
  const grass = new THREE.InstancedMesh(
    blade,
    new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 }),
    mobile ? 1500 : 3900,
  );
  grass.castShadow = false;
  grass.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < grass.count; i++) {
    const x = (rng() - 0.5) * 46;
    const z = -1 + rng() * 24;
    const nearChair = Math.abs(x - 6) < 2.1 && z > 1 && z < 7;
    if (nearChair || Math.abs(z - (-17 + Math.sin(x * 0.085) * 1.65)) < 5) {
      dummy.position.set(-60, -60, -60);
    } else {
      dummy.position.set(x, groundHeight(x, z) - 0.015, z);
    }
    dummy.rotation.set((rng() - 0.5) * 0.18, rng() * Math.PI, (rng() - 0.5) * 0.13);
    const scale = 0.55 + rng() * 1.2;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.25 + rng() * 0.055, 0.28 + rng() * 0.24, 0.31 + rng() * 0.2);
    grass.setColorAt(i, color);
  }
  grass.instanceMatrix.needsUpdate = true;
  scene.add(grass);

  return { terrain, grass };
}

function createRidge(scene, options) {
  const { centerX, centerZ, width, depth, height, color, peakShift = 0, seed = 1 } = options;
  const columns = 72;
  const rows = 24;
  const vertices = [];
  const indices = [];
  const rng = makeRng(seed);
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (let col = 0; col <= columns; col++) {
      const u = col / columns;
      const xNorm = (u - 0.5) * 2;
      const x = centerX + xNorm * width * 0.5;
      const ridge = Math.pow(Math.max(0, 1 - Math.abs(xNorm - peakShift) * 0.82), 1.8);
      const depthFade = Math.sin(v * Math.PI * 0.88);
      const shoulder = 0.08 * Math.sin(u * Math.PI * 8 + seed) * Math.sin(v * Math.PI);
      const y = -1.6 + height * ridge * depthFade + shoulder + 0.05 * (rng() - 0.5);
      const z = centerZ - v * depth;
      vertices.push(x, y, z);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col;
      const b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function createTree(scene, mobile, rng) {
  const tree = new THREE.Group();
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x574033, roughness: 0.94 });
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x73513b, roughness: 0.88 });
  const base = new THREE.Vector3(5.2, groundHeight(5.2, 0.8), 0.8);
  const trunkPoints = [
    base.clone(),
    base.clone().add(new THREE.Vector3(-0.12, 1.7, 0.02)),
    base.clone().add(new THREE.Vector3(0.16, 3.7, -0.12)),
    base.clone().add(new THREE.Vector3(0.42, 5.9, -0.2)),
    base.clone().add(new THREE.Vector3(0.62, 7.55, -0.28)),
  ];
  tree.add(makeTaperedBranch(trunkPoints, 0.43, 0.09, barkMat, 13));

  const rootDirections = [
    [-1, 0.2, 0.5], [1, 0.15, 0.3], [-0.35, 0.1, -1], [0.55, 0.1, 1],
  ];
  for (const [x, y, z] of rootDirections) {
    const end = base.clone().add(new THREE.Vector3(x * 1.1, 0.13, z * 0.75));
    const mid = base.clone().lerp(end, 0.48).add(new THREE.Vector3(0, 0.16, 0));
    tree.add(makeTaperedBranch([base.clone(), mid, end], 0.22, 0.025, barkMat, 8));
  }

  const tips = [];
  function growBranch(start, direction, length, radius, depth, salt) {
    const side = new THREE.Vector3((rng() - 0.5) * 0.65, 0.05 + rng() * 0.35, (rng() - 0.5) * 0.55);
    const end = start.clone().add(direction.clone().normalize().multiplyScalar(length)).add(side);
    const control = start.clone().lerp(end, 0.48).add(new THREE.Vector3(side.x * 0.3, 0.24, side.z * 0.3));
    tree.add(makeTaperedBranch([start.clone(), control, end.clone()], radius, Math.max(0.012, radius * 0.43), branchMat, 7));
    if (depth <= 0) {
      tips.push(end);
      return;
    }
    const childCount = depth === 2 ? 3 : 2;
    for (let i = 0; i < childCount; i++) {
      const spread = (i - (childCount - 1) / 2) * 0.62;
      const childDir = direction.clone()
        .add(new THREE.Vector3(spread + (rng() - 0.5) * 0.3, 0.34 + rng() * 0.24, (rng() - 0.5) * 0.75))
        .normalize();
      growBranch(end, childDir, length * (0.67 + rng() * 0.09), radius * 0.64, depth - 1, salt + i);
    }
  }

  const primary = [
    [4.5, 5.0, 0.5, 0.26], [-4.1, 4.8, 0.2, 0.25], [1.2, 5.0, -3.2, 0.23],
    [-1.3, 4.5, 3.2, 0.24], [3.1, 6.0, -1.6, 0.2], [-3.2, 5.6, -1.8, 0.2],
  ];
  for (const [x, y, z, radius] of primary) {
    const start = base.clone().add(new THREE.Vector3(0.3, 3.8 + rng() * 1.7, -0.12));
    const direction = new THREE.Vector3(x, y - 3.9, z).normalize();
    growBranch(start, direction, Math.sqrt(x * x + (y - 3.9) ** 2 + z * z), radius, 2, 0);
  }

  const canopyCenters = tips.concat([
    base.clone().add(new THREE.Vector3(-1.8, 6.5, 0.4)),
    base.clone().add(new THREE.Vector3(1.6, 6.9, -0.4)),
    base.clone().add(new THREE.Vector3(0.2, 7.6, 0.1)),
  ]);
  const flowerCount = mobile ? 720 : 1560;
  const flowerGeometry = makeFlowerGeometry();
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, side: THREE.DoubleSide, roughness: 0.82,
  });
  const flowers = new THREE.InstancedMesh(flowerGeometry, petalMaterial, flowerCount);
  const centers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.027, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0xd9a45e, roughness: 0.8 }),
    flowerCount,
  );
  const dummy = new THREE.Object3D();
  const flowerColor = new THREE.Color();
  for (let i = 0; i < flowerCount; i++) {
    const c = canopyCenters[Math.floor(rng() * canopyCenters.length)];
    const offset = new THREE.Vector3(
      (rng() - 0.5) * 2.3,
      (rng() - 0.5) * 1.8,
      (rng() - 0.5) * 2.1,
    );
    dummy.position.copy(c).add(offset);
    dummy.rotation.set((rng() - 0.5) * 0.95, (rng() - 0.5) * 1.5, rng() * Math.PI * 2);
    const scale = 0.62 + rng() * 0.62;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    centers.setMatrixAt(i, dummy.matrix);
    flowerColor.setHSL(0.94 + rng() * 0.025, 0.36 + rng() * 0.22, 0.76 + rng() * 0.12);
    flowers.setColorAt(i, flowerColor);
  }
  flowers.instanceMatrix.needsUpdate = true;
  centers.instanceMatrix.needsUpdate = true;
  tree.add(flowers, centers);
  tree.position.y = 0;
  tree.userData.base = base;
  tree.userData.blossoms = flowers;
  scene.add(tree);
  return tree;
}

function createRiver(scene) {
  const segments = 180;
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -34 + t * 68;
    const centerZ = -17 + Math.sin(x * 0.085) * 1.65;
    const edgeW = 3.05 + Math.sin(t * Math.PI * 5) * 0.22;
    vertices.push(x, 0.05, centerZ - edgeW, x, 0.05, centerZ + edgeW);
    uvs.push(t * 8, 0, t * 8, 1);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: [
      "uniform float uTime;",
      "varying vec2 vUv;",
      "varying vec3 vWorld;",
      "void main(){",
      "vUv=uv;",
      "vec3 p=position;",
      "p.y += sin(p.x*0.55 + uTime*0.8)*0.018 + sin(p.x*1.35 - uTime*0.55)*0.009;",
      "vec4 world=modelMatrix*vec4(p,1.0);",
      "vWorld=world.xyz;",
      "gl_Position=projectionMatrix*viewMatrix*world;",
      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform float uTime;",
      "varying vec2 vUv;",
      "varying vec3 vWorld;",
      "void main(){",
      "float waveA=sin(vUv.x*92.0-uTime*1.6+sin(vUv.y*15.0))*0.5+0.5;",
      "float waveB=sin(vUv.x*47.0+vUv.y*19.0-uTime*0.8)*0.5+0.5;",
      "float glint=smoothstep(0.86,0.98,waveA*0.65+waveB*0.35)*0.18;",
      "vec3 deep=vec3(0.22,0.43,0.49);",
      "vec3 shallow=vec3(0.43,0.66,0.66);",
      "vec3 water=mix(deep,shallow,smoothstep(0.0,1.0,vUv.y));",
      "water += vec3(0.55,0.64,0.57)*glint;",
      "gl_FragColor=vec4(water,0.97);",
      "}",
    ].join("\n"),
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = 0.23;
  mesh.renderOrder = 2;
  scene.add(mesh);
  return { mesh, material };
}

function createBridge(scene, rng) {
  const bridge = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x877f70, roughness: 0.91 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x625244, roughness: 0.82 });
  const rail = new THREE.MeshStandardMaterial({ color: 0x454a48, metalness: 0.58, roughness: 0.55 });

  const deck = new THREE.Mesh(new RoundedBoxGeometry(27, 0.36, 1.55, 4, 0.08), stone);
  deck.position.y = 2.55;
  deck.castShadow = true;
  deck.receiveShadow = true;
  bridge.add(deck);

  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-12.7, 2.42, 0),
    new THREE.Vector3(-9, 1.25, 0),
    new THREE.Vector3(-5, 0.48, 0),
    new THREE.Vector3(0, 0.12, 0),
    new THREE.Vector3(5, 0.48, 0),
    new THREE.Vector3(9, 1.25, 0),
    new THREE.Vector3(12.7, 2.42, 0),
  ]);
  const arch = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 92, 0.22, 12, false), stone);
  bridge.add(arch);

  for (let i = -11; i <= 11; i += 5.5) {
    const pier = new THREE.Mesh(new RoundedBoxGeometry(0.62, 1.55 + rng() * 0.16, 0.72, 3, 0.08), stone);
    pier.position.set(i, 1.25, 0);
    pier.castShadow = true;
    bridge.add(pier);
  }

  for (const z of [-0.58, 0.58]) {
    const topRail = new THREE.Mesh(new RoundedBoxGeometry(27, 0.11, 0.11, 3, 0.035), timber);
    topRail.position.set(0, 3.2, z);
    bridge.add(topRail);
    for (let x = -12.6; x <= 12.7; x += 1.8) {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.105, 0.66, 0.11, 2, 0.025), timber);
      post.position.set(x, 2.91, z);
      bridge.add(post);
    }
  }

  for (let x = -13; x <= 13; x += 0.72) {
    const sleeper = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.075, 1.4, 2, 0.02), timber);
    sleeper.rotation.y = Math.PI / 2;
    sleeper.position.set(x, 2.78, 0);
    bridge.add(sleeper);
  }
  for (const z of [-0.28, 0.28]) {
    const steelRail = new THREE.Mesh(new RoundedBoxGeometry(27, 0.10, 0.095, 3, 0.025), rail);
    steelRail.position.set(0, 2.87, z);
    bridge.add(steelRail);
  }

  bridge.position.set(0, 0, -17);
  scene.add(bridge);
  return bridge;
}

function createTrain(scene) {
  const train = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6f8b80, roughness: 0.65, metalness: 0.08 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xe7dfca, roughness: 0.65 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4b514c, roughness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x343a38, metalness: 0.62, roughness: 0.42 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x526b70, metalness: 0.2, roughness: 0.28, emissive: 0x263d42, emissiveIntensity: 0.12 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb58c4d, metalness: 0.58, roughness: 0.34 });
  const wheelMeshes = [];

  function addWheel(x, z, y = 0.32) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.105, 24), dark);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    train.add(wheel);
    wheelMeshes.push(wheel);
  }

  const engine = new THREE.Group();
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 1.35, 28, 1), bodyMat);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(0.48, 0.86, 0);
  engine.add(boiler);

  const frontRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 10, 28), brass);
  frontRing.position.set(1.17, 0.86, 0);
  frontRing.rotation.y = Math.PI / 2;
  engine.add(frontRing);

  const cab = new THREE.Mesh(new RoundedBoxGeometry(0.83, 0.88, 0.75, 4, 0.1), bodyMat);
  cab.position.set(-0.52, 0.87, 0);
  engine.add(cab);
  const cabWindow = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.39, 0.34, 3, 0.035), windowMat);
  cabWindow.position.set(-0.08, 1.01, 0);
  engine.add(cabWindow);

  const boilerBand = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 9, 24), brass);
  boilerBand.position.set(0.12, 0.86, 0);
  boilerBand.rotation.y = Math.PI / 2;
  engine.add(boilerBand);

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 0.44, 16), dark);
  chimney.position.set(0.85, 1.28, 0);
  engine.add(chimney);
  const chimneyLip = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.1, 16), dark);
  chimneyLip.position.set(0.85, 1.52, 0);
  engine.add(chimneyLip);

  const cowcatcher = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.22, 0.65, 3, 0.04), dark);
  cowcatcher.position.set(1.25, 0.35, 0);
  cowcatcher.rotation.z = -0.18;
  engine.add(cowcatcher);

  for (const x of [-0.58, 0.3, 0.92]) {
    for (const z of [-0.36, 0.36]) addWheel(x, z);
  }
  engine.position.x = 0.4;
  train.add(engine);

  for (let i = 0; i < 2; i++) {
    const car = new THREE.Group();
    const x = -1.85 - i * 2.18;
    const shell = new THREE.Mesh(new RoundedBoxGeometry(1.95, 0.92, 0.82, 5, 0.12), creamMat);
    shell.position.set(x, 0.94, 0);
    shell.castShadow = true;
    car.add(shell);
    const lower = new THREE.Mesh(new RoundedBoxGeometry(1.98, 0.23, 0.86, 4, 0.06), bodyMat);
    lower.position.set(x, 0.48, 0);
    car.add(lower);
    const roof = new THREE.Mesh(new RoundedBoxGeometry(2.02, 0.16, 0.9, 5, 0.075), roofMat);
    roof.position.set(x, 1.48, 0);
    car.add(roof);
    for (const side of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        const windowMesh = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.42, 0.035, 4, 0.055), windowMat);
        windowMesh.position.set(x - 0.61 + w * 0.61, 1.02, side * 0.421);
        car.add(windowMesh);
      }
      const stripe = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.075, 0.025, 2, 0.015), bodyMat);
      stripe.position.set(x, 0.75, side * 0.44);
      car.add(stripe);
    }
    for (const wheelX of [x - 0.58, x + 0.58]) {
      addWheel(wheelX, -0.43, 0.33);
      addWheel(wheelX, 0.43, 0.33);
    }
    train.add(car);
  }

  const smokeCanvas = document.createElement("canvas");
  smokeCanvas.width = smokeCanvas.height = 128;
  const smokeCtx = smokeCanvas.getContext("2d");
  const smokeGradient = smokeCtx.createRadialGradient(64, 64, 3, 64, 64, 62);
  smokeGradient.addColorStop(0, "rgba(245,246,237,.42)");
  smokeGradient.addColorStop(0.45, "rgba(230,235,226,.22)");
  smokeGradient.addColorStop(1, "rgba(220,228,221,0)");
  smokeCtx.fillStyle = smokeGradient;
  smokeCtx.fillRect(0, 0, 128, 128);
  const smokeTexture = new THREE.CanvasTexture(smokeCanvas);
  const smokeSprites = [];
  for (let i = 0; i < 11; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    }));
    sprite.position.set(1.25, 1.65, (i % 3 - 1) * 0.05);
    sprite.scale.set(0.32, 0.32, 1);
    train.add(sprite);
    smokeSprites.push({ sprite, age: i / 11, seed: i * 1.71 });
  }

  train.position.set(-14, 2.7, -17);
  train.scale.setScalar(0.72);
  train.userData.wheels = wheelMeshes;
  train.userData.smoke = smokeSprites;
  scene.add(train);
  return train;
}

function createBench(scene, x, z) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x805d42, roughness: 0.72 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x5d402e, roughness: 0.8 });
  const linen = new THREE.MeshStandardMaterial({ color: 0xd8cdb6, roughness: 0.96 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xa88957, metalness: 0.5, roughness: 0.4 });

  const add = (geometry, material, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  for (let i = 0; i < 5; i++) {
    add(new RoundedBoxGeometry(1.72, 0.09, 0.13, 3, 0.025), wood, [0, 0.59, -0.26 + i * 0.13]);
  }
  for (const sx of [-0.72, 0.72]) {
    add(new RoundedBoxGeometry(0.12, 0.66, 0.13, 3, 0.025), edge, [sx, 0.33, -0.25]);
    add(new RoundedBoxGeometry(0.12, 0.66, 0.13, 3, 0.025), edge, [sx, 0.33, 0.34]);
    add(new RoundedBoxGeometry(0.12, 0.92, 0.13, 3, 0.025), edge, [sx, 0.89, -0.27]);
    add(new RoundedBoxGeometry(0.13, 0.11, 0.67, 3, 0.03), wood, [sx, 0.76, 0.02]);
  }
  for (let i = 0; i < 4; i++) {
    add(new RoundedBoxGeometry(0.09, 0.74, 0.08, 3, 0.02), wood, [-0.49 + i * 0.33, 1.02, -0.28]);
  }
  add(new RoundedBoxGeometry(1.18, 0.14, 0.42, 5, 0.07), linen, [0, 0.7, 0.03]);
  const pillow = add(new RoundedBoxGeometry(0.48, 0.2, 0.37, 5, 0.09), linen, [0.35, 0.89, -0.06]);
  pillow.rotation.z = -0.09;

  group.position.set(x, groundHeight(x, z), z);
  group.rotation.y = -0.18;
  scene.add(group);

  const table = new THREE.Group();
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.11, 0.68, 5, 0.06), wood);
  top.position.y = 0.92;
  top.castShadow = true;
  table.add(top);
  for (const sx of [-0.38, 0.38]) {
    for (const sz of [-0.23, 0.23]) {
      const leg = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.88, 0.085, 3, 0.02), edge);
      leg.position.set(sx, 0.46, sz);
      table.add(leg);
    }
  }
  const book = new THREE.Mesh(new RoundedBoxGeometry(0.39, 0.055, 0.27, 3, 0.018), brass);
  book.position.set(-0.08, 1.01, 0.02);
  book.rotation.y = 0.18;
  table.add(book);
  const pages = new THREE.Mesh(new RoundedBoxGeometry(0.37, 0.035, 0.255, 3, 0.012), linen);
  pages.position.set(-0.08, 1.05, 0.02);
  pages.rotation.y = 0.18;
  table.add(pages);
  table.position.set(x + 1.35, groundHeight(x + 1.35, z + 0.05), z + 0.05);
  scene.add(table);
  return { group, table };
}

function createLamp(scene, x, z) {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x938976, roughness: 0.88 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x493b2e, roughness: 0.76 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffdca3, emissive: 0xffb958, emissiveIntensity: 0.58,
    transparent: true, opacity: 0.82, roughness: 0.28,
  });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.17, 0.48, 3, 0.04), stone);
  base.position.y = 0.09;
  group.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.14, 1.25, 12), stone);
  post.position.y = 0.78;
  group.add(post);
  const collar = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.12, 0.35, 3, 0.04), darkWood);
  collar.position.y = 1.42;
  group.add(collar);
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.55, 0.52, 4, 0.04), glass);
  body.position.y = 1.77;
  group.add(body);
  for (const sx of [-0.23, 0.23]) {
    for (const sz of [-0.23, 0.23]) {
      const frame = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.64, 0.045, 2, 0.01), darkWood);
      frame.position.set(sx, 1.77, sz);
      group.add(frame);
    }
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.3, 4), darkWood);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.2;
  group.add(roof);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), brassMaterial());
  finial.position.y = 2.38;
  group.add(finial);
  group.position.set(x, groundHeight(x, z), z);
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(group);

  const glow = new THREE.PointLight(0xffc982, 0.9, 5, 2);
  glow.position.set(x, groundHeight(x, z) + 1.8, z);
  scene.add(glow);
  return group;
}

function brassMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xb28c56, metalness: 0.54, roughness: 0.42 });
}

function makeCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const lobes = [
    [72, 145, 52], [112, 112, 65], [158, 138, 60], [190, 155, 37], [46, 164, 32],
  ];
  for (const [x, y, r] of lobes) {
    const g = ctx.createRadialGradient(x, y, r * 0.08, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,.48)");
    g.addColorStop(0.62, "rgba(255,255,255,.25)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return new THREE.CanvasTexture(canvas);
}

function createSky(scene, rng) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(120, 36, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: [
        "varying vec3 vWorld;",
        "void main(){ vec4 p=modelMatrix*vec4(position,1.0); vWorld=p.xyz; gl_Position=projectionMatrix*viewMatrix*p; }",
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vWorld;",
        "void main(){",
        "float h=normalize(vWorld-cameraPosition).y;",
        "vec3 horizon=vec3(0.86,0.91,0.88);",
        "vec3 zenith=vec3(0.36,0.64,0.83);",
        "float t=smoothstep(-0.05,0.62,h);",
        "vec3 col=mix(horizon,zenith,t);",
        "col=mix(col,vec3(0.96,0.94,0.84),smoothstep(0.52,0.96,h)*0.17);",
        "gl_FragColor=vec4(col,1.0);",
        "}",
      ].join("\n"),
    }),
  );
  scene.add(sky);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff4d7 }),
  );
  sun.position.set(13, 18, -38);
  scene.add(sun);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const ctx = glowCanvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 63);
  g.addColorStop(0, "rgba(255,247,222,.58)");
  g.addColorStop(0.28, "rgba(255,241,205,.22)");
  g.addColorStop(1, "rgba(255,240,210,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false,
  }));
  glow.position.copy(sun.position);
  glow.scale.set(11, 11, 1);
  scene.add(glow);

  const clouds = [];
  const cloudTexture = makeCloudTexture();
  for (let i = 0; i < 7; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.48 + rng() * 0.16,
    }));
    sprite.position.set((rng() - 0.5) * 54, 9 + rng() * 10, -24 - rng() * 19);
    const width = 7 + rng() * 7;
    sprite.scale.set(width, width * (0.31 + rng() * 0.09), 1);
    scene.add(sprite);
    clouds.push({ sprite, speed: 0.08 + rng() * 0.045 });
  }
  return clouds;
}

function createAirPetals(scene, mobile, rng) {
  const count = mobile ? 52 : 112;
  const geometry = new THREE.ShapeGeometry(petalShapeForAir(), 5);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf2b9c4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.87,
    roughness: 0.9,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const states = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const state = {
      x: (rng() - 0.5) * 25,
      y: 1 + rng() * 9,
      z: -4 + rng() * 20,
      speed: 0.35 + rng() * 0.55,
      sway: rng() * Math.PI * 2,
      turn: (rng() - 0.5) * 2,
      size: 0.55 + rng() * 1.1,
    };
    states.push(state);
    dummy.position.set(state.x, state.y, state.z);
    dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    dummy.scale.setScalar(state.size);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return { mesh, states };
}

function petalShapeForAir() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.07, 0.025, -0.13, 0.13, 0, 0.24);
  shape.bezierCurveTo(0.13, 0.13, 0.07, 0.025, 0, 0);
  return shape;
}

export function mountHeroScene(canvas) {
  if (!canvas || !canvas.isConnected) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const rng = makeRng(202603);
  let renderer;
  let raf = 0;
  let disposed = false;
  let visible = true;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.error("Ember & Ink: WebGL could not be initialized.", error);
    canvas.dataset.sceneFallback = "true";
    return () => {};
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.55));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb9d7e5);
  scene.fog = new THREE.Fog(0xc6dce0, 34, 92);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 180);
  const target = new THREE.Vector3(0.2, 4.35, -7.5);
  camera.position.set(0.1, 9.6, 27);
  camera.lookAt(target);

  scene.add(new THREE.HemisphereLight(0xe4f3ff, 0x657c4e, 1.25));
  const ambient = new THREE.AmbientLight(0xfff5e5, 0.32);
  scene.add(ambient);
  const sunLight = new THREE.DirectionalLight(0xfff1d8, 2.25);
  sunLight.position.set(9, 20, 10);
  sunLight.castShadow = !mobile;
  sunLight.shadow.mapSize.set(mobile ? 512 : 1536, mobile ? 512 : 1536);
  sunLight.shadow.camera.left = -27;
  sunLight.shadow.camera.right = 27;
  sunLight.shadow.camera.top = 27;
  sunLight.shadow.camera.bottom = -27;
  sunLight.shadow.bias = -0.0003;
  scene.add(sunLight);

  const clouds = createSky(scene, rng);
  createRidge(scene, { centerX: -9, centerZ: -36, width: 58, depth: 19, height: 5.3, color: 0x789a83, peakShift: -0.15, seed: 8 });
  createRidge(scene, { centerX: 11, centerZ: -42, width: 56, depth: 20, height: 7.1, color: 0x8ba99a, peakShift: 0.24, seed: 12 });
  createRidge(scene, { centerX: -1, centerZ: -50, width: 74, depth: 17, height: 4.2, color: 0xb2c2b8, peakShift: 0.02, seed: 17 });

  const terrain = createTerrain(scene, mobile, rng);
  const river = createRiver(scene);
  createBridge(scene, rng);
  const train = createTrain(scene);
  const fallbackTrainEngine = train.children[0];
  const tree = createTree(scene, mobile, rng);
  let importedTree = null;
  let importedTrainEngine = null;

  // Replace the two most visually recognisable hero silhouettes with actual
  // GLB assets when the CDN is reachable. The handcrafted models remain as
  // resilient fallbacks, so a CDN outage never blanks the environment.
  loadExternalModel(
    "https://polyfork.dev/cdn/cherry-tree-a710a9.glb",
    (model) => {
      if (disposed) {
        disposeObject3D(model);
        return;
      }
      model.scale.setScalar(1.22);
      model.position.set(5.2, groundHeight(5.2, 0.8), 0.8);
      model.rotation.y = -0.12;
      tree.visible = false;
      importedTree = model;
      scene.add(model);
    },
  );

  loadExternalModel(
    "https://polyfork.dev/cdn/train-engine-180979.glb",
    (model) => {
      if (disposed) {
        disposeObject3D(model);
        return;
      }
      model.scale.setScalar(0.72);
      model.position.set(0.4, 0, 0);
      fallbackTrainEngine.visible = false;
      importedTrainEngine = model;
      train.add(model);
    },
  );

  const readingCorner = createBench(scene, 5.95, 3.6);
  const lamp = createLamp(scene, 8.15, 3.9);
  const airPetals = createAirPetals(scene, mobile, rng);

  // A few low-opacity sun shafts add atmosphere without turning the morning into fantasy lighting.
  const shafts = new THREE.Group();
  const shaftMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff5d9, transparent: true, opacity: 0.045,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < 3; i++) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.15 + i * 0.35, 16), shaftMaterial);
    beam.position.set(4.2 + i * 1.7, 7.4, -1.5 - i * 0.6);
    beam.rotation.z = -0.28 + i * 0.12;
    shafts.add(beam);
  }
  scene.add(shafts);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (event) => {
    pointer.tx = ((event.clientX / window.innerWidth) - 0.5) * 2;
    pointer.ty = ((event.clientY / window.innerHeight) - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const onVisibility = () => { visible = document.visibilityState === "visible"; };
  document.addEventListener("visibilitychange", onVisibility);

  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    camera.aspect = width / height;
    camera.fov = mobile ? 52 : 43;
    camera.position.x = mobile ? 1.7 : 0.1;
    camera.position.z = mobile ? 31 : 27;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const clock = new THREE.Clock();
  const dummy = new THREE.Object3D();
  const animate = () => {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.04);
    const t = clock.elapsedTime;

    if (!reducedMotion) {
      river.material.uniforms.uTime.value = t;
      tree.rotation.z = Math.sin(t * 0.42) * 0.012;
      if (importedTree) importedTree.rotation.z = Math.sin(t * 0.42) * 0.009;
      terrain.grass.rotation.z = Math.sin(t * 0.62) * 0.006;
      pointer.x = lerp(pointer.x, pointer.tx, 0.025);
      pointer.y = lerp(pointer.y, pointer.ty, 0.025);
      camera.position.x = (mobile ? 1.7 : 0.1) + pointer.x * (mobile ? 0.12 : 0.42);
      camera.position.y = 9.6 + pointer.y * 0.13;
      camera.lookAt(target.x + pointer.x * 0.28, target.y - pointer.y * 0.12, target.z);

      train.position.x = -14 + ((t * 0.92) % 28);
      for (const wheel of train.userData.wheels) wheel.rotation.z -= dt * 3.1;
      for (const puff of train.userData.smoke) {
        puff.age += dt * 0.23;
        if (puff.age > 1) {
          puff.age = 0;
          puff.sprite.position.set(1.25 + (rng() - 0.5) * 0.12, 1.63, (rng() - 0.5) * 0.12);
        }
        const p = puff.age;
        puff.sprite.position.x += dt * (0.14 + puff.seed * 0.012);
        puff.sprite.position.y += dt * (0.38 + p * 0.16);
        puff.sprite.scale.setScalar(0.18 + p * 0.62);
        puff.sprite.material.opacity = Math.sin(p * Math.PI) * 0.28;
      }

      for (const cloud of clouds) {
        cloud.sprite.position.x += cloud.speed * dt;
        if (cloud.sprite.position.x > 34) cloud.sprite.position.x = -34;
      }

      for (let i = 0; i < airPetals.states.length; i++) {
        const p = airPetals.states[i];
        p.y -= dt * p.speed * 0.42;
        p.x += dt * (Math.sin(t * 0.5 + p.sway) * 0.18 + 0.08);
        p.sway += dt * 0.75;
        p.turn += dt * (0.35 + p.speed * 0.22);
        if (p.y < groundHeight(p.x, p.z) + 0.25) {
          p.y = 7 + rng() * 5;
          p.x = (rng() - 0.5) * 25;
          p.z = -3 + rng() * 17;
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(Math.sin(p.turn) * 0.9, p.turn * 0.6, p.turn);
        dummy.scale.setScalar(p.size);
        dummy.updateMatrix();
        airPetals.mesh.setMatrixAt(i, dummy.matrix);
      }
      airPetals.mesh.instanceMatrix.needsUpdate = true;
      shafts.rotation.z = Math.sin(t * 0.08) * 0.012;
    }

    renderer.render(scene, camera);
  };
  animate();

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("visibilitychange", onVisibility);
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          for (const value of Object.values(material)) {
            if (value && value.isTexture) value.dispose();
          }
          material.dispose();
        });
      }
    });
    if (importedTree && importedTree.parent) importedTree.parent.remove(importedTree);
    if (importedTrainEngine && importedTrainEngine.parent) importedTrainEngine.parent.remove(importedTrainEngine);
    renderer.dispose();
  };

  window.addEventListener("pagehide", cleanup, { once: true });
  return cleanup;
}
