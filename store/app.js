import { goods, plate, hydrateImages, icon, plan } from "./catalog.js";
const $ = (s) => document.querySelector(s);
let viewer;
for (const i of document.querySelectorAll("[data-icon]")) i.innerHTML = icon(i.dataset.icon);
$("#plan").innerHTML = plan;
const shelf = $("#shelf"),
  sheet = $("#sheet"),
  body = $("#sheetBody");
let counts = goods.map(() => 0);
try {
  const prev = JSON.parse(sessionStorage.getItem("mock-pantry-basket"));
  if (
    Array.isArray(prev) &&
    prev.length === goods.length &&
    prev.every((n) => Number.isSafeInteger(n) && n >= 0)
  )
    counts = prev;
} catch {
  /* Storage is optional. */
}
function update() {
  const n = counts.reduce((a, b) => a + b, 0);
  $("#count").textContent = n;
  $("#basketBtn").setAttribute("aria-label", `Open mock basket, ${n} items`);
  try {
    sessionStorage.setItem("mock-pantry-basket", JSON.stringify(counts));
  } catch {}
}
update();
function open() {
  if (!sheet.open) sheet.showModal();
}
function select(i) {
  const p = goods[i];
  body.innerHTML = `<div class="sheetplate">${plate(p)}</div><div class="sheetInner"><div class="eyebrow"><span class="line"></span>${p.section} / ${p.no}</div><h2>${p.name}</h2><p>${p.description}</p><p class="packnote">${viewer?.isModel(i) ? "Study model" : "Placeholder carton"} · NEW MOON (placeholder pack art)</p><div class="price">S$${p.price.toFixed(2)} <small>Mock price</small></div><div class="actions"><button class="primary" id="add">Add to basket</button><a class="secondary" href="../ar/?product=${p.slug}">View in AR</a></div><p class="feedback" id="added" role="status"></p></div>`;
  hydrateImages(body);
  $("#add").onclick = () => {
    counts[i]++;
    update();
    $("#added").textContent = `Added · ${counts[i]} in your mock basket.`;
  };
  open();
}
for (const [i, p] of goods.entries()) {
  const btn = document.createElement("button");
  btn.className = "item";
  btn.innerHTML = `${plate(p)}<div class="caption"><small>${p.section}</small><h3>${p.name}</h3></div>`;
  btn.onclick = () => select(i);
  shelf.append(btn);
}
hydrateImages(shelf);
function basket() {
  const rows = goods
    .map((p, i) =>
      counts[i]
        ? `<div class="basketRow"><span>${p.name}<br><small>Qty ${counts[i]} · S$${(counts[i] * p.price).toFixed(2)}</small></span><button data-remove="${i}" aria-label="Remove one ${p.name}"><i>${icon("minus")}</i></button></div>`
        : "",
    )
    .join("");
  body.innerHTML = `<div class="sheetInner basket"><div class="eyebrow"><span class="line"></span> Mock basket</div><h2>Your selection</h2><p>${rows ? "For this prototype session only. No checkout or payment." : "Your basket is empty. Inspect a piece in the store or shelf index to add it."}</p>${rows}${rows ? `<div class="price">S$${goods.reduce((s, p, i) => s + p.price * counts[i], 0).toFixed(2)} <small>Mock total</small></div>` : ""}</div>`;
  for (const b of body.querySelectorAll("[data-remove]"))
    b.onclick = () => {
      counts[b.dataset.remove]--;
      update();
      basket();
    };
  open();
}
$("#basketBtn").onclick = basket;
$("#close").onclick = () => sheet.close();
sheet.onclick = (e) => {
  if (e.target === sheet) {
    const r = sheet.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      sheet.close();
  }
};
function status(text) {
  $("#status").textContent = text;
  $("#status").hidden = !text;
}
function report({ mode, scanName, scanCount, problem, busy }) {
  const isScan = mode === "scan";
  $("#storeMode").setAttribute("aria-pressed", !isScan);
  $("#scanMode").setAttribute("aria-pressed", isScan);
  $("#fig").textContent = isScan ? "Plate 02" : "Plate 01";
  $("#roomName").innerHTML = isScan
    ? "The scan<br><em>studio.</em>"
    : "The provision<br><em>room.</em>";
  $("#roomCopy").textContent = isScan
    ? scanName
      ? `${scanName} · ${scanCount.toLocaleString()} splats. Products use the placement file.`
      : "No store scan is included. Load a Gaussian splat to place the collection inside your capture."
    : "Explore a cutaway shop of pantry shelves, a refill counter and a festive gifting corner.";
  $("#plan").hidden = isScan;
  $("#scanControls").hidden = !isScan;
  $("#scanActions").hidden = !scanName;
  $("#roomCode").innerHTML = isScan
    ? "SG—02 <span>•</span> HYBRID STUDY"
    : "SG—01 <span>•</span> INTERIOR STUDY";
  $("#sceneBadge b").textContent = isScan
    ? scanName
      ? /^mock-swatches\.(splat|spz|ply)$/.test(scanName)
        ? "Mock test splat"
        : "User splat · Mock goods"
      : "Mock · No scan loaded"
    : "Mock interior";
  status(!isScan ? "" : busy ? "Reading Gaussian splats…" : problem || "");
}
function expand() {
  const on = $("#world").classList.toggle("expanded");
  document.body.style.overflow = on ? "hidden" : "";
  $("#expand").setAttribute("aria-label", on ? "Exit expanded view" : "Expand view");
  $("#expand").innerHTML = `<i>${icon(on ? "close" : "expand")}</i>`;
}
$("#expand").onclick = expand;
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !sheet.open && $("#world").classList.contains("expanded")) expand();
});
status("Opening the model store…");
try {
  const { createViewer } = await import("./viewer.js");
  viewer = await createViewer({ select, scanReport: report });
  $("#storeMode").onclick = () => viewer.setMode("store");
  $("#scanMode").onclick = () => viewer.setMode("scan");
  $("#reset").onclick = () => viewer.reset();
  $("#zoomIn").onclick = () => viewer.zoom(0.82);
  $("#zoomOut").onclick = () => viewer.zoom(1 / 0.82);
  $("#unload").onclick = () => viewer.unload();
  $("#fitScan").onclick = () => viewer.fitScan();
  $("#file").onchange = (e) => {
    const f = e.target.files[0];
    if (f) viewer.load(f);
    e.target.value = "";
  };
  const url = new URL(location.href).searchParams.get("splat");
  if (url) viewer.load(url);
} catch (e) {
  console.error(e);
  status("3D unavailable. Explore the shelf index below.");
  for (const id of ["#storeMode", "#scanMode", "#reset", "#zoomIn", "#zoomOut"])
    $(id).disabled = true;
}
