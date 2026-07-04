const fs = require('fs');
const content = fs.readFileSync('original_return.jsx', 'utf-8');

function extractTab(tabName) {
  const startStr = '{activeTab === "' + tabName + '" && (';
  let startIdx = content.indexOf(startStr);
  if (startIdx === -1) return null;
  startIdx += startStr.length;
  
  let braceCount = 1;
  let endIdx = startIdx;
  while (braceCount > 0 && endIdx < content.length) {
    if (content[endIdx] === '(') braceCount++;
    else if (content[endIdx] === ')') braceCount--;
    endIdx++;
  }
  return content.slice(startIdx, endIdx - 1).trim();
}

const pressJSX = extractTab('press');
const bodyJSX = extractTab('body');
const paintJSX = extractTab('paint');
const assemblyJSX = extractTab('assembly');

fs.writeFileSync('press_original.jsx', pressJSX);
fs.writeFileSync('body_original.jsx', bodyJSX);
fs.writeFileSync('paint_original.jsx', paintJSX);
fs.writeFileSync('assembly_original.jsx', assemblyJSX);
console.log('Extracted JSX blocks!');
