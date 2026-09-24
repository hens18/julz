// JULZ 3D hero — the logo spins in space, then drops into the shop heading as you scroll.
// Scene units are CSS pixels at z = 0, so the star can be placed exactly on a DOM element.
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const space = document.querySelector(".space");
const slot = document.querySelector("[data-drop-slot]");
const line = document.querySelector("[data-space-line]");
const cue = document.querySelector("[data-space-scroll]");
const coord = document.querySelector("[data-coord]");
const pathData = document.querySelector("#mark path")?.getAttribute("d");

function supportsWebGL() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

if (space && slot && pathData && supportsWebGL() && !reduceMotion) init();
else if (line) line.classList.add("is-on");

function init() {
  // ---------- renderer / camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.className = "star3d";
  renderer.domElement.setAttribute("aria-hidden", "true");
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const FOV = 35;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 12000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // ---------- the star: extruded from the logo's own SVG path ----------
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`);
  const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 26, bevelEnabled: true, bevelThickness: 7, bevelSize: 2.2, bevelSegments: 6, curveSegments: 28,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const logoWidth = bb.max.x - bb.min.x;
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
  geo.scale(1 / logoWidth, -1 / logoWidth, 1 / logoWidth); // unit width, flip SVG's y-down
  geo.computeVertexNormals();

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.25,
  });
  const star = new THREE.Mesh(geo, chrome);
  const pivot = new THREE.Group(); // pivot carries position/scale; star carries spin
  pivot.add(star);
  scene.add(pivot);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-1, 1.4, 2);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

  // ---------- orbit rings + glow (children of pivot so they travel with the star) ----------
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const rings = [0.78, 1.02].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0016, 8, 220), ringMat.clone());
    m.rotation.set(Math.PI / 2.35 + i * 0.35, i * 0.6, 0);
    pivot.add(m);
    return m;
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  moon.position.x = 0.78; // sit on the inner ring
  rings[0].add(moon);

  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"); const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,255,255,.55)"); grd.addColorStop(0.35, "rgba(200,210,255,.12)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(2.2, 2.2, 1);
  glow.position.z = -0.4;
  pivot.add(glow);

  // ---------- starfield ----------
  const STARS = 1400;
  const starPos = new Float32Array(STARS * 3);
  const starSeed = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 6000;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 4000;
    starPos[i * 3 + 2] = -Math.random() * 6000;
    starSeed[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
  const field = new THREE.Points(starGeo, starMat);
  scene.add(field);

  // ---------- layout / scroll math ----------
  let W = 0, H = 0, dropEnd = 1;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.set(0, 0, (H / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2))); // 1 unit = 1px at z=0
    camera.updateProjectionMatrix();
    // scroll position at which the slot sits at 32% of the viewport — that's where the star lands
    const r = slot.getBoundingClientRect();
    dropEnd = Math.max(1, r.top + scrollY + r.height / 2 - H * 0.32);
  };
  resize();
  addEventListener("resize", resize);
  document.fonts?.ready.then(resize);

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOutBack = (t) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };
  const lerp = (a, b, t) => a + (b - a) * t;

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => { mouse.tx = e.clientX / W - 0.5; mouse.ty = e.clientY / H - 0.5; }, { passive: true });

  let spin = 0, smoothP = 0, last = performance.now();
  document.documentElement.classList.add("has-3d");

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const target = clamp01(scrollY / dropEnd);
    smoothP += (target - smoothP) * Math.min(1, dt * 9); // inertia so the drop feels weighted
    const p = smoothP;
    const drop = smooth(0.42, 1, p); // phase A (0–.42): spin in space · phase B: fall into the slot
    mouse.x += (mouse.tx - mouse.x) * dt * 3; mouse.y += (mouse.ty - mouse.y) * dt * 3;

    // start: centred, big · end: exactly on the slot
    const r = slot.getBoundingClientRect();
    const startW = Math.min(W * (W < 700 ? 0.78 : 0.48), 720) * (1 + smooth(0, 0.42, p) * 0.12);
    const endX = r.left + r.width / 2 - W / 2;
    const endY = H / 2 - (r.top + r.height / 2);
    const fall = easeOutBack(drop);
    pivot.position.set(lerp(0, endX, drop), lerp(0, endY, fall), 0);
    pivot.scale.setScalar(lerp(startW, r.width, drop));

    // spin: idle drift, faster with scroll, then settle face-on as it lands
    spin += dt * (0.45 + (1 - drop) * p * 5);
    const settle = smooth(0.7, 1, p);
    const wobble = (1 - settle);
    star.rotation.y = lerp(spin, Math.round(spin / (Math.PI * 2)) * Math.PI * 2, settle);
    star.rotation.x = wobble * (Math.sin(now * 0.0006) * 0.12 + mouse.y * 0.5);
    star.rotation.z = wobble * (mouse.x * -0.25 + drop * Math.sin(drop * Math.PI) * 0.6);

    // rings + glow + starfield fade as we leave space
    const spaceFade = 1 - smooth(0.35, 0.8, p);
    rings.forEach((m, i) => { m.rotation.z += dt * (0.25 + i * 0.12); m.material.opacity = 0.35 * spaceFade; });
    moon.material.opacity = spaceFade;
    glow.material.opacity = 1 - smooth(0.3, 0.6, p);
    starMat.opacity = 0.9 * spaceFade;
    field.visible = spaceFade > 0.01;
    // warp: stars stream toward the camera while scrolling through space
    const speed = 30 + p * 2600;
    const pos = starGeo.attributes.position.array;
    for (let i = 0; i < STARS; i++) {
      let z = pos[i * 3 + 2] + speed * dt * (0.5 + starSeed[i]);
      if (z > camera.position.z - 50) z -= 6000;
      pos[i * 3 + 2] = z;
    }
    starGeo.attributes.position.needsUpdate = true;
    field.rotation.z = now * 0.00002 + mouse.x * 0.05;

    // chrome picks up less env once it's on paper, so it reads as black ink with highlights
    chrome.color.setScalar(lerp(1, 0.18, settle));

    // copy
    line?.classList.toggle("is-on", p > 0.12 && p < 0.5);
    cue?.classList.toggle("is-off", p > 0.04);
    if (coord) coord.textContent = `N ${String(Math.round(p * 90)).padStart(2, "0")}°${String(Math.floor(Math.abs(spin * 57.3)) % 60).padStart(2, "0")}′`;

    // after landing, only render while the slot is on screen
    const visible = p < 0.999 || (r.bottom > -40 && r.top < H + 40);
    renderer.domElement.style.visibility = visible ? "visible" : "hidden";
    if (visible) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
