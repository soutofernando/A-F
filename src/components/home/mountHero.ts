import * as THREE from 'three';
import { subscribeHeroDolly } from '@/lib/hero-bridge';

type Handle = {
  dispose: () => void;
  burst: () => void;
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uProgress;
  uniform vec2 uPointer;
  uniform float uGlow;
  uniform vec2 uCross;
  uniform float uWater;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform float uReady;
  uniform float uDolly;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  vec2 coverUv(vec2 uv) {
    float sr = uRes.x / max(uRes.y, 1.0);
    float ir = uImg.x / max(uImg.y, 1.0);
    vec2 nuv = uv;
    if (sr > ir) {
      float scale = sr / ir;
      nuv.y = (uv.y - 0.5) / scale + 0.5;
    } else {
      float scale = ir / sr;
      nuv.x = (uv.x - 0.5) / scale + 0.5;
    }
    return nuv;
  }

  void main() {
    if (uReady < 0.5) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec2 base = coverUv(vUv);
    vec2 door = vec2(0.50, 0.46);
    vec2 zoomed = mix(base, door, uDolly * 0.34);
    float edge = smoothstep(0.12, 0.62, abs(base.x - 0.5));
    float sky = smoothstep(0.52, 0.92, base.y);
    float depth = mix(0.18, 1.0, max(edge, sky * 0.55));
    vec2 parallax = uPointer * 0.02 * depth;
    parallax.x += sign(base.x - 0.5) * uDolly * edge * 0.07;
    vec2 uv = clamp(zoomed + parallax, 0.001, 0.999);

    if (uWater > 0.5 && uv.y < 0.2) {
      float w = (0.2 - uv.y) / 0.2;
      uv.x += sin(uv.x * 16.0 + uTime * 1.1) * 0.0045 * w;
      uv.y += cos(uv.x * 12.0 + uTime * 0.8) * 0.003 * w;
    }
    uv = clamp(uv, 0.001, 0.999);
    float dist = length(base - 0.5);
    float ca = pow(dist, 1.4) * 0.006;
    vec3 col = vec3(
      texture2D(uMap, clamp(uv + vec2(ca, 0.0), 0.001, 0.999)).r,
      texture2D(uMap, uv).g,
      texture2D(uMap, clamp(uv - vec2(ca, 0.0), 0.001, 0.999)).b
    );
    float n = fbm(base * 3.2);
    float front = uProgress * 1.35 - (dist * 0.9 + (n - 0.45) * 0.42);
    float reveal = smoothstep(0.0, 0.16, front);
    float inkEdge = smoothstep(0.18, 0.0, abs(front)) * (1.0 - smoothstep(0.98, 1.05, uProgress));
    vec3 ink = mix(col, vec3(0.31, 0.49, 0.76), 0.45);
    col = mix(col, ink, inkEdge * 0.85);

    vec2 crossUv = uCross;
    float d = length(uv - crossUv);
    float halo = exp(-d * 26.0) * uGlow;
    float ang = atan(uv.y - crossUv.y, uv.x - crossUv.x);
    float rays = pow(max(sin(ang * 5.0), 0.0), 10.0) * exp(-d * 8.0) * uGlow * 0.35;
    col += vec3(0.878, 0.690, 0.298) * (halo + rays);
    float vig = smoothstep(0.42, 1.05, dist);
    col = mix(col, col * vec3(0.78, 0.72, 0.62), vig * 0.45);

    gl_FragColor = vec4(col, reveal);
  }
`;

function petalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55);
  shape.bezierCurveTo(0.42, 0.22, 0.32, -0.18, 0, -0.42);
  shape.bezierCurveTo(-0.32, -0.18, -0.42, 0.22, 0, 0.55);
  return new THREE.ShapeGeometry(shape);
}

function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.5);
  shape.bezierCurveTo(0.35, 0.2, 0.28, -0.15, 0, -0.5);
  shape.bezierCurveTo(-0.28, -0.15, -0.35, 0.2, 0, 0.5);
  return new THREE.ShapeGeometry(shape);
}

type MountOpts = { compact?: boolean };

export function mountHero(canvas: HTMLCanvasElement, mobile: boolean, opts: MountOpts = {}): Handle {
  const compact = opts.compact ?? false;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  });
  const maxDpr = compact ? 1.25 : mobile ? 1.25 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);

  const uniforms = {
    uMap: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uGlow: { value: 0.45 },
    uCross: { value: new THREE.Vector2(0.507, 0.762) },
    uWater: { value: 1 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uImg: { value: new THREE.Vector2(2752, 1536) },
    uReady: { value: 0 },
    uDolly: { value: 0 },
  };

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
  }));
  scene.add(quad);

  const dustCount = compact ? (mobile ? 36 : 56) : mobile ? 80 : 140;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 0.7;
    dustPos[i * 3 + 1] = Math.random() * 1.2 - 0.2;
    dustPos[i * 3 + 2] = 0;
    dustSeed[i] = Math.random();
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xe0b04c,
    size: mobile ? 3.2 : 2.4,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  const splashCount = compact ? (mobile ? 18 : 28) : mobile ? 32 : 50;
  const splashGeo = new THREE.BufferGeometry();
  const splashPos = new Float32Array(splashCount * 3);
  for (let i = 0; i < splashCount; i++) {
    splashPos[i * 3] = (Math.random() - 0.5) * 1.8;
    splashPos[i * 3 + 1] = Math.random() * 0.8 + 0.1;
    splashPos[i * 3 + 2] = 0;
  }
  splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
  const splash = new THREE.Points(
    splashGeo,
    new THREE.PointsMaterial({
      color: 0x8fb4db,
      size: 2.2,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      sizeAttenuation: false,
    }),
  );
  scene.add(splash);

  const leafCount = compact ? (mobile ? 10 : 14) : mobile ? 18 : 28;
  const leafGeo = leafGeometry();
  const leafMat = new THREE.MeshBasicMaterial({
    color: 0x8e9a5b,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  const dummy = new THREE.Object3D();
  const leafState = Array.from({ length: leafCount }, () => ({
    x: (Math.random() - 0.5) * 1.7,
    y: Math.random() * 2.2,
    s: 0.035 + Math.random() * 0.04,
    spin: Math.random() * Math.PI,
    speed: 0.04 + Math.random() * 0.05,
    sway: 0.4 + Math.random() * 1.2,
    gold: Math.random() > 0.55,
  }));
  const goldMat = new THREE.MeshBasicMaterial({
    color: 0xe0b04c,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const goldLeaves = new THREE.InstancedMesh(leafGeo, goldMat, leafCount);
  scene.add(leaves);
  scene.add(goldLeaves);

  const petalCount = compact ? (mobile ? 6 : 10) : mobile ? 10 : 22;
  const petalGeo = petalGeometry();
  const petalMat = new THREE.MeshBasicMaterial({
    color: 0xfffcf8,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  const petalState = Array.from({ length: petalCount }, () => ({
    x: (Math.random() - 0.5) * 1.8,
    y: Math.random() * 2.4 - 0.2,
    z: (Math.random() - 0.5) * 0.4,
    s: 0.045 + Math.random() * 0.05,
    spin: Math.random() * Math.PI,
    speed: 0.03 + Math.random() * 0.035,
    sway: 0.35 + Math.random() * 0.8,
  }));
  scene.add(petals);

  let dolly = 0;
  const unsubDolly = compact
    ? () => undefined
    : subscribeHeroDolly((value) => {
        dolly = value;
      });

  const burstCount = compact ? (mobile ? 28 : 40) : mobile ? 48 : 70;
  const burstGeo = new THREE.BufferGeometry();
  const burstPos = new Float32Array(burstCount * 3);
  const burstVel: Array<[number, number]> = [];
  for (let i = 0; i < burstCount; i++) {
    burstPos[i * 3] = 0.02;
    burstPos[i * 3 + 1] = 0.45;
    burstPos[i * 3 + 2] = 0;
    burstVel.push([(Math.random() - 0.5) * 0.35, 0.15 + Math.random() * 0.45]);
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  const burstPoints = new THREE.Points(
    burstGeo,
    new THREE.PointsMaterial({
      color: 0xe0b04c,
      size: 3.4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: false,
    }),
  );
  scene.add(burstPoints);

  let texture: THREE.Texture | null = null;
  const loader = new THREE.TextureLoader();
  loader.load('/igreja.webp', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;
    texture = tex;
    uniforms.uMap.value = tex;
    const img = tex.image as { width: number; height: number };
    if (img?.width) uniforms.uImg.value.set(img.width, img.height);
    uniforms.uReady.value = 1;
  });

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  };
  resize();
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  const pointerTarget = new THREE.Vector2();
  let userAimed = false;
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointerTarget.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerTarget.y = -((event.clientY - rect.top) / rect.height - 0.5) * 2;
    userAimed = true;
  };
  const onTilt = (event: DeviceOrientationEvent) => {
    if (event.gamma == null || event.beta == null) return;
    pointerTarget.x = THREE.MathUtils.clamp(event.gamma / 28, -1, 1);
    pointerTarget.y = THREE.MathUtils.clamp((event.beta - 40) / 30, -1, 1);
    userAimed = true;
  };
  const askTilt = () => {
    const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<PermissionState | string>;
    };
    if (typeof orientation.requestPermission === 'function') {
      orientation.requestPermission().then((state) => {
        if (state === 'granted') window.addEventListener('deviceorientation', onTilt);
      }).catch(() => undefined);
    }
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('deviceorientation', onTilt);
  window.addEventListener('pointerdown', askTilt, { once: true });

  let inView = true;
  let pageVisible = !document.hidden;
  const syncRun = () => {
    running = inView && pageVisible;
  };
  let running = true;
  let revealStart: number | null = compact ? null : performance.now();
  const io = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (compact && entry.isIntersecting && revealStart === null) {
        revealStart = performance.now();
      }
      syncRun();
    },
    { threshold: 0.12 },
  );
  io.observe(canvas);
  const onVisibility = () => {
    pageVisible = !document.hidden;
    syncRun();
  };
  document.addEventListener('visibilitychange', onVisibility);

  let raf = 0;
  const start = performance.now();
  let burstUntil = 0;
  const baseGlow = compact ? 0.38 : 0.45;
  const revealDuration = compact ? 1.8 : 2.5;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const clockStart = compact ? revealStart ?? start : start;
    const t = (now - clockStart) / 1000;
    uniforms.uTime.value = (now - start) / 1000;
    if (compact && revealStart === null) {
      uniforms.uProgress.value = 0;
    } else {
      const revealT = Math.min(1, Math.max(0, t) / revealDuration);
      uniforms.uProgress.value = revealT * revealT * (3 - 2 * revealT);
    }
    if (!userAimed) {
      pointerTarget.x = Math.sin(t * 0.28) * 0.55;
      pointerTarget.y = Math.cos(t * 0.2) * 0.22;
    }
    uniforms.uPointer.value.lerp(pointerTarget, 0.04);
    if (!compact) {
      uniforms.uDolly.value += (dolly - uniforms.uDolly.value) * 0.08;
    }

    const positions = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustCount; i++) {
      const y = positions.getY(i) + 0.0016 + dustSeed[i] * 0.001;
      positions.setY(i, y > 0.85 ? -0.15 : y);
      positions.setX(i, dustPos[i * 3] + Math.sin(t * 0.6 + dustSeed[i] * 6) * 0.03);
    }
    positions.needsUpdate = true;

    leafState.forEach((leaf, i) => {
      leaf.y -= leaf.speed * 0.008;
      if (leaf.y < -1.15) leaf.y = 1.15;
      leaf.spin += 0.01;
      dummy.position.set(leaf.x + Math.sin(t * leaf.sway + i) * 0.08, leaf.y, 0);
      dummy.rotation.z = leaf.spin;
      dummy.scale.setScalar(leaf.s);
      dummy.updateMatrix();
      if (leaf.gold) {
        goldLeaves.setMatrixAt(i, dummy.matrix);
        leaves.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      } else {
        leaves.setMatrixAt(i, dummy.matrix);
        goldLeaves.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      }
    });
    leaves.instanceMatrix.needsUpdate = true;
    goldLeaves.instanceMatrix.needsUpdate = true;

    petalState.forEach((petal, i) => {
      petal.y -= petal.speed * 0.008;
      if (petal.y < -1.2) petal.y = 1.2;
      petal.spin += 0.008;
      const far = Math.abs(petal.z);
      dummy.position.set(petal.x + Math.sin(t * petal.sway + i) * 0.1, petal.y, petal.z);
      dummy.rotation.z = petal.spin;
      dummy.rotation.y = Math.sin(t * 0.4 + i) * 0.6;
      dummy.scale.setScalar(petal.s * (1.15 - far));
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;

    if (now < burstUntil) {
      const attr = burstGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < burstCount; i++) {
        attr.setX(i, attr.getX(i) + burstVel[i][0] * 0.01);
        attr.setY(i, attr.getY(i) + burstVel[i][1] * 0.012);
      }
      attr.needsUpdate = true;
      burstPoints.material.opacity = Math.max(0, (burstUntil - now) / 2000);
      uniforms.uGlow.value = 1.35;
    } else {
      uniforms.uGlow.value += (baseGlow + Math.sin(t * 1.3) * 0.12 - uniforms.uGlow.value) * 0.08;
      burstPoints.material.opacity = 0;
    }

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return {
    burst() {
      burstUntil = performance.now() + 2000;
      const attr = burstGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < burstCount; i++) {
        attr.setXYZ(i, 0.02 + (Math.random() - 0.5) * 0.08, 0.42, 0);
        burstVel[i][0] = (Math.random() - 0.5) * 0.55;
        burstVel[i][1] = 0.2 + Math.random() * 0.7;
        if (i % 3 === 0) burstPoints.material.color.set(0x8fb4db);
        else burstPoints.material.color.set(0xe0b04c);
      }
      attr.needsUpdate = true;
    },
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onTilt);
      window.removeEventListener('pointerdown', askTilt);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubDolly();
      quad.geometry.dispose();
      (quad.material as THREE.Material).dispose();
      dustGeo.dispose();
      dustMat.dispose();
      splashGeo.dispose();
      (splash.material as THREE.Material).dispose();
      leafGeo.dispose();
      leafMat.dispose();
      goldMat.dispose();
      petalGeo.dispose();
      petalMat.dispose();
      burstGeo.dispose();
      (burstPoints.material as THREE.Material).dispose();
      texture?.dispose();
      renderer.dispose();
    },
  };
}
