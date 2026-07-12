const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Pastikan folder public/icons ada
const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG template untuk icon
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0B2B4A"/>
  <rect x="30" y="30" width="452" height="452" rx="60" fill="none" stroke="#E87A2A" stroke-width="4"/>
  <text x="256" y="330" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">C</text>
  <text x="256" y="400" font-size="36" text-anchor="middle" fill="#E87A2A" font-family="Arial, sans-serif" font-weight="bold" letter-spacing="4">COOL</text>
  <text x="256" y="430" font-size="16" text-anchor="middle" fill="#8ab4d6" font-family="Arial, sans-serif" font-weight="normal" letter-spacing="2">SYSTEM V3</text>
</svg>
`;

// Generate icon dengan berbagai ukuran
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    console.log('🔄 Generating icons...');
    
    for (const size of sizes) {
      const filename = `icon-${size}.png`;
      const filepath = path.join(iconsDir, filename);
      
      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(filepath);
      
      console.log(`✅ Generated ${filename}`);
    }
    
    console.log('🎉 All icons generated successfully!');
    console.log(`📍 Location: ${iconsDir}`);
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons();