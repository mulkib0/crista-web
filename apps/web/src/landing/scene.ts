/**
 * 첫 화면 장면 — 히어로 변주판 20.02 '박막 무지개'(유리 리본 갈래 2번)를 값 그대로 옮겼다.
 * 페이퍼 바탕 위 투명 리본(접힌 단백질 사슬)의 가장자리에 박막 간섭색이 흐르고, 포인터를 따라 기울며 끌면 돈다.
 * 변주판은 three r149 의 색 처리(색 관리 없음)로 그렸다 — 같은 색이 나오도록 색 관리를 끈다.
 */
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  ColorManagement,
  Color,
  FrontSide,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
  type Side,
} from 'three';

const PAPER = 0xf1f1e9;

/* ---------- 수학 도구 ---------- */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  const r = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sphere = (rad = 1) => {
    const z = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    return new Vector3(s * Math.cos(th) * rad, z * rad, s * Math.sin(th) * rad);
  };
  return { sphere };
}
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};

/* ---------- 단백질 모양 ----------
 * plan: H=알파 나선(잔기 100° · 상승 1.5 Å · 반지름 2.3 Å), E=베타 가닥(3.3 Å 지그재그), L=고리.
 * 고리는 중심 쪽으로 휘어 돌아와 전체가 둥글게 뭉친다. 결과는 반지름 1로 맞춘다. */
type SS = 'H' | 'E' | 'L';
const PLAN = 'L3 H14 L5 E7 L4 E7 L5 H16 L4 E6 L5 H12 L3';

function fold(seed: number) {
  const r = rng(seed);
  const pts: Vector3[] = [], ss: SS[] = [];
  let pos = new Vector3(), dir = r.sphere(1);
  const Y = new Vector3(0, 1, 0), X = new Vector3(1, 0, 0);
  for (const tok of PLAN.split(' ')) {
    const kind = tok[0], n = Number(tok.slice(1));
    const u = new Vector3().crossVectors(dir, Math.abs(dir.y) < 0.9 ? Y : X).normalize();
    const v = new Vector3().crossVectors(dir, u);
    if (kind === 'H') {
      const axis = pos.clone().addScaledVector(u, -2.3);
      for (let i = 0; i < n; i++) {
        const a = i * 1.745;
        pts.push(axis.clone().addScaledVector(dir, i * 1.5).addScaledVector(u, Math.cos(a) * 2.3).addScaledVector(v, Math.sin(a) * 2.3));
        ss.push('H');
      }
    } else if (kind === 'E') {
      for (let i = 0; i < n; i++) {
        pts.push(pos.clone().addScaledVector(dir, i * 3.3 + 1.6).addScaledVector(v, i % 2 ? 0.5 : -0.5));
        ss.push('E');
      }
    } else {
      for (let i = 0; i < n; i++) {
        const toC = pos.lengthSq() > 1e-4 ? pos.clone().negate().normalize() : r.sphere(1);
        dir.lerp(toC, 0.32).add(r.sphere(0.55)).normalize();
        pos = pos.clone().addScaledVector(dir, 3.6);
        pts.push(pos.clone());
        ss.push('L');
      }
    }
    pos = pts[pts.length - 1]!.clone();
    const toC = pos.lengthSq() > 1e-4 ? pos.clone().negate().normalize() : r.sphere(1);
    dir = toC.multiplyScalar(0.72).add(r.sphere(0.85)).normalize();
  }
  const c = new Vector3();
  pts.forEach((p) => c.add(p));
  c.divideScalar(pts.length);
  let m = 0;
  pts.forEach((p) => {
    p.sub(c);
    m = Math.max(m, p.length());
  });
  pts.forEach((p) => p.multiplyScalar(1 / (m || 1)));
  return { pts, ss };
}

/* ---------- 리본(카툰) 지오메트리 ----------
 * 나선과 가닥은 넓고 얇은 띠, 고리는 가는 관, 가닥 끝은 화살촉. aT 속성은 사슬 위치(0→1). */
const WIDTH: Record<SS, [number, number]> = { H: [0.085, 0.016], E: [0.1, 0.018], L: [0.02, 0.02] };

function ribbon({ pts, ss }: ReturnType<typeof fold>, scale: number) {
  const n = pts.length, seg = 10, radial = 14;
  const curve = new CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const M = (n - 1) * seg + 1;
  const P: Vector3[] = [];
  for (let i = 0; i < M; i++) P.push(curve.getPoint(i / (M - 1)));
  const Tg: Vector3[] = [], N: Vector3[] = [], B: Vector3[] = [];
  for (let i = 0; i < M; i++) Tg.push(P[Math.min(M - 1, i + 1)]!.clone().sub(P[Math.max(0, i - 1)]!).normalize());
  for (let i = 0; i < M; i++) {
    const t = Tg[i]!;
    let nv = P[Math.max(0, i - seg)]!.clone().add(P[Math.min(M - 1, i + seg)]!).sub(P[i]!.clone().multiplyScalar(2));
    nv.addScaledVector(t, -nv.dot(t));
    if (nv.lengthSq() < 1e-10) nv = i ? N[i - 1]!.clone() : new Vector3(0, 1, 0).cross(t);
    nv.normalize();
    if (i && nv.dot(N[i - 1]!) < 0) nv.negate();
    if (i) nv.lerp(N[i - 1]!, 0.55).addScaledVector(t, -nv.dot(t)).normalize();
    N.push(nv);
    B.push(new Vector3().crossVectors(t, nv).normalize());
  }
  const pos = new Float32Array(M * radial * 3), nor = new Float32Array(M * radial * 3), at = new Float32Array(M * radial);
  const tmp = new Vector3(), nn = new Vector3();
  for (let i = 0; i < M; i++) {
    const rr = i / seg, i0 = Math.floor(rr), i1 = Math.min(n - 1, i0 + 1), f = rr - i0;
    const w0 = WIDTH[ss[i0]!], w1 = WIDTH[ss[i1]!];
    let w = lerp(w0[0], w1[0], smooth(f)), h = lerp(w0[1], w1[1], smooth(f));
    if (ss[i0] === 'E' && ss[i1] !== 'E') {
      w = lerp(0.17, 0.02, f);
      h = 0.018;
    }
    w *= scale;
    h *= scale;
    for (let j = 0; j < radial; j++) {
      const ang = (j / radial) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
      tmp.copy(P[i]!).addScaledVector(B[i]!, ca * w).addScaledVector(N[i]!, sa * h);
      nn.set(0, 0, 0).addScaledVector(B[i]!, ca / w).addScaledVector(N[i]!, sa / h).normalize();
      const k = (i * radial + j) * 3;
      pos.set([tmp.x, tmp.y, tmp.z], k);
      nor.set([nn.x, nn.y, nn.z], k);
      at[i * radial + j] = i / (M - 1);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < M - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial);
      idx.push(a, a + radial, b, b, a + radial, b + radial);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('aT', new BufferAttribute(at, 1));
  g.setIndex(idx);
  return g;
}

/* ---------- 박막 유리 셰이더 ----------
 * 변주판 공용 유리 셰이더에서 이 변주가 켜는 것(프레넬 · 박막 간섭색 · 하이라이트)만 남겼다. */
const GLASS_VS = `
  attribute float aT;
  varying vec3 vN; varying vec3 vV; varying float vT;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * w;
    vN = normalize((viewMatrix * vec4(normalize(mat3(modelMatrix) * normal), 0.0)).xyz);
    vV = -mv.xyz; vT = aT;
    gl_Position = projectionMatrix * mv;
  }`;
const GLASS_FS = `
  uniform vec3 uTint; uniform vec3 uEdge;
  uniform float uBase; uniform float uEdgeA; uniform float uPow; uniform float uSpec; uniform float uIri; uniform float uTime;
  varying vec3 vN; varying vec3 vV; varying float vT;
  void main() {
    vec3 N = normalize(vN), V = normalize(vV);
    /* BackSide 재질은 gl_FrontFacing이 뒤집혀 들어오므로 시선과의 부호로 법선을 맞춘다 */
    if (dot(N, V) < 0.0) N = -N;
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fr = pow(1.0 - ndv, uPow);
    vec3 col = mix(uTint, uEdge, fr);
    float a = uBase + uEdgeA * fr;
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + (1.0 - ndv) * 1.5 + vT * 0.9 + uTime * 0.04));
    col = mix(col, iri, uIri * smoothstep(0.2, 0.95, 1.0 - ndv));
    a += uIri * 0.15 * (1.0 - ndv);
    vec3 L = normalize(vec3(-0.4, 0.8, 0.5)), L2 = normalize(vec3(0.7, 0.1, 0.6));
    float sp = (pow(max(dot(reflect(-L, N), V), 0.0), 48.0) + 0.6 * pow(max(dot(reflect(-L2, N), V), 0.0), 96.0)) * uSpec;
    col += vec3(sp);
    a += sp * 0.7;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }`;

/* 뒷면을 먼저, 앞면을 나중에 그려 겹침 순서를 지킨다 */
function glassPair(geo: BufferGeometry, uTime: { value: number }) {
  const uniforms = {
    uTint: { value: new Color(0xffffff) }, uEdge: { value: new Color(0x2a2f2a) },
    uBase: { value: 0.08 }, uEdgeA: { value: 0.75 }, uPow: { value: 2.0 }, uSpec: { value: 0.9 }, uIri: { value: 0.8 }, uTime,
  };
  const mat = (side: Side) =>
    new ShaderMaterial({ uniforms, vertexShader: GLASS_VS, fragmentShader: GLASS_FS, transparent: true, depthWrite: false, side });
  const back = new Mesh(geo, mat(BackSide)), front = new Mesh(geo, mat(FrontSide));
  back.renderOrder = 1;
  front.renderOrder = 2;
  return new Group().add(back, front);
}

/* 바닥에 눕힌 부드러운 그림자 */
function shadow(y: number, size: number, alpha: number) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(8,11,9,${alpha})`);
  gr.addColorStop(0.55, `rgba(8,11,9,${alpha * 0.35})`);
  gr.addColorStop(1, 'rgba(8,11,9,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(cv);
  tex.anisotropy = 4;
  const m = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

/**
 * stage 안에 캔버스를 깔고 장면을 돌린다. 돌려받은 함수로 멈추고 치운다.
 * 글자(워드마크 · 버튼)가 오른쪽에 있으므로 넓은 화면에서는 리본을 왼쪽으로, 좁은 화면에서는 위로 비켜 그린다.
 */
export function startScene(stage: HTMLElement): () => void {
  ColorManagement.enabled = false;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return () => {}; // WebGL 이 없으면 페이퍼 바탕만 남는다
  }
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(PAPER, 1);
  stage.prepend(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.05, 120);
  camera.position.set(0, 0, 3.0);
  const root = new Group(), spin = new Group();
  const uTime = { value: 0 };
  scene.add(root);
  root.add(spin);
  spin.add(glassPair(ribbon(fold(102), 1.32), uTime));
  scene.add(shadow(-1.15, 2.6, 0.16));

  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches;
  const onMotion = (e: MediaQueryListEvent) => (reduce = e.matches);
  mq.addEventListener('change', onMotion);

  /* 포인터 시차와 드래그 회전. 버튼 · 링크를 누를 때는 포인터를 붙잡지 않아야 클릭이 닿는다 */
  let tx = 0, ty = 0, px = 0, py = 0, yaw = 0, yawVel = 0, dragX: number | null = null;
  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (dragX !== null) {
      yawVel = (e.clientX - dragX) * 0.004;
      dragX = e.clientX;
    }
  };
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest('a, button')) return;
    dragX = e.clientX;
    stage.setPointerCapture(e.pointerId);
  };
  const onUp = () => (dragX = null);
  const onLeave = () => {
    tx = 0;
    ty = 0;
  };
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerleave', onLeave);

  let t = reduce ? 9 : 2, last = 0, raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) {
      last = now;
      return;
    }
    const dt = reduce ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 4 || h < 4) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
    }

    t += dt;
    const damp = 1 - Math.pow(0.0025, dt || 0.016);
    px += (tx - px) * damp;
    py += (ty - py) * damp;
    yaw += yawVel;
    yawVel *= 0.92;
    root.rotation.set(py * 0.22, yaw + px * 0.42, 0);
    uTime.value = t;
    spin.rotation.y = t * 0.18;
    spin.rotation.x = Math.sin(t * 0.2) * 0.2;

    camera.aspect = w / h;
    if (w / h > 1.15) {
      camera.zoom = 0.86;
      camera.setViewOffset(w, h, w * 0.21, h * 0.05, w, h);
    } else {
      camera.zoom = 0.62;
      camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame((now) => {
    last = now;
    frame(now);
  });

  return () => {
    cancelAnimationFrame(raf);
    mq.removeEventListener('change', onMotion);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointerup', onUp);
    stage.removeEventListener('pointercancel', onUp);
    stage.removeEventListener('pointerleave', onLeave);
    scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.geometry.dispose();
      if (o.material instanceof MeshBasicMaterial) o.material.map?.dispose();
      (o.material as ShaderMaterial | MeshBasicMaterial).dispose();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}
