// Vendor only the modules this page actually uses; no CDN calls at runtime.
import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('.', import.meta.url)));
await mkdir('vendor', {recursive: true});
await cp('node_modules/@google/model-viewer/dist/model-viewer.min.js', 'vendor/model-viewer.js');
await cp('node_modules/three/examples/jsm/libs/draco/gltf', 'vendor/draco', {recursive: true});
await build({stdin: {contents: "export { create } from 'qrcode';", resolveDir: process.cwd()}, outfile: 'vendor/qr.js', platform: 'browser', bundle: true, minify: true, format: 'esm'});
