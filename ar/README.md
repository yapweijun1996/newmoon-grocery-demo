# The Gifting Room

A mobile-first, static WebAR catalogue. `/ar/` is the landing page for the **mock CNY MRT poster QR**. `?product=<catalogue-slug>` opens that product directly (used by the store). The QR itself always points to the configured poster destination, not the last product viewed.

## Local preview

From the repository root:

```sh
npm ci --prefix ar
python3 -m http.server 8921 --bind 127.0.0.1
```

Visit <http://127.0.0.1:8921/ar/>. The committed `vendor/` directory provides the runtime dependencies; no npm install is needed to view the site. To regenerate it, `npm ci` runs `prepare.mjs`: this copies the npm model-viewer distribution and Three's `examples/jsm/libs/draco/gltf/` decoder into `ar/vendor/` and bundles the QR encoder as an ES module. If lifecycle scripts are disabled, run `npm run prepare --prefix ar` explicitly. Do not open `index.html` as a `file:` URL. The page does not require a CDN, a QR API, Spark splats, or access to the gallery repo at runtime.

## Host over HTTPS

1. Set `POSTER_URL` in `ar/config.js` to the final public HTTPS URL, e.g. `https://gifts.example.com/ar/`. Leave it empty to encode the page's current origin and pathname. A `localhost` QR is only useful on the machine hosting it.
2. Run the npm step above. Publish **both sibling directories**: `ar/{index.html,style.css,app.js,config.js,vendor/}` and `products/{catalog.json,<each-slug>/model.glb,<each-slug>/preview.png}`. Preserve all relative paths. Serve the GLBs directly at stable public URLs (no login or HTML fallback). The decoder needs its wrapper and WASM together. Use MIME types `model/gltf-binary` for GLB, `application/wasm` for WASM and `text/javascript` for JS.
3. Use an HTTPS static host or a TLS-enabled server. For example, point DNS at a server running Caddy, place the publish tree under `/srv/newmoon`, and use this Caddyfile (replace the domain):

   ```caddy
   gifts.example.com {
       root * /srv/newmoon
       file_server
   }
   ```

   Allow incoming ports 80/443 for certificate issuance and HTTPS. No Git remote, CI or GitHub repo is required. For a private device trial, a trusted HTTPS test domain/tunnel is also suitable. Plain HTTP on a LAN IP is **not** equivalent to localhost's secure-context exception.

## AR and scope

- The page uses `ar-modes="webxr scene-viewer quick-look"` and does **not** set `ios-src`. Quick Look uses model-viewer's on-demand USDZ conversion. WebXR and the Quick Look delivery flow need a secure HTTPS deployment. AR uses the model's metre scale; scaling is fixed for placements that support it.
- Select any of the six objects, drag or pinch to inspect, and use the pause/resume button to control automatic rotation. The viewer respects reduced-motion preferences. The AR button becomes available once the new GLB has loaded. It calls `activateAR()` on a supported browser; otherwise it explains the device requirement and links to the poster QR.
- All pack designs, the collection and the MRT campaign are **mock**. The meshes, local QR, 3D viewer and AR handoff code are functional. No purchases, camera simulation or fictitious successful placements.

## Verification

With the local server running, run `node ar/check.mjs` from the repo root. It uses Playwright from `~/workspace/Blender-3D-Gallery/node_modules/playwright` (override via `PLAYWRIGHT_PATH`). `AR_URL` can override the local page address for a test configuration with an empty `POSTER_URL`. It loads each GLB in real headless Chromium, checks local Draco traffic, picker state, SKU deep links, rotation, AR fallback and dispatch, QR, and narrow/desktop layout. Screenshots are written under `ar/screenshots/`.

The local run passed for all six models. The 1440 px desktop and 390 px mobile screenshots were visually inspected, with an additional overflow check at 320 px. An independent QR reader decoded both screenshots to the local page; a custom HTTPS destination was also decoded from the rendered QR in a touch-enabled Chromium viewport.

**Physical iPhone and Android AR were not tested.** Before printing a poster, scan the final QR on both platforms. In Safari on iPhone, check on-demand USDZ, labels, orientation, scale and Quick Look placement. On an ARCore-capable Android phone, check the WebXR session or Scene Viewer handoff, camera permissions, floor placement and return to the catalogue. Desktop logic checks are not a substitute for these tests.
