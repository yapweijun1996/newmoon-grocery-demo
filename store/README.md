# Store atlas

An orbitable model shop and a Gaussian-splat placement studio. Both use the same Three.js scene, product meshes, picking, cards and session basket. The model shop is an architectural **mock**, not a reconstruction of a New Moon location. No real scan or brand artwork is included.

## Open the atlas

From the repo root:

```sh
cd store
npm ci
npm start
```

Open **http://127.0.0.1:4186/store/**. This serves the **repository root**, not just `store/`: the browser also needs `../products/` and `../ar/`. A different static HTTP server is fine if it serves those siblings, ES modules, WASM and the committed `store/vendor/` files. Requires WebGL2. No bundler, API key, external font, CDN or paid service is required. The scan renderer is imported only when opening a splat.

- **Model store:** drag with one finger to orbit. Pinch, scroll or use the zoom buttons; reset restores the cutaway view. Expand gives the scene the full window. Tap an object or its numbered pin, or use the keyboard-accessible shelf index.
- **Product card:** shows a mock SGD price, adds to the tab's mock basket and links to `../ar/?product=<slug>`. Basket quantities survive refresh via session storage; there is no checkout, order submission or inventory backend.
- **Splat scan:** without a capture, a **MOCK · NO SCAN LOADED** calibration shelf appears. Choose a file to replace the shelf with a Spark `SplatMesh`; the five product meshes remain interactive. Orbit, pinch or use two fingers to pan/zoom (secondary-button drag to pan on desktop). **Frame scan** finds a capture that's away from the products; **Reset camera** returns to the product placements. **Unload** releases the scan and returns to the mock shelf.

## Capture a real store on a phone

1. Get permission to capture the location. Work when the aisle is empty; avoid identifiable shoppers, receipts and screens. Start with a single counter or gifting corner rather than the whole shop. Keep lights and stock still. Measure a shelf width or counter height for scale.
2. In **Scaniverse**, start a **Splat** capture, not a mesh scan. Walk slowly around the display, keeping each area in view across overlapping positions. Make a second pass at a different height and capture the sides. Avoid quick pans, moving merchandise and large reflective surfaces. Process the splat, inspect it from several angles, and trim stray geometry if the app offers a crop.
3. In the processed capture's **Share / Export** options, choose a **Gaussian splat**, select **SPZ** and save the `.spz` file to Files. Menu names vary by release. In **Polycam**, use a **Gaussian Splatting** capture/processing option, not LiDAR mesh export. Export SPZ if available; if your version offers **Gaussian PLY** instead, use it directly. Export options vary by version, device and plan; no subscription is needed for this viewer. Ordinary mesh PLYs, point-cloud PLYs, GLBs and public capture-page URLs are not substitutes for a Gaussian splat file.
4. Under **Splat scan → Choose a scan**, select the file. The picker reads bytes locally in the browser; it does not upload the capture. For a repeatable local link, drop the export into e.g. `store/scans/counter.spz` and open `/store/?splat=./scans/counter.spz`. Or provide a direct HTTP(S) file URL ending in `.spz`, `.ply` or `.splat` (URL-encode the entire parameter value; the host must permit CORS). Keep private captures out of Git. If the display starts off-screen try **Frame scan**. The loaded capture is a user asset, not an authenticated New Moon location.

### Align the products

`placement.json` is loaded at startup. It defines a scan transform, the starting camera and one transform per product slug. Coordinates are **Three.js world metres**, **+Y up**, **+Z toward the default viewer**; rotations are local XYZ Euler angles in **radians**, scale is an XYZ multiplier. Product origins are centred on their base. Hybrid mode retains the GLBs' native metre scale. The model-shop exhibits use separate, deliberately enlarged display sizes.

The shipped file is a **mock layout**, not an alignment for an unknown scan. Use the measured shelf to set `scan.scale` uniformly, rotate it upright if necessary, then translate its floor to Y=0. Set each product's `position` to its shelf location (Y is the base height) and rotate it to face the aisle. Set `camera.target` to a point among the products and `camera.offset` to the vector from there to the desired eye position. `width` and `minHeight` control the initial framing at that distance. Reload after editing. Example: a 90° yaw at a 1.1 m counter height:

```json
{"position": [0.45, 1.1, -0.2], "rotation": [0, 1.5708, 0], "scale": [1, 1, 1]}
```

No Blender installation or splat re-export is required. If authoring placements separately in Blender 5.3, use the original scan file in the viewer; convert placement transforms from Blender's Z-up basis to the Three.js Y-up basis (position `[x,z,-y]`, basis-convert the rotation matrix before extracting XYZ angles). Blender's splat import/render support does not imply splat export. The shared Blender installation was not changed or used for this folder.

## Products, fixtures and mock art

- `catalog.js`: five SKUs with display names, mock prices, descriptions, swatches and slugs. Preview art comes from `../products/<slug>/preview.png`. Product loading tries `../products/<slug>/model.glb`, then `../products/<slug>.glb`. A missing GLB leaves a labeled carton, retried on window focus and every 30 seconds until present. Replace `NEW MOON (placeholder pack art)` in the product sources, rebuild their GLBs/previews and reload. No real logos are used.
- `room.js`: generated shop shell, arched built-ins, stock, windows, counter/island, plants and gifting plinth. Static architecture is merged by material. `viewer.js`: orbit, Draco decoding, fixtures, product placement/picking and scan lifecycle.
- `assets/grocery-refill-island.glb` and `assets/rotan-pendant-showroom.glb`: unmodified copies from local read-only `Blender-3D-Gallery`, `origin/main` at `4ba775fe`, `models/sgmy-mall-{grocery-refill-island,rotan-pendant-showroom}/model.glb`. The showroom contributes its woven shades, luminaires and suspension pieces. The decoder is served locally from `store/vendor/three/draco/`. No new glTF extras are needed.

## Verification

`npm test` starts a temporary loopback server and runs headless Chromium via Playwright installed in `~/workspace/Blender-3D-Gallery/node_modules/playwright` (override `PLAYWRIGHT_PATH` if needed). On macOS the test uses installed Chrome with Metal; elsewhere it uses Playwright Chromium. Tested the two Draco fixtures, five product GLBs, actual mesh taps, numbered pins, orbit and touch drag, zoom/reset, expanded view, card/basket/AR link, missing-GLB recovery, scan picker, URL load, unload, scan framing and missing-URL error state.

`tests/make-swatches.py` deterministically writes three geometric colour rings as **1,020 synthetic Gaussians**, in `.spz`, `.ply` and `.splat`. They are **not a store scan** and are never loaded by default. To exercise the URL path, open `/store/?splat=tests/mock-swatches.spz`. All three formats were loaded by the picker, and the hybrid composition was visually inspected.

Real browser screenshots are in [`evidence/`](./evidence/): desktop model, product card, empty scan studio, synthetic splat hybrid, mobile model and mobile card. Not verified: physical phone capture/export, real-store alignment or scan quality, very large scan performance on phones, and native AR handoff on a device. No marketing render or AI-generated world is represented as a real scan.
