// Script to generate PWA icons from SVG
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

const sizes = [
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-192.png', size: 192 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32.png', size: 32 },
    { name: 'favicon-16.png', size: 16 },
];

async function generateIcons() {
    for (const { name, size } of sizes) {
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(join(publicDir, name));
        console.log(`✓ Generated ${name}`);
    }
    console.log('✓ All icons generated!');
}

generateIcons().catch(console.error);
