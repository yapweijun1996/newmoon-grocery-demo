import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { buildRoom } from "./room.js";
import { goods, icon } from "./catalog.js";
import { createWalk } from "./walk.js";

export async function createViewer({ select, scanReport }) {
  const $ = (s) => document.querySelector(s),
    canvas = $("#view"),
    world = $("#world");
  const placement = await fetch("./placement.json").then((r) => r.json());
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(21, 1, 0.03, 140),
    controls = new OrbitControls(camera, canvas);
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.85;
  controls.enableDamping = false;
  controls.touches.TWO = T.TOUCH.DOLLY_PAN;
  // A small procedural studio sky gives foil and glass a soft reflection.
  const sky = document.createElement("canvas");
  sky.width = 256;
  sky.height = 128;
  const skyCtx = sky.getContext("2d");
  const gradient = skyCtx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "#fff5dd");
  gradient.addColorStop(0.52, "#ded9c7");
  gradient.addColorStop(0.54, "#777668");
  gradient.addColorStop(1, "#bca887");
  skyCtx.fillStyle = gradient;
  skyCtx.fillRect(0, 0, 256, 128);
  skyCtx.fillStyle = "#fffaef";
  skyCtx.fillRect(18, 12, 61, 50);
  const env = new T.CanvasTexture(sky);
  env.colorSpace = T.SRGBColorSpace;
  env.mapping = T.EquirectangularReflectionMapping;
  scene.environment = env;
  scene.environmentIntensity = 0.65;
  scene.add(new T.HemisphereLight(0xfff2d9, 0xccad86, 1.42));
  const sun = new T.DirectionalLight(0xffecd0, 2.2);
  sun.position.set(1.5, 9, 5.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.1, far: 25 });
  sun.shadow.normalBias = 0.015;
  sun.shadow.bias = -0.00025;
  sun.shadow.radius = 3;
  scene.add(sun);
  const room = buildRoom();
  scene.add(room);
  const ground = new T.Mesh(
    new T.PlaneGeometry(140, 140),
    new T.ShadowMaterial({ opacity: 0.15, depthWrite: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.374;
  ground.receiveShadow = true;
  room.add(ground);
  const mockBench = new T.Mesh(
    new T.BoxGeometry(2.32, 0.056, 0.58),
    new T.MeshStandardMaterial({ color: "#acaa92", roughness: 0.9 }),
  );
  mockBench.position.y = 0.972;
  mockBench.receiveShadow = true;
  mockBench.visible = false;
  scene.add(mockBench);
  const grid = new T.GridHelper(8, 40, "#a8a18b", "#c1bba7");
  grid.position.y = 0.7;
  grid.visible = false;
  scene.add(grid);
  const draco = new DRACOLoader()
      .setDecoderPath("./vendor/three/draco/")
      .setWorkerLimit(2),
    loader = new GLTFLoader().setDRACOLoader(draco);
  let dirty = true;
  const invalidate = () => {
    dirty = true;
  };
  const relight = () => {
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  };
  function shadows(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return root;
  }
  async function fixture(name, setup) {
    try {
      const { scene: model } = await loader.loadAsync(`./assets/${name}.glb`);
      setup(model);
      room.add(shadows(model));
      room.userData.fixtures = (room.userData.fixtures || 0) + 1;
      canvas.dataset.fixtures = room.userData.fixtures;
      relight();
    } catch (e) {
      console.warn("Fixture unavailable:", name, e);
    }
  }
  fixture("grocery-refill-island", (m) => {
    m.scale.setScalar(0.73);
    m.rotation.y = Math.PI / 2;
    m.position.set(-3.47, 0.01, -0.23);
  });
  fixture("rotan-pendant-showroom", (m) => {
    for (const c of [...m.children])
      if (!/Luminaires|Woven_shades|Woven shades|Frame/.test(c.name)) m.remove(c);
    m.scale.setScalar(0.8);
    m.rotation.y = -Math.PI / 2;
    m.position.set(-3.07, 3.26 - 2.85 * 0.8, 0.1);
  });
  let mode = "store",
    scan = null,
    engine = null,
    request = 0,
    scanName = "",
    scanCount = 0,
    problem = "",
    busy = false;
  const poses = [
    [-1.75, 1.09, 0.78, 0.91, 0.12],
    [-0.6, 1.074, 0.84, 0.47, 0.11],
    [0.36, 1.074, 0.74, 0.44, 0.03],
    [-2.52, 1.41, -2.0, 0.48, 0.04],
    [2.55, 1.056, 0.04, 1.17, -0.1],
  ];
  const groups = [],
    models = [],
    dims = [],
    pins = [],
    pending = new Set(),
    loaded = new Set();
  function fallback(i) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = goods[i].ink;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#e0c99f";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 472, 472);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4e7cb";
    ctx.font = "36px Georgia";
    ctx.fillText("NEW MOON (placeholder pack art)", 256, 256, 450);
    ctx.font = "22px monospace";
    ctx.fillText("MOCK  /  " + goods[i].no, 256, 305);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(
      new T.BoxGeometry(0.19, 0.17, 0.1),
      new T.MeshStandardMaterial({ map: tex }),
    );
    mesh.position.y = 0.085;
    const g = new T.Group();
    g.add(shadows(mesh));
    return g;
  }
  function arrange(i) {
    const p = poses[i],
      g = groups[i];
    if (mode === "store") {
      g.position.set(...p.slice(0, 3));
      g.rotation.set(0, p[4], 0);
      g.scale.setScalar(p[3] / Math.max(...dims[i].toArray()));
    } else {
      const t = placement.products[goods[i].slug];
      g.position.fromArray(t.position);
      g.rotation.set(...t.rotation);
      g.scale.fromArray(t.scale);
    }
    relight();
  }
  for (let i = 0; i < goods.length; i++) {
    const group = new T.Group();
    group.userData.id = i;
    groups[i] = group;
    models[i] = fallback(i);
    dims[i] = new T.Vector3(0.19, 0.17, 0.1);
    group.add(models[i]);
    scene.add(group);
    arrange(i);
    const pin = document.createElement("button");
    pin.className = "pin";
    pin.textContent = goods[i].no;
    pin.setAttribute("aria-label", "Inspect " + goods[i].name);
    pin.onclick = () => select(i);
    $("#markers").append(pin);
    pins.push(pin);
  }
  async function probe(i) {
    if (loaded.has(i) || pending.has(i)) return;
    pending.add(i);
    try {
      const slug = goods[i].slug;
      let model;
      for (const path of [`../products/${slug}/model.glb`, `../products/${slug}.glb`]) {
        try {
          model = (await loader.loadAsync(path)).scene;
          break;
        } catch {
          /* Missing or not yet completely written: retain the labeled carton. */
        }
      }
      if (!model) return;
      const b = new T.Box3().setFromObject(model),
        center = b.getCenter(new T.Vector3());
      dims[i] = b.getSize(new T.Vector3());
      if (!dims[i].length()) throw Error("Empty product");
      model.position.sub(new T.Vector3(center.x, b.min.y, center.z));
      groups[i].remove(models[i]);
      models[i].traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      models[i] = shadows(model);
      groups[i].add(model);
      loaded.add(i);
      canvas.dataset.products = loaded.size;
      arrange(i);
    } finally {
      pending.delete(i);
    }
  }
  function refresh() {
    if (!document.hidden) for (let i = 0; i < goods.length; i++) probe(i);
  }
  refresh();
  const retry = setInterval(() => {
    if (loaded.size === goods.length) clearInterval(retry);
    else refresh();
  }, 30000);
  window.addEventListener("focus", refresh);
  const v = new T.Vector3();
  function drawPins() {
    camera.updateMatrixWorld();
    const w = world.clientWidth,
      h = world.clientHeight;
    groups.forEach((g, i) => {
      g.updateWorldMatrix(true, false);
      v.set(0, dims[i].y, 0).applyMatrix4(g.matrixWorld);
      v.project(camera);
      const x = ((v.x + 1) * w) / 2,
        y = ((1 - v.y) * h) / 2 - 6;
      pins[i].hidden = v.z < -1 || v.z > 1 || x < 12 || x > w - 12 || y < 25 || y > h - 2;
      pins[i].style.left = `${x}px`;
      pins[i].style.top = `${y}px`;
    });
  }
  controls.addEventListener("change", invalidate);
  let walking = false;
  const walk = createWalk({ camera, canvas, invalidate });
  function size() {
    const w = world.clientWidth,
      h = world.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = mode === "store" ? 22 : new T.Vector3(...placement.camera.offset).length();
    const height =
      mode === "store"
        ? Math.max(7.72, 11.25 / camera.aspect)
        : Math.max(placement.camera.minHeight, placement.camera.width / camera.aspect);
    camera.fov = walking ? 70 : T.MathUtils.radToDeg(2 * Math.atan(height / (2 * dist)));
    camera.updateProjectionMatrix();
    invalidate();
  }
  function reset() {
    if (walking) { walk.reset(); size(); return; }
    const store = mode === "store";
    camera.far = 140;
    controls.enablePan = !store;
    controls.minDistance = store ? 8 : 0.25;
    controls.maxDistance = store ? 34 : 35;
    controls.minPolarAngle = store ? 0.46 : 0.04;
    controls.maxPolarAngle = store ? 1.45 : Math.PI - 0.04;
    controls.minAzimuthAngle = store ? -0.22 : -Infinity;
    controls.maxAzimuthAngle = store ? 1.32 : Infinity;
    controls.target.fromArray(store ? [0, 0.92, 0] : placement.camera.target);
    camera.position
      .copy(controls.target)
      .add(
        store
          ? new T.Vector3(6, 5.2, 9.7).normalize().multiplyScalar(22)
          : new T.Vector3(...placement.camera.offset),
      );
    camera.lookAt(controls.target);
    size();
    controls.update();
    invalidate();
  }
  reset();
  new ResizeObserver(size).observe(world);
  function zoom(factor) {
    if (walking) return;
    const delta = camera.position.clone().sub(controls.target);
    camera.position
      .copy(controls.target)
      .add(
        delta.setLength(
          T.MathUtils.clamp(delta.length() * factor, controls.minDistance, controls.maxDistance),
        ),
      );
    controls.update();
    invalidate();
  }
  const ray = new T.Raycaster();
  let down = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary) {
      down = null;
      return;
    }
    down = [e.clientX, e.clientY];
  });
  canvas.addEventListener("pointercancel", () => (down = null));
  canvas.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) {
      down = null;
      return;
    }
    down = null;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        1 - ((e.clientY - r.top) / r.height) * 2,
      ),
      camera,
    );
    const hit = ray.intersectObjects(groups, true)[0];
    if (!hit) return;
    if (
      mode === "store" &&
      ray.intersectObjects(room.children, true)[0]?.distance < hit.distance - 0.015
    )
      return;
    let o = hit.object;
    while (o && o.userData.id === undefined) o = o.parent;
    if (o) select(o.userData.id);
  });
  function sync() {
    const studio = mode === "scan";
    room.visible = !studio;
    mockBench.visible = grid.visible = studio && !scan;
    if (engine) engine.visible = studio && !!scan;
    if (scan) scan.visible = studio;
    canvas.dataset.mode = mode;
    scanReport({ mode, scanName, scanCount, problem, busy });
    relight();
  }
  function setWalk(on) {
    walking = on && mode === "store";
    controls.enabled = !walking;
    walk.setActive(walking);
    world.classList.toggle("walking", walking);
    canvas.dataset.view = walking ? "walk" : "orbit";
    canvas.setAttribute("aria-label", walking ? "Walk through the 3D shop. Use arrow keys or WASD to move and drag to look." : "Orbit the 3D shop. Select a numbered marker or a piece in the shelf index.");
    $("#walkView").setAttribute("aria-pressed", walking);
    $("#orbitView").setAttribute("aria-pressed", !walking);
    $("#joystick").hidden = !walking;
    $("#zoomIn").disabled = $("#zoomOut").disabled = walking;
    $("#viewHint").innerHTML = walking
      ? `<i>${icon("walk")}</i><span class="walkHint">WASD / arrows to move · Drag to look</span>`
      : `<i>${icon("orbit")}</i>Drag to orbit <span>·</span> Tap to inspect`;
    if (walking) size(); else reset();
  }
  function setMode(m) {
    if (walking) setWalk(false);
    mode = m;
    $("#walkView").disabled = m !== "store";
    groups.forEach((_, i) => arrange(i));
    sync();
    reset();
  }
  async function load(input) {
    const id = ++request;
    let candidate = null;
    problem = "";
    busy = true;
    setMode("scan");
    try {
      const isFile = input instanceof File,
        url = isFile ? null : new URL(input, location.href);
      if (url && !["http:", "https:"].includes(url.protocol))
        throw Error("Use an HTTP or HTTPS scan URL.");
      const name = isFile ? input.name : decodeURIComponent(url.pathname.split("/").pop());
      const ext = name.split(".").pop().toLowerCase();
      if (!["spz", "ply", "splat"].includes(ext))
        throw Error("Choose an .spz, Gaussian .ply or .splat file.");
      const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
      if (id !== request) return;
      const opts = isFile
        ? { fileBytes: await input.arrayBuffer(), fileName: name }
        : { url: url.href, fileName: name };
      candidate = new SplatMesh({ ...opts, raycastable: false });
      await candidate.initialized;
      const n = candidate.splats?.getNumSplats();
      if (!n) throw Error("The file contains no splats.");
      if (id !== request) {
        candidate.dispose();
        return;
      }
      if (!engine) {
        engine = new SparkRenderer({ renderer, enableLod: false, onDirty: invalidate });
        scene.add(engine);
      }
      if (scan) {
        scene.remove(scan);
        scan.dispose();
      }
      scan = candidate;
      candidate = null;
      scanCount = n;
      scanName = name;
      scan.position.fromArray(placement.scan.position);
      scan.rotation.set(...placement.scan.rotation);
      scan.scale.fromArray(placement.scan.scale);
      scene.add(scan);
      canvas.dataset.splats = n;
    } catch (e) {
      candidate?.dispose();
      if (id === request)
        problem =
          "Could not open scan. " +
          (String(e.message || e).includes("Choose an")
            ? e.message
            : "Check the file format or URL and try again.");
    } finally {
      if (id === request) {
        busy = false;
        sync();
      }
    }
  }
  function unload() {
    request++;
    busy = false;
    problem = "";
    if (scan) {
      scene.remove(scan);
      scan.dispose();
      scan = null;
    }
    scanCount = 0;
    scanName = "";
    delete canvas.dataset.splats;
    sync();
    reset();
  }
  function fitScan() {
    if (!scan) return;
    scan.updateWorldMatrix(true, false);
    const b = scan.getBoundingBox(true).applyMatrix4(scan.matrixWorld);
    if (b.isEmpty()) return;
    const sphere = b.getBoundingSphere(new T.Sphere());
    const angle = Math.atan(
      Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect),
    );
    const dist = Math.max(0.4, (sphere.radius / Math.sin(angle)) * 1.12);
    const dir = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(sphere.center);
    controls.maxDistance = Math.max(35, dist * 3);
    camera.far = Math.max(140, dist * 5);
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    camera.updateProjectionMatrix();
    controls.update();
    invalidate();
  }
  sync();
  renderer.setAnimationLoop((time) => {
    walk.update(time);
    if (walking) canvas.dataset.camera = camera.position.toArray().map((n) => n.toFixed(3)).join(",");
    if (!dirty && !(mode === "scan" && scan)) return;
    dirty = false;
    renderer.render(scene, camera);
    drawPins();
  });
  return { setMode, setWalk, reset, zoom, load, unload, fitScan, isModel: (i) => loaded.has(i) };
}
