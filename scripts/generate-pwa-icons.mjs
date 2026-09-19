/**
 * Rasterises public/icons/icon.svg into the PNG sizes declared in
 * public/manifest.json, plus apple-touch-icon.png.
 *
 * The manifest referenced eight icon-*.png files that were never generated, so
 * every one 404'd and the PWA could not be installed. Run after changing the SVG:
 *   node scripts/generate-pwa-icons.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

const SVG = path.resolve('public/icons/icon.svg');
const OUT = path.resolve('public/icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const svg = fs.readFileSync(SVG, 'utf-8');

for (const size of SIZES) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
    fs.writeFileSync(path.join(OUT, `icon-${size}.png`), png);
    console.log(`  icon-${size}.png  ${png.length} bytes`);
}

// iOS uses its own link rel; 180px is the current recommended size.
const apple = new Resvg(svg, { fitTo: { mode: 'width', value: 180 } }).render().asPng();
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), apple);
console.log(`  apple-touch-icon.png  ${apple.length} bytes`);
