const fs = require('fs');
const path = require('path');

const dirsToCheck = ['./src/app/sorting', './src/app/handover', './src/app/putaway', './src/app/pickup'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Hapus hideNav={true} dan hideNav={false}
  content = content.replace(/hideNav=\{true\}/g, '');
  content = content.replace(/hideNav=\{false\}/g, '');
  
  // Bersihkan spasi berlebih
  content = content.replace(/<OperatorShell\s*>/g, '<OperatorShell>');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file === 'page.tsx' || file === 'page.js') {
      processFile(fullPath);
    }
  }
}

for (const dir of dirsToCheck) {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  }
}

console.log('🎉 Done!');