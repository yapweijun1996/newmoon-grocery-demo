import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Batch the static architecture by finish; stock and trim do not need separate draw calls.
export function buildRoom() {
  const room = new T.Group(),
    batches = new Map(),
    matCache = new Map();
  const mat = (color) => {
    if (typeof color !== "string") return color;
    if (!matCache.has(color))
      matCache.set(color, new T.MeshStandardMaterial({ color, roughness: 0.78 }));
    return matCache.get(color);
  };
  const cube = new T.BoxGeometry(1, 1, 1),
    tube = new T.CylinderGeometry(1, 1, 1, 28),
    flat = new T.PlaneGeometry();
  const brass = "#cfa969",
    pine = "#31584b",
    elm = "#ad7950",
    cream = "#eee0bd",
    oak = "#c49c6b",
    umber = "#684935",
    wine = "#883d3b";
  function part(g, c, x, y, z, w = 1, h = 1, d = 1, rx = 0, ry = 0, rz = 0) {
    let m = mat(c);
    if (!batches.has(m)) batches.set(m, []);
    let v = g.index ? g.toNonIndexed() : g.clone();
    v.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(x, y, z),
        new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)),
        new T.Vector3(w, h, d),
      ),
    );
    batches.get(m).push(v);
  }
  const box = (x, y, z, w, h, d, c, ry = 0) => part(cube, c, x, y, z, w, h, d, 0, ry),
    cyl = (x, y, z, r, h, c) => part(tube, c, x, y, z, r, h, r);
  let seed = 47;
  const rand = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  function texture(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function writing(text, color, size, font = "Georgia", border = false) {
    return new T.MeshStandardMaterial({
      map: texture(1024, 160, (ctx, w, h) => {
        ctx.fillStyle = color;
        ctx.font = `${size}px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, w / 2, h * 0.51, w * 0.92);
        if (border) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = color;
          ctx.strokeRect(8, 8, w - 16, h - 16);
        }
      }),
      transparent: true,
      depthWrite: false,
      roughness: 1,
    });
  }
  function sign(x, y, z, w, h, text, ink, size = 95) {
    part(flat, writing(text, ink, size), x, y, z, w, h, 1);
  }
  // A terrazzo inset, pencil border and glazed plinth edge.
  box(0, -0.24, 0, 8.34, 0.26, 5.55, "#354f43");
  box(0, -0.102, 0, 8.33, 0.035, 5.54, brass);
  box(0, -0.052, 0, 8.25, 0.08, 5.47, "#997f65");
  const tiles = ["#d7cbb3", "#e7ddc5", "#e0d0b5", "#e9ddc3"].map(
    (base) =>
      new T.MeshStandardMaterial({
        roughness: 0.82,
        map: texture(160, 160, (ctx, w, h) => {
          ctx.fillStyle = base;
          ctx.fillRect(0, 0, w, h);
          for (let n = 0; n < 1800; n++) {
            ctx.fillStyle = n % 3 ? "#645d4b26" : "#ffffdf75";
            const a = 0.4 + rand() * 1.7;
            ctx.fillRect(rand() * w, rand() * h, a, a * 0.7);
          }
        }),
      }),
  );
  for (let i = 0; i < 12; i++)
    for (let j = 0; j < 8; j++)
      box(
        -4.08 + (i + 0.5) * 0.68,
        -0.014,
        -2.68 + (j + 0.5) * 0.67,
        0.673,
        0.03,
        0.663,
        tiles[(i + j) % 2 ? 1 + Math.floor(rand() * 2) : Math.floor(rand() * 4)],
      );
  for (const z of [-2.52, 2.51]) box(0, 0.004, z, 7.93, 0.008, 0.032, "#7f7358");
  for (const x of [-3.94, 3.94]) box(x, 0.004, 0, 0.032, 0.008, 5.05, "#7f7358");
  // Two cut walls with stepped timber and brass cornices.
  box(0, 1.61, -2.6, 8.2, 3.22, 0.18, "#ccaf8c");
  box(-4.01, 1.61, 0, 0.18, 3.22, 5.36, "#c6ad8b");
  for (const [y, h, c, over] of [
    [0.14, 0.26, pine, 0.09],
    [3.15, 0.1, "#88664d", 0.025],
    [3.22, 0.06, brass, 0.06],
    [3.28, 0.095, cream, 0.1],
  ]) {
    box(0, y, -2.6, 8.23 + over, h, 0.22 + over, c);
    box(-4.01, y, 0, 0.22 + over, h, 5.36 + over, c);
  }
  const arch = (r, bottom, spring) => {
    let s = new T.Shape();
    s.moveTo(-r, bottom);
    s.lineTo(r, bottom);
    s.lineTo(r, spring);
    s.absarc(0, spring, r, 0, Math.PI, false);
    s.closePath();
    return new T.ShapeGeometry(s, 36);
  };
  function archPanel(x, z, w, c) {
    const r = w / 2;
    part(arch(r, 0.35, 1.91), brass, x, 0, z);
    part(arch(r - 0.055, 0.38, 1.91), c, x, 0, z + 0.01);
  }
  const packLabel = new T.MeshStandardMaterial({
    map: texture(256, 112, (ctx) => {
      ctx.fillStyle = "#e4d4b0";
      ctx.fillRect(0, 0, 256, 112);
      ctx.fillStyle = "#573c31";
      ctx.textAlign = "center";
      ctx.font = "32px Georgia";
      ctx.fillText("NEW MOON", 128, 51);
      ctx.font = "18px Georgia";
      ctx.fillText("(placeholder pack art)", 128, 83);
    }),
    roughness: 0.95,
  });
  // A bank of fitted cabinets. Each bay carries a specific stock family.
  for (let bay = 0; bay < 3; bay++) {
    let x = -2.55 + bay * 2.52;
    archPanel(x, -2.49, 2.32, [pine, "#6b7b64", "#975547"][bay]);
    let rib = ["#4c7061", "#84927b", "#b56e55"][bay];
    for (let k = -8; k <= 8; k++) {
      const xx = k * 0.12,
        top = 1.91 + Math.sqrt(1.08 ** 2 - xx ** 2);
      box(x + xx, (0.4 + top) / 2, -2.46, 0.013, top - 0.4, 0.013, rib);
    }
    box(x, 0.37, -2.12, 2.32, 0.74, 0.75, ["#395c4e", "#566e5d", "#905445"][bay]);
    for (let j = 0; j < 3; j++) {
      let dx = x + (j - 1) * 0.74;
      box(dx, 0.38, -1.735, 0.68, 0.54, 0.035, rib);
      box(dx, 0.38, -1.707, 0.55, 0.41, 0.024, ["#3c5d50", "#627a66", "#9c6050"][bay]);
      cyl(dx, 0.58, -1.683, 0.035, 0.045, brass);
    }
    for (const y of [0.76, 1.37, 1.99]) {
      box(x, y, -2.11, 2.29, 0.08, 0.75, oak);
      box(x, y - 0.014, -1.728, 2.29, 0.028, 0.018, brass);
    }
    sign(
      x,
      2.58,
      -2.425,
      1.68,
      0.25,
      ["Ocean pantry", "Essences", "Gift atelier"][bay],
      "#fff0ce",
      106,
    );
    // Background stock: botanical-paper cartons and sealed miniature jars.
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 6; col++) {
        if (bay === 0 && row === 1 && col > 0 && col < 5) continue;
        let px = x + (col - 2.5) * 0.323,
          z = -2.09 + rand() * 0.07,
          y = 0.8 + row * 0.615;
        if ((bay === 1 || row === 1) && bay !== 2) {
          const r = bay === 0 ? 0.126 : 0.085,
            hh = bay === 0 ? 0.21 : 0.29;
          cyl(px, y + hh / 2, z, r, hh, ["#995344", "#a9663b", "#b18a4a"][row]);
          cyl(px, y + hh + 0.016, z, r * 1.02, 0.037, brass);
          cyl(px, y + hh * 0.52, z, r * 1.015, hh * 0.49, ["#e6d9bc", "#cca890", "#c1c5a4"][bay]);
        } else {
          const hh = bay === 2 ? 0.29 + (col % 2) * 0.08 : 0.34;
          box(
            px,
            y + hh / 2,
            z,
            0.252,
            hh,
            0.22,
            [
              ["#88423d", "#b88a52", "#955749"],
              ["#b28169", "#967557", "#977760"],
              ["#95574b", "#b88657", "#a48c62"],
            ][bay][row],
          );
          box(px, y + hh * 0.5, z + 0.114, 0.167, 0.147, 0.012, "#e4d4b0");
          part(flat, packLabel, px, y + hh * 0.5, z + 0.122, 0.164, 0.094, 1);
        }
      }
  }
  // Transom windows on the return wall, with timber mullions.
  for (let i = 0; i < 4; i++) {
    let z = -1.84 + i * 1.19;
    box(-3.905, 2.02, z, 0.045, 1.95, 1.12, elm);
    box(-3.867, 2.02, z, 0.028, 1.81, 1, "#a4b8aa");
    box(-3.837, 2.25, z, 0.045, 0.048, 1.03, cream);
    box(-3.837, 2.02, z, 0.045, 1.82, 0.045, cream);
    for (let j = 0; j < 4; j++) box(-3.83, 2.62 + j * 0.09, z, 0.046, 0.033, 1.02, "#dfceb1");
  }
  for (const z of [-2.45, 2.61]) {
    box(-3.99, 1.56, z, 0.22, 3.12, 0.1, elm);
    box(-3.86, 0.09, z, 0.075, 0.18, 0.15, brass);
  }
  // Ribbed freestanding display island, stone cap, brass footer.
  const ix = -0.79,
    iz = 0.76;
  box(ix, 0.105, iz, 3.33, 0.21, 1.14, "#685345");
  box(ix, 0.2, iz, 3.48, 0.07, 1.21, brass);
  box(ix, 0.54, iz, 3.46, 0.65, 1.22, "#844f3d");
  for (let k = 0; k < 49; k++)
    box(ix - 1.68 + k * 0.07, 0.54, iz + 0.62, 0.032, 0.65, 0.032, "#b17855");
  for (let k = 0; k < 18; k++)
    box(ix + 1.74, 0.54, iz - 0.575 + k * 0.067, 0.032, 0.65, 0.026, "#a26a4f");
  box(ix, 0.89, iz, 3.61, 0.1, 1.35, cream);
  box(ix, 0.838, iz, 3.56, 0.026, 1.3, brass);
  box(ix, 0.56, iz + 0.654, 1.37, 0.31, 0.033, pine);
  sign(ix, 0.56, iz + 0.675, 1.31, 0.23, "PROVISIONS", "#f6ddb0", 99);
  // Small risers for the foreground products.
  box(-1.75, 1.015, 0.78, 0.98, 0.15, 0.72, "#c0a078");
  cyl(-0.6, 1.007, 0.84, 0.31, 0.133, "#d8be96");
  cyl(0.36, 1.007, 0.74, 0.32, 0.133, "#d8be96");
  // Round gifting table with a tambour apron.
  cyl(2.55, 0.105, 0.04, 0.71, 0.21, "#6e5b44");
  cyl(2.55, 0.54, 0.04, 0.82, 0.8, pine);
  for (let i = 0; i < 45; i++) {
    const a = (i * Math.PI * 2) / 45;
    cyl(2.55 + 0.82 * Math.cos(a), 0.54, 0.04 + 0.82 * Math.sin(a), 0.029, 0.79, "#547362");
  }
  cyl(2.55, 0.946, 0.04, 0.94, 0.075, brass);
  cyl(2.55, 1.01, 0.04, 0.96, 0.09, "#d6b991");
  // Pots with sculpted, folded lanceolate leaves.
  function plant(x, z, k) {
    part(new T.CylinderGeometry(0.29, 0.21, 0.54, 24), cream, x, 0.27 * k, z, k, k, k);
    cyl(x, 0.545 * k, z, 0.3 * k, 0.07 * k, "#b9986b");
    cyl(x, 0.57 * k, z, 0.26 * k, 0.03 * k, umber);
    for (let j = 0; j < 31; j++) {
      const theta = j * 2.4,
        len = (0.4 + rand() * 0.58) * k,
        reach = (0.22 + rand() * 0.48) * k;
      let verts = [],
        uv = [];
      for (let n = 0; n < 10; n++) {
        let row = (t) => {
          const width = 0.105 * k * Math.sin(t * Math.PI) ** 0.65;
          const d = reach * t ** 1.4,
            cy = 0.55 * k + len * (1 - (1 - t) ** 2) - 0.2 * k * t ** 3;
          return [-1, 0, 1].map((s) => [
            x + d * Math.cos(theta) + s * width * Math.sin(theta),
            cy + (s === 0 ? 0.05 * k * Math.sin(Math.PI * t) : 0),
            z + d * Math.sin(theta) - s * width * Math.cos(theta),
          ]);
        };
        let a = row(n / 10),
          b = row((n + 1) / 10);
        for (let v = 0; v < 2; v++) {
          verts.push(...a[v], ...b[v], ...a[v + 1], ...a[v + 1], ...b[v], ...b[v + 1]);
          uv.push(...Array(12).fill(0));
        }
      }
      let g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      const m = mat(["#52734e", "#648052", "#718849", "#879761"][j % 4]);
      m.side = T.DoubleSide;
      part(g, m, 0, 0, 0);
      g.dispose();
    }
  }
  plant(3.57, -1.26, 0.98);
  plant(-3.34, 2.07, 1.0);
  // A narrow suspended rail for the gallery's extracted rattan pendants.
  box(-3.07, 3.28, 0.1, 0.064, 0.064, 2.88, brass);
  for (const z of [-1.3, 1.5]) box(-3.57, 3.28, z, 1.02, 0.067, 0.068, brass);
  for (const [m, list] of batches) {
    let geometry = mergeGeometries(list);
    const mesh = new T.Mesh(geometry, m);
    mesh.castShadow = !m.transparent;
    mesh.receiveShadow = true;
    room.add(mesh);
    for (const g of list) g.dispose();
  }
  return room;
}
