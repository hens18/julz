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

  // ---------- deep-space details: nebula, bright stars, planets, shooting stars ----------
  const canvasTex = (w, h, draw) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  const rand = (a, b) => a + Math.random() * (b - a);

  // nebula: soft tinted clouds far behind everything
  const nebulaTex = (tint) => canvasTex(512, 512, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = rand(.2, .8) * w, y = rand(.2, .8) * h, r = rand(.12, .34) * w;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${tint},${rand(.02, .07)})`); grd.addColorStop(1, `rgba(${tint},0)`);
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  });
  const nebulae = [["110,130,255", -0.6, 0.35], ["170,120,255", 0.6, -0.3], ["255,210,180", 0.15, 0.5]].map(([tint, fx, fy]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebulaTex(tint), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
    s.userData = { fx, fy, spin: rand(-0.02, 0.02) };
    s.position.z = -2600;
    scene.add(s);
    return s;
  });

  // a second, brighter star layer that twinkles
  const BRIGHT = 180;
  const brightPos = new Float32Array(BRIGHT * 3);
  for (let i = 0; i < BRIGHT; i++) {
    brightPos[i * 3] = rand(-3200, 3200); brightPos[i * 3 + 1] = rand(-2200, 2200); brightPos[i * 3 + 2] = rand(-2400, -1200);
  }
  const brightGeo = new THREE.BufferGeometry();
  brightGeo.setAttribute("position", new THREE.BufferAttribute(brightPos, 3));
  const dotTex = canvasTex(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(220,230,255,.5)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  });
  const brightMat = new THREE.PointsMaterial({ size: 14, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const brightField = new THREE.Points(brightGeo, brightMat);
  scene.add(brightField);


  // planets are lit by the JULZ star itself: lambert from the star's direction + atmosphere rim
  const planetMat = (map, rimColor) => new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { map: { value: map }, sunDir: { value: new THREE.Vector3(1, 0, 0.3) }, opacity: { value: 1 }, rim: { value: new THREE.Color(rimColor) } },
    vertexShader: `varying vec3 vN; varying vec2 vUv;
      void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 sunDir; uniform float opacity; uniform vec3 rim; varying vec3 vN; varying vec2 vUv;
      void main(){
        vec3 n = normalize(vN);
        float d = max(dot(n, normalize(sunDir)), 0.);
        vec3 tex = texture2D(map, vUv).rgb;
        vec3 col = tex * (0.035 + 0.95 * pow(d, 0.9));
        float fres = pow(1. - max(n.z, 0.), 2.6);
        col += rim * fres * (0.15 + 0.85 * d) * 0.6;
        gl_FragColor = vec4(col, opacity);
        #include <colorspace_fragment>
      }`,
  });

  const gasTex = canvasTex(1024, 512, (g, w, h) => {
    const bands = ["#d8cfc2", "#b8ab98", "#8f8272", "#c9bfb1", "#6e645a", "#a99c8a", "#e2dbd0", "#7f7466"];
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const i = Math.floor((t * 9 + Math.sin(t * 40) * 0.25) * 1.3) % bands.length;
      g.fillStyle = bands[i]; g.fillRect(0, y, w, 1);
    }
    g.globalAlpha = 0.18; // turbulence streaks
    for (let k = 0; k < 900; k++) {
      g.fillStyle = Math.random() > 0.5 ? "#fff" : "#2a241f";
      g.fillRect(rand(0, w), rand(0, h), rand(20, 160), rand(1, 3));
    }
    g.globalAlpha = 0.5; g.fillStyle = "#5a4c40"; // a storm
    g.beginPath(); g.ellipse(w * 0.62, h * 0.63, 46, 18, 0, 0, Math.PI * 2); g.fill();
  });
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    planetMat(gasTex, 0xc9d4ff)
  );
  planet.rotation.z = 0.32;

  // planet ring: remap RingGeometry UVs so the texture runs radially
  const ringGeo = new THREE.RingGeometry(1.35, 2.25, 160, 1);
  const rp = ringGeo.attributes.position, ruv = ringGeo.attributes.uv, v3 = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) { v3.fromBufferAttribute(rp, i); ruv.setXY(i, (v3.length() - 1.35) / 0.9, 0.5); }
  const ringTex = canvasTex(512, 4, (g, w) => {
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const a = (0.25 + 0.55 * Math.abs(Math.sin(t * 38)) * Math.abs(Math.sin(t * 7 + 1))) * (t > 0.58 && t < 0.63 ? 0.1 : 1) * Math.sin(t * Math.PI);
      g.fillStyle = `rgba(225,215,200,${a})`; g.fillRect(x, 0, 1, 4);
    }
  });
  const planetRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, color: 0x77716a, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  planetRing.rotation.x = Math.PI / 2 - 0.28;
  const planetSys = new THREE.Group();
  planetSys.add(planet, planetRing);
  planetSys.rotation.z = 0.36;
  scene.add(planetSys);

  const rockTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = "#8d8a86"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(${Math.random() > .5 ? "255,255,255" : "0,0,0"},.05)`; g.fillRect(rand(0, w), rand(0, h), rand(2, 10), rand(2, 10)); }
    for (let k = 0; k < 70; k++) {
      const x = rand(0, w), y = rand(h * .1, h * .9), r = rand(2, 16);
      g.fillStyle = "rgba(40,38,36,.35)"; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 1.2; g.beginPath(); g.arc(x - .6, y - .6, r, Math.PI, Math.PI * 1.7); g.stroke();
    }
  });
  const moonPlanet = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    planetMat(rockTex, 0xffffff)
  );
  scene.add(moonPlanet);

  // a faint atmosphere halo behind the gas giant
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x8fa2ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 }));
  scene.add(halo);

  // shooting stars: short additive streaks that fire every few seconds
  const shooters = Array.from({ length: 2 }, () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array([1, 1, 1, 0, 0, 0]), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    l.userData = { life: 0, next: rand(1.5, 5), x: 0, y: 0, vx: 0, vy: 0 };
    l.frustumCulled = false;
    scene.add(l);
    return l;
  });

  // positions are in px relative to the viewport, recomputed on resize
  const spaceLayout = { R1: 200, R2: 50, p1: new THREE.Vector3(), p2: new THREE.Vector3() };
  const layoutSpace = () => {
    const big = Math.max(W, H);
    spaceLayout.R1 = Math.min(Math.max(big * 0.15, 100), 260);
    spaceLayout.R2 = spaceLayout.R1 * 0.24;
    const mobile = W < 700;
    spaceLayout.p1.set(-W * (mobile ? 0.44 : 0.42), -H * (mobile ? 0.36 : 0.34), -700);
    spaceLayout.p2.set(W * (mobile ? 0.3 : 0.36), H * (mobile ? 0.3 : 0.28), -1100);
    nebulae.forEach((s) => { s.scale.setScalar(big * 2.4); s.position.x = s.userData.fx * big; s.position.y = s.userData.fy * big; });
  };

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
    layoutSpace();
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

    // spin: never stops — idle drift, faster through space, and a steady turn once landed
    spin += dt * (0.7 + (1 - drop) * p * 5);
    const settle = smooth(0.7, 1, p);
    const wobble = (1 - settle);
    star.rotation.y = spin;
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

    // planets drift up slower than the page (depth), with a little mouse parallax
    const { R1, R2, p1, p2 } = spaceLayout;
    planetSys.position.set(p1.x + mouse.x * -40, p1.y + p * H * 0.9 + mouse.y * 30, p1.z);
    planetSys.scale.setScalar(R1);
    planet.rotation.y += dt * 0.05;
    halo.position.copy(planetSys.position).setZ(p1.z - 10);
    halo.scale.setScalar(R1 * 3.1);
    moonPlanet.position.set(p2.x + mouse.x * -70, p2.y + p * H * 1.3 + mouse.y * 50, p2.z);
    moonPlanet.scale.setScalar(R2);
    moonPlanet.rotation.y += dt * 0.12;
    planet.material.uniforms.sunDir.value.set(pivot.position.x - planetSys.position.x, pivot.position.y - planetSys.position.y, 700);
    moonPlanet.material.uniforms.sunDir.value.set(pivot.position.x - moonPlanet.position.x, pivot.position.y - moonPlanet.position.y, 900);
    planet.material.uniforms.opacity.value = moonPlanet.material.uniforms.opacity.value = spaceFade;
    planetRing.material.opacity = spaceFade;
    halo.material.opacity = 0.2 * spaceFade;
    nebulae.forEach((s, i) => {
      s.material.rotation += dt * s.userData.spin;
      s.material.opacity = (0.7 + 0.3 * Math.sin(now * 0.0003 + i * 2)) * spaceFade;
      s.position.z = -2600 + p * 900; // we drift into the clouds as we scroll
    });
    brightMat.opacity = (0.75 + 0.25 * Math.sin(now * 0.004)) * spaceFade;
    brightField.rotation.z = now * 0.000012 + mouse.x * 0.03;
    [planetSys, moonPlanet, halo, brightField, ...nebulae].forEach((o) => { o.visible = spaceFade > 0.01; });

    shooters.forEach((s) => {
      const u = s.userData;
      if (u.life <= 0) {
        u.next -= dt;
        s.visible = false;
        if (u.next <= 0 && spaceFade > 0.5) {
          const dir = Math.random() > 0.5 ? 1 : -1;
          u.x = rand(-0.5, 0.5) * W; u.y = rand(0.1, 0.5) * H;
          const a = rand(0.35, 0.6), sp = rand(900, 1500);
          u.vx = -dir * Math.cos(a) * sp; u.vy = -Math.sin(a) * sp;
          u.life = rand(0.5, 0.9); u.next = rand(3, 7);
        }
        return;
      }
      u.life -= dt; u.x += u.vx * dt; u.y += u.vy * dt;
      const tail = 0.12, arr = s.geometry.attributes.position.array;
      arr[0] = u.x; arr[1] = u.y; arr[2] = -200;
      arr[3] = u.x - u.vx * tail; arr[4] = u.y - u.vy * tail; arr[5] = -200;
      s.geometry.attributes.position.needsUpdate = true;
      s.material.opacity = Math.min(1, u.life * 3) * spaceFade;
      s.visible = true;
    });

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
