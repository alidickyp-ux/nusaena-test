const fs = require('fs');
const path = require('path');

const apiDir = './src/app/api';
const exportLine = "export const dynamic = 'force-dynamic';\n";

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Cek apakah sudah ada export const dynamic
  if (content.includes('export const dynamic')) {
    console.log(`✅ Already has dynamic export: ${filePath}`);
    return;
  }
  
  // Cari posisi import terakhir
  const importRegex = /^import .*$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.indexOf(lastImport) + lastImport.length;
    
    // Insert setelah import terakhir
    const newContent = 
      content.slice(0, lastImportIndex) + 
      '\n' + exportLine + 
      content.slice(lastImportIndex);
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Added dynamic export to: ${filePath}`);
  } else {
    // Jika tidak ada import, tambahkan di awal
    const newContent = exportLine + content;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Added dynamic export to: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file === 'route.ts' || file === 'route.js') {
      processFile(fullPath);
    }
  }
}

walkDir(apiDir);
console.log('🎉 Done!');