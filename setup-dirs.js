const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dirs = ['config','db','errors','models','repositories','services','validators','middleware','routes'];
const basePath = path.join(__dirname, 'src');

dirs.forEach(d => {
  const fullPath = path.join(basePath, d);
  fs.mkdirSync(fullPath, {recursive:true});
  console.log(`Created: ${fullPath}`);
});

console.log('All directories created successfully!');
console.log('\nInstalling jsonwebtoken and @types/jsonwebtoken...');
execSync('npm install jsonwebtoken @types/jsonwebtoken', { cwd: __dirname, stdio: 'inherit' });
console.log('npm install complete.');
