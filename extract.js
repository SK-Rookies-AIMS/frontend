const { execSync } = require('child_process');
const fs = require('fs');
const source = execSync('git show HEAD:src/pages/ManufacturingPage.tsx', { encoding: 'utf8' });
const lines = source.split('\n');
let imports = [];
let inImport = false;
let currentImport = '';
for (const line of lines) {
  if (line.startsWith('import ')) {
    inImport = true;
    currentImport = line;
  } else if (inImport) {
    currentImport += '\n' + line;
  }
  if (inImport && (currentImport.includes('"') || currentImport.includes("'"))) {
    imports.push(currentImport);
    inImport = false;
    currentImport = '';
  }
}
fs.writeFileSync('imports.txt', imports.join('\n'));
