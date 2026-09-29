import * as THREE from 'three';
import gsap from 'gsap';

type Handle = { dispose: () => void };

export function mountChurch(canvas: HTMLCanvasElement): Handle {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 767px)').matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
  renderer.setClearColor(0xcfe0f2, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe0f2, 9, 18);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0.85, 2.15, 9.8);
  camera.lookAt(0, 1.35, 0);

  const hemi = new THREE.HemisphereLight(0xe8f2fc, 0xe7d3b8, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3df, 1.55);
  sun.position.set(4.5, 7.5, 5);
  sun.castShadow = !mobile;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 18;
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  scene.add(sun);

  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const plaster = mat({ color: 0xf4e6d4, roughness: 0.88 });
  const roof = mat({ color: 0xd0754f, roughness: 0.7 });
  const wood = mat({ color: 0x6b3e28, roughness: 0.82 });
  const glass = mat({
    color: 0x8fb4db,
    roughness: 0.12,
    metalness: 0.04,
    emissive: 0x4f7fc2,
    emissiveIntensity: 0.18,
  });
  const gold = mat({
    color: 0xe0b04c,
    metalness: 0.55,
    roughness: 0.32,
    emissive: 0xe0b04c,
    emissiveIntensity: 0.22,
  });
  const stone = mat({ color: 0xdccbb6, roughness: 0.96 });
  const leafMat = mat({ color: 0x6f7c46, roughness: 0.92 });
  const trunkMat = mat({ color: 0x8a5a32, roughness: 0.9 });
  const groundMat = mat({ color: 0xe4d2b8, roughness: 1 });
  const cloudMat = mat({ color: 0xfffaf4, roughness: 1, transparent: true, opacity: 0.72 });

  function mat(params: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(params);
    mats.push(material);
    return material;
  }

  function mesh(geo: THREE.BufferGeometry, material: THREE.Material, shadows = true) {
    geos.push(geo);
    const item = new THREE.Mesh(geo, material);
    item.castShadow = shadows;
    item.receiveShadow = shadows;
    return item;
  }

  const church = new THREE.Group();
  scene.add(church);

  const ground = mesh(new THREE.CircleGeometry(7.5, 48), groundMat, false);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  church.add(ground);

  const nave = mesh(new THREE.BoxGeometry(2.7, 1.75, 3.5), plaster);
  nave.position.set(0, 0.88, 0);
  church.add(nave);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-1.38, 0);
  gableShape.lineTo(1.38, 0);
  gableShape.lineTo(0, 1.12);
  const gable = mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.16, bevelEnabled: false }), plaster);
  gable.position.set(0, 1.75, 1.68);
  church.add(gable);

  const slope = Math.atan2(1.05, 1.4);
  const span = Math.hypot(1.4, 1.05);
  const leftRoof = mesh(new THREE.BoxGeometry(span, 0.1, 3.85), roof);
  leftRoof.position.set(-0.7, 2.22, 0);
  leftRoof.rotation.z = slope;
  const rightRoof = mesh(new THREE.BoxGeometry(span, 0.1, 3.85), roof);
  rightRoof.position.set(0.7, 2.22, 0);
  rightRoof.rotation.z = -slope;
  church.add(leftRoof, rightRoof);

  const ridge = mesh(new THREE.BoxGeometry(0.12, 0.1, 3.9), roof);
  ridge.position.set(0, 2.72, 0);
  church.add(ridge);

  const door = new THREE.Group();
  const slab = mesh(new THREE.BoxGeometry(0.52, 0.86, 0.08), wood);
  slab.position.y = 0.43;
  const cap = mesh(new THREE.CircleGeometry(0.26, 22, 0, Math.PI), wood);
  cap.position.y = 0.86;
  door.add(slab, cap);
  door.position.set(0, 0, 1.82);
  church.add(door);

  const rose = new THREE.Group();
  rose.add(mesh(new THREE.CircleGeometry(0.24, 28), glass, false));
  rose.add(mesh(new THREE.TorusGeometry(0.24, 0.028, 8, 28), gold, false));
  rose.add(mesh(new THREE.BoxGeometry(0.02, 0.48, 0.02), gold, false));
  const roseBar = mesh(new THREE.BoxGeometry(0.48, 0.02, 0.02), gold, false);
  rose.add(roseBar);
  rose.position.set(0, 2.22, 1.88);
  church.add(rose);

  const tower = mesh(new THREE.BoxGeometry(0.78, 2.55, 0.78), plaster);
  tower.position.set(-1.62, 1.28, 1.15);
  church.add(tower);
  const belfry = mesh(new THREE.BoxGeometry(0.36, 0.46, 0.12), mat({ color: 0x24406b, roughness: 0.6 }), false);
  belfry.position.set(-1.62, 2.02, 1.5);
  church.add(belfry);

  const spire = mesh(new THREE.ConeGeometry(0.56, 0.7, 4), roof);
  spire.position.set(-1.62, 2.9, 1.15);
  spire.rotation.y = Math.PI / 4;
  church.add(spire);

  const bellPivot = new THREE.Group();
  bellPivot.position.set(-1.62, 2.18, 1.56);
  const bell = mesh(new THREE.SphereGeometry(0.08, 14, 12), gold);
  bell.scale.set(1, 1.35, 1);
  bell.position.y = -0.1;
  bellPivot.add(bell);
  church.add(bellPivot);

  const cross = new THREE.Group();
  cross.add(mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), gold));
  const arm = mesh(new THREE.BoxGeometry(0.26, 0.07, 0.07), gold);
  arm.position.y = 0.08;
  cross.add(arm);
  cross.position.set(-1.62, 3.42, 1.15);
  church.add(cross);

  const facadeCross = cross.clone();
  facadeCross.position.set(0, 2.95, 1.7);
  facadeCross.scale.setScalar(0.72);
  church.add(facadeCross);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const win = new THREE.Group();
      win.add(mesh(new THREE.CircleGeometry(0.15, 18), glass, false));
      win.add(mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 18), gold, false));
      win.position.set(side * 1.36, 1.02, -0.85 + i * 0.75);
      win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      church.add(win);
    }
  }

  const steps: Array<[number, number, number, number]> = [
    [1.25, 0.08, 0.36, 2.22],
    [1.02, 0.08, 0.3, 1.98],
    [0.82, 0.08, 0.24, 1.78],
  ];
  steps.forEach(([w, h, d, z], index) => {
    const step = mesh(new THREE.BoxGeometry(w, h, d), stone);
    step.position.set(0, 0.04 + index * 0.08, z);
    church.add(step);
  });

  function olive(x: number, z: number, scale: number) {
    const tree = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 8), trunkMat);
    trunk.position.y = 0.35;
    tree.add(trunk);
    [
      [0, 0.95, 0, 0.38],
      [0.22, 0.82, 0.08, 0.28],
      [-0.2, 0.8, -0.05, 0.26],
    ].forEach(([ox, oy, oz, r]) => {
      const crown = mesh(new THREE.SphereGeometry(r, 12, 10), leafMat);
      crown.position.set(ox, oy, oz);
      tree.add(crown);
    });
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    church.add(tree);
  }
  olive(-2.7, 0.4, 1.15);
  olive(2.55, -0.2, 1);
  olive(2.15, 1.6, 0.75);

  const clouds = [-2.8, 1.6].map((x, index) => {
    const puff = new THREE.Group();
    [0, 0.32, -0.28].forEach((ox, i) => {
      const ball = mesh(new THREE.SphereGeometry(0.28 - i * 0.04, 10, 8), cloudMat, false);
      ball.position.x = ox;
      puff.add(ball);
    });
    puff.position.set(x, 3.3 + index * 0.25, -2.4);
    scene.add(puff);
    return puff;
  });

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  const pointer = new THREE.Vector2();
  const onPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  canvas.addEventListener('pointermove', onPointer);

  let running = true;
  const io = new IntersectionObserver(([entry]) => {
    running = entry.isIntersecting;
  }, { threshold: 0.08 });
  io.observe(canvas);

  const intro = { v: reduced ? 0.28 : -0.45 };
  let yaw = intro.v;
  if (!reduced) {
    gsap.to(intro, {
      v: 0.28,
      duration: 2.1,
      ease: 'power3.out',
      onUpdate() {
        yaw = intro.v;
      },
    });
    gsap.fromTo(camera.position, { z: 12 }, { z: 9.8, duration: 2.4, ease: 'power2.out' });
  }

  let raf = 0;
  const start = performance.now();
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!running && !reduced) return;
    const t = (now - start) / 1000;
    if (!reduced) {
      church.rotation.y = yaw + Math.sin(t * 0.35) * 0.22 + pointer.x * 0.28;
      church.rotation.x = pointer.y * -0.04;
      bellPivot.rotation.z = Math.sin(t * 1.7) * 0.22;
      gold.emissiveIntensity = 0.18 + Math.sin(t * 1.3) * 0.08;
      clouds.forEach((puff, index) => {
        puff.position.x += 0.0015 + index * 0.0004;
        if (puff.position.x > 4.2) puff.position.x = -4.2;
      });
    } else {
      church.rotation.y = yaw;
    }
    renderer.render(scene, camera);
    if (reduced) cancelAnimationFrame(raf);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      gsap.killTweensOf(intro);
      gsap.killTweensOf(camera.position);
      io.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointer);
      geos.forEach((geo) => geo.dispose());
      mats.forEach((material) => material.dispose());
      renderer.dispose();
    },
  };
}
