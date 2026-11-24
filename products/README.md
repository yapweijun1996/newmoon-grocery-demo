# New Moon mock pack studies

`catalog.json` is the public asset index. Each slug contains a self-contained, Y-up Draco GLB in metres with its origin at the base, an RGBA catalogue photograph, an editable label master and a Blender entry point. No licensed brand artwork or scanned products are used. Shapes, colours, sizes and contents are illustrative.

From the repository root, run `blender -b --python-exit-code 1 --python products/cny-hamper-basket/generate.py` (substitute any SKU). Tested with Blender 5.2 and the bundled glTF exporter/Draco encoder. `studio.py` contains the shared modelling and studio lighting rigs. Only the merchandise is exported; the preview lights and camera are added afterwards. Keep previews as transparent PNGs under 250 KB; downsample them if replacement art makes them larger.

To replace the pack art, keep the front orientation and filename of the relevant `label.png`, replace it with owner-approved art, then rebuild the model and any sets/fixtures containing it. The optional `python3 products/letterpress.py` regenerates and overwrites **all** mock label masters; it requires Pillow and system serif/sans fonts (or set `SERIF_FONT` and `SANS_FONT`).
