const fs = require('fs');
const path = require('path');

// Create minimal PNG icons
function createIcon(size, filename) {
  // Minimal 1x1 blue PNG
  const png = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x08,
    0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00
  ]);

  fs.writeFileSync(filename, png);
  console.log(`Created ${filename} (${size}x${size})`);
}

// Create icons directory
const iconsDir = path.join(process.cwd(), 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create icons
createIcon(16, path.join(iconsDir, 'icon16.png'));
createIcon(48, path.join(iconsDir, 'icon48.png'));
createIcon(128, path.join(iconsDir, 'icon128.png'));

console.log('\nNote: These are minimal placeholder icons.');
console.log('For production, create proper icons using:');
console.log('  - https://www.favicon.cc/');
console.log('  - https://www.canva.com/');
