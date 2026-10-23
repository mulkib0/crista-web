/* 로그인 시안 30종 — 박막 유리 리본. 첫 화면(apps/web/src/landing/scene.ts · 히어로 변주판 20.02 '박막 무지개')의 장면을
   three r149 전역(THREE)으로 옮겼다. 값은 그대로 두고, 바탕색 · 가장자리색 · 구도만 시안이 고를 수 있게 열었다.
   - RIBBON.mount(el, opts)   : el 안에 캔버스를 깔고 장면을 돌린다. 멈추는 함수를 돌려준다.
   - RIBBON.snapshot(opts, w, h) : 한 장면을 그려 PNG 데이터 URI 로 돌려준다(시안 카드용 — WebGL 문맥 하나를 같이 쓴다). */
(() => {
  "use strict";
  const T = window.THREE;
  if (!T) return;

  function rng(seed) {
    let a = seed >>> 0 || 1;
    const r = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const sphere = (rad = 1) => {
      const z = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
      return new T.Vector3(s * Math.cos(th) * rad, z * rad, s * Math.sin(th) * rad);
    };
    return { sphere };
  }
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

  /* 단백질 모양: H=알파 나선(100° · 1.5 Å · 2.3 Å), E=베타 가닥(3.3 Å), L=고리 */
  const PLAN = "L3 H14 L5 E7 L4 E7 L5 H16 L4 E6 L5 H12 L3";
  function fold(seed) {
    const r = rng(seed);
    const pts = [], ss = [];
    let pos = new T.Vector3(), dir = r.sphere(1);
    const Y = new T.Vector3(0, 1, 0), X = new T.Vector3(1, 0, 0);
    for (const tok of PLAN.split(" ")) {
      const kind = tok[0], n = Number(tok.slice(1));
      const u = new T.Vector3().crossVectors(dir, Math.abs(dir.y) < 0.9 ? Y : X).normalize();
      const v = new T.Vector3().crossVectors(dir, u);
      if (kind === "H") {
        const axis = pos.clone().addScaledVector(u, -2.3);
        for (let i = 0; i < n; i++) {
          const a = i * 1.745;
          pts.push(axis.clone().addScaledVector(dir, i * 1.5).addScaledVector(u, Math.cos(a) * 2.3).addScaledVector(v, Math.sin(a) * 2.3));
          ss.push("H");
        }
      } else if (kind === "E") {
        for (let i = 0; i < n; i++) { pts.push(pos.clone().addScaledVector(dir, i * 3.3 + 1.6).addScaledVector(v, i % 2 ? 0.5 : -0.5)); ss.push("E"); }
      } else {
        for (let i = 0; i < n; i++) {
          const toC = pos.lengthSq() > 1e-4 ? pos.clone().negate().normalize() : r.sphere(1);
          dir.lerp(toC, 0.32).add(r.sphere(0.55)).normalize();
          pos = pos.clone().addScaledVector(dir, 3.6);
          pts.push(pos.clone()); ss.push("L");
        }
      }
      pos = pts[pts.length - 1].clone();
      const toC = pos.lengthSq() > 1e-4 ? pos.clone().negate().normalize() : r.sphere(1);
      dir = toC.multiplyScalar(0.72).add(r.sphere(0.85)).normalize();
    }
    const c = new T.Vector3();
    pts.forEach((p) => c.add(p));
    c.divideScalar(pts.length);
    let m = 0;
    pts.forEach((p) => { p.sub(c); m = Math.max(m, p.length()); });
    pts.forEach((p) => p.multiplyScalar(1 / (m || 1)));
    return { pts, ss };
  }

  const WIDTH = { H: [0.085, 0.016], E: [0.1, 0.018], L: [0.02, 0.02] };
  function ribbon({ pts, ss }, scale) {
    const n = pts.length, seg = 10, radial = 14;
    const curve = new T.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    const M = (n - 1) * seg + 1;
    const P = [];
    for (let i = 0; i < M; i++) P.push(curve.getPoint(i / (M - 1)));
    const Tg = [], N = [], B = [];
    for (let i = 0; i < M; i++) Tg.push(P[Math.min(M - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
    for (let i = 0; i < M; i++) {
      const t = Tg[i];
      let nv = P[Math.max(0, i - seg)].clone().add(P[Math.min(M - 1, i + seg)]).sub(P[i].clone().multiplyScalar(2));
      nv.addScaledVector(t, -nv.dot(t));
      if (nv.lengthSq() < 1e-10) nv = i ? N[i - 1].clone() : new T.Vector3(0, 1, 0).cross(t);
      nv.normalize();
      if (i && nv.dot(N[i - 1]) < 0) nv.negate();
      if (i) nv.lerp(N[i - 1], 0.55).addScaledVector(t, -nv.dot(t)).normalize();
      N.push(nv);
      B.push(new T.Vector3().crossVectors(t, nv).normalize());
    }
    const pos = new Float32Array(M * radial * 3), nor = new Float32Array(M * radial * 3), at = new Float32Array(M * radial);
    const tmp = new T.Vector3(), nn = new T.Vector3();
    for (let i = 0; i < M; i++) {
      const rr = i / seg, i0 = Math.floor(rr), i1 = Math.min(n - 1, i0 + 1), f = rr - i0;
      const w0 = WIDTH[ss[i0]], w1 = WIDTH[ss[i1]];
      let w = lerp(w0[0], w1[0], smooth(f)), h = lerp(w0[1], w1[1], smooth(f));
      if (ss[i0] === "E" && ss[i1] !== "E") { w = lerp(0.17, 0.02, f); h = 0.018; }
      w *= scale; h *= scale;
      for (let j = 0; j < radial; j++) {
        const ang = (j / radial) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
        tmp.copy(P[i]).addScaledVector(B[i], ca * w).addScaledVector(N[i], sa * h);
        nn.set(0, 0, 0).addScaledVector(B[i], ca / w).addScaledVector(N[i], sa / h).normalize();
        const k = (i * radial + j) * 3;
        pos.set([tmp.x, tmp.y, tmp.z], k);
        nor.set([nn.x, nn.y, nn.z], k);
        at[i * radial + j] = i / (M - 1);
      }
    }
    const idx = [];
    for (let i = 0; i < M - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * radial + j, b = i * radial + ((j + 1) % radial);
        idx.push(a, a + radial, b, b, a + radial, b + radial);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setAttribute("normal", new T.BufferAttribute(nor, 3));
    g.setAttribute("aT", new T.BufferAttribute(at, 1));
    g.setIndex(idx);
    return g;
  }

  const VS = `
    attribute float aT;
    varying vec3 vN; varying vec3 vV; varying float vT;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vec4 mv = viewMatrix * w;
      vN = normalize((viewMatrix * vec4(normalize(mat3(modelMatrix) * normal), 0.0)).xyz);
      vV = -mv.xyz; vT = aT;
      gl_Position = projectionMatrix * mv;
    }`;
  const FS = `
    uniform vec3 uTint; uniform vec3 uEdge;
    uniform float uBase; uniform float uEdgeA; uniform float uPow; uniform float uSpec; uniform float uIri; uniform float uTime;
    varying vec3 vN; varying vec3 vV; varying float vT;
    void main() {
      vec3 N = normalize(vN), V = normalize(vV);
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

  /* 기본값 = 첫 화면 그대로. 시안은 필요한 것만 바꾼다.
     bg: 바탕색(null 이면 투명) · tint/edge: 유리 속 · 가장자리색 · iri: 박막 간섭 세기 · shadow: 바닥 그림자 진하기(0 이면 없음)
     ox/oy: 화면 폭 · 높이에 대한 시점 밀기(+ox 면 리본이 왼쪽으로) · zoom · seed · scale · spin: 초당 회전 · t0: 처음 시각 */
  const DEF = { bg: 0xf1f1e9, tint: 0xffffff, edge: 0x2a2f2a, base: 0.08, edgeA: 0.75, pow: 2.0, spec: 0.9, iri: 0.8, shadow: 0.16, shadowInk: [8, 11, 9],
    ox: 0.21, oy: 0.05, zoom: 0.86, narrowOx: 0, narrowOy: 0.2, narrowZoom: 0.62, seed: 102, scale: 1.32, spin: 0.18, t0: 2 };

  function shadowMesh(y, size, alpha, ink) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g = cv.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${ink},${alpha})`);
    gr.addColorStop(0.55, `rgba(${ink},${alpha * 0.35})`);
    gr.addColorStop(1, `rgba(${ink},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const tex = new T.CanvasTexture(cv);
    const m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    return m;
  }

  const geoCache = {};
  function build(o) {
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, 0.05, 120);
    camera.position.set(0, 0, 3.0);
    const root = new T.Group(), spin = new T.Group();
    const uTime = { value: 0 };
    scene.add(root);
    root.add(spin);
    const key = o.seed + ":" + o.scale;
    const geo = geoCache[key] || (geoCache[key] = ribbon(fold(o.seed), o.scale));
    const uniforms = {
      uTint: { value: new T.Color(o.tint) }, uEdge: { value: new T.Color(o.edge) },
      uBase: { value: o.base }, uEdgeA: { value: o.edgeA }, uPow: { value: o.pow }, uSpec: { value: o.spec }, uIri: { value: o.iri }, uTime,
    };
    const mat = (side) => new T.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side });
    const back = new T.Mesh(geo, mat(T.BackSide)), front = new T.Mesh(geo, mat(T.FrontSide));
    back.renderOrder = 1;
    front.renderOrder = 2;
    spin.add(back, front);
    if (o.shadow > 0) scene.add(shadowMesh(-1.15, 2.6, o.shadow, o.shadowInk.join(",")));
    return { scene, camera, root, spin, uTime };
  }

  function pose(s, o, t, px, py, yaw, w, h) {
    s.root.rotation.set(py * 0.22, yaw + px * 0.42, 0);
    s.uTime.value = t;
    s.spin.rotation.y = t * o.spin;
    s.spin.rotation.x = Math.sin(t * 0.2) * 0.2;
    s.camera.aspect = w / h;
    if (w / h > 1.15) { s.camera.zoom = o.zoom; s.camera.setViewOffset(w, h, w * o.ox, h * o.oy, w, h); }
    else { s.camera.zoom = o.narrowZoom; s.camera.setViewOffset(w, h, w * o.narrowOx, h * o.narrowOy, w, h); }
    s.camera.updateProjectionMatrix();
  }

  function dispose(scene) {
    scene.traverse((m) => {
      if (!m.isMesh) return;
      if (m.material.map) { m.material.map.dispose(); m.geometry.dispose(); }
      m.material.dispose();
    });
  }

  /* 살아 있는 장면. pointerEl 위의 포인터를 따라 기울고, 끌면 돈다(버튼 · 입력칸 위에서는 붙잡지 않는다). */
  function mount(el, opts = {}) {
    const o = Object.assign({}, DEF, opts);
    const canvas = document.createElement("canvas");
    canvas.className = "rb-canvas";
    canvas.setAttribute("aria-hidden", "true");
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: o.bg == null, powerPreference: "high-performance" }); }
    catch (e) { return () => {}; }
    if (o.bg == null) renderer.setClearColor(0x000000, 0); else renderer.setClearColor(o.bg, 1);
    el.prepend(canvas);
    const s = build(o);
    const pointerEl = opts.pointerEl || el;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tx = 0, ty = 0, px = 0, py = 0, yaw = 0, yawVel = 0, dragX = null;
    const onMove = (e) => {
      const r = pointerEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (dragX !== null) { yawVel = (e.clientX - dragX) * 0.004; dragX = e.clientX; }
    };
    const onDown = (e) => { if (e.target.closest("a, button, input, label, select, textarea, form")) return; dragX = e.clientX; };
    const onUp = () => (dragX = null);
    const onLeave = () => { tx = 0; ty = 0; dragX = null; };
    pointerEl.addEventListener("pointermove", onMove);
    pointerEl.addEventListener("pointerdown", onDown);
    addEventListener("pointerup", onUp);
    pointerEl.addEventListener("pointerleave", onLeave);
    let t = reduce ? 9 : o.t0, last = 0, raf = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = now; return; }
      const dt = reduce ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const w = el.clientWidth, h = el.clientHeight;
      if (w < 4 || h < 4) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
      t += dt;
      const damp = 1 - Math.pow(0.0025, dt || 0.016);
      px += (tx - px) * damp; py += (ty - py) * damp;
      yaw += yawVel; yawVel *= 0.92;
      pose(s, o, t, px, py, yaw, w, h);
      renderer.render(s.scene, s.camera);
    };
    raf = requestAnimationFrame((now) => { last = now; frame(now); });
    return () => {
      cancelAnimationFrame(raf);
      pointerEl.removeEventListener("pointermove", onMove);
      pointerEl.removeEventListener("pointerdown", onDown);
      removeEventListener("pointerup", onUp);
      pointerEl.removeEventListener("pointerleave", onLeave);
      dispose(s.scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }

  /* 카드용 정지 화면 — 문맥 하나를 돌려 쓴다 */
  let shared = null;
  const snapCache = {};
  function snapshot(opts = {}, w = 1440, h = 900) {
    const o = Object.assign({}, DEF, opts);
    const key = JSON.stringify(o) + w + "x" + h;
    if (snapCache[key]) return snapCache[key];
    try {
      if (!shared) {
        const canvas = document.createElement("canvas");
        shared = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        shared.setPixelRatio(1);
      }
    } catch (e) { return null; }
    const q = 0.6; // 카드는 화면 폭의 1/4 남짓이라 낮은 해상도로 충분하다
    shared.setSize(Math.round(w * q), Math.round(h * q), false);
    if (o.bg == null) shared.setClearColor(0x000000, 0); else shared.setClearColor(o.bg, 1);
    const s = build(o);
    pose(s, o, o.t0 + 7, 0, 0, 0, w, h);
    shared.render(s.scene, s.camera);
    const url = shared.domElement.toDataURL("image/png");
    dispose(s.scene);
    snapCache[key] = url;
    return url;
  }

  window.RIBBON = { mount, snapshot, DEF };
})();
