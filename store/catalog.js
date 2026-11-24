export const goods = [
  [
    "abalone-can-gift-set",
    "Abalone Gift Set",
    "Ocean pantry",
    "A pair of abalone tins tucked into a presentation case.",
    48,
    "#ead5bd",
    "#7e4c38",
  ],
  [
    "collagen-beauty-essence-bottle",
    "Collagen Beauty Essence",
    "Essence library",
    "A small amber bottle from the beauty essence shelf.",
    16,
    "#e6cfc4",
    "#80584b",
  ],
  [
    "birds-nest-jar",
    "Bird’s Nest Jar",
    "Essence library",
    "A lidded jar from the bird’s nest gifting selection.",
    28,
    "#e6deca",
    "#75653f",
  ],
  [
    "health-tonic-box",
    "Health Tonic Box",
    "Botanical pantry",
    "A botanical tonic carton wrapped in deep green paper.",
    32,
    "#d1dac7",
    "#496248",
  ],
  [
    "cny-hamper-basket",
    "CNY Hamper Basket",
    "Festive gifting",
    "A woven festive basket of pantry gifts, finished with a ribbon.",
    88,
    "#e4cfaa",
    "#84673a",
  ],
].map(([slug, name, section, description, price, tint, ink], i) => ({
  slug,
  name,
  section,
  description,
  price,
  tint,
  ink,
  no: String(i + 1).padStart(2, "0"),
}));
const paths = {
  bag: "M5 8h14l1 13H4L5 8zm4 0V6a3 3 0 0 1 6 0v2",
  cube: "m12 2 9 5v10l-9 5-9-5V7l9-5zm-9 5 9 5 9-5m-9 5v10",
  scan: "M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6m3-3h12m-6-4v8",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5",
  minus: "M5 12h14",
  plus: "M5 12h14m-7-7v14",
  reset: "M3 4v6h6m-5.2-.4A8 8 0 1 1 4 16",
  orbit: "M3 13c-1-4 9-9 15-7s3 6-1 9-12 5-14 1m8-13 3 1-1 3m-4 5a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
  close: "m6 6 12 12M6 18 18 6",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  arrow: "M5 18 18 5M6 5h12v12",
};
export const icon = (k) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[k]}"/></svg>`;
export const plan = `<svg viewBox="0 0 190 76" fill="none" stroke="#c7bb96" stroke-width=".8"><path stroke-dasharray="2 3" opacity=".6" d="M0 14h186M0 61h186M24 4v69m125-69v69"/><g transform="translate(11 4)"><path stroke-width="1.3" d="M7 57V10h128v47h-21m-80 0H7"/><path d="M11 53V14h119v39M12 25h116m-97-11v11m26-11v11m26-11v11m26-11v11M11 28h13v24H11m24-14h46v11H35zm66-6h22v18h-22z"/><path d="M31 13v9h20m7-9v9h20m7-9v9h20M38 40h18v7H38m22-7h18v7H60" opacity=".65"/></g><path d="m167 48 4-14 4 14-4-4z"/><text x="168" y="30" font-size="7" fill="#c7bb96" stroke="none" font-family="monospace">N</text></svg>`;
export function plate(p) {
  return `<div class="plate" style="--art:${p.ink};--tint:${p.tint}"><div class="cardhead"><span>Fig. ${p.no}</span><i>${icon("arrow")}</i></div><div class="artwell"><div class="packfallback">NEW MOON<small>(placeholder pack art)</small></div><img src="../products/${p.slug}/preview.png" alt="" loading="lazy"></div></div>`;
}
export function hydrateImages(root) {
  root.querySelectorAll(".artwell img").forEach((img) => {
    const show = () => img.parentNode?.classList.add("ready");
    img.addEventListener("load", show);
    img.addEventListener("error", () => (img.hidden = true));
    if (img.complete) {
      if (img.naturalWidth) show();
      else img.hidden = true;
    }
  });
}
