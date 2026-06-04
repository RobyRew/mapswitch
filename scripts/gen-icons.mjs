// Generate the PWA / Apple home-screen PNG icons from the brand mark (the same
// blue pin as public/favicon.svg). Re-run after changing the logo:
//   npm run icons
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// White location pin (matches favicon.svg), on a #007aff field.
const PIN =
  '<path d="M16 6c-4.07 0-7.5 3.2-7.5 7.36 0 5.13 6.6 11.36 7.04 11.77a.66.66 0 0 0 .92 0c.44-.41 7.04-6.64 7.04-11.77C23.5 9.2 20.07 6 16 6Zm0 10.2a2.84 2.84 0 1 1 0-5.68 2.84 2.84 0 0 1 0 5.68Z" fill="#ffffff"/>';

// rx is in the 0–32 viewBox: 7 = rounded app icon, 0 = full-bleed (maskable/Apple).
const svg = (size, rx) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">` +
  `<rect width="32" height="32" rx="${rx}" fill="#007aff"/>${PIN}</svg>`;

const png = async (size, rx, file) => {
  await sharp(Buffer.from(svg(size, rx)))
    .png({ compressionLevel: 9 })
    .toFile(join(pub, file));
  console.log('wrote', file);
};

await png(192, 7, 'icon-192.png'); // Android, purpose "any"
await png(512, 7, 'icon-512.png'); // Android, purpose "any" + splash
await png(512, 0, 'icon-maskable-512.png'); // Android adaptive (masked)
await png(180, 0, 'apple-touch-icon.png'); // iOS home screen (iOS rounds it)
