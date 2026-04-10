#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const checks = [
  { name: 'package.json', path: 'package.json' },
  { name: 'TypeScript config', path: 'tsconfig.json' },
  { name: 'Git ignore', path: '.gitignore' },
  { name: 'Environment template', path: '.env.example' },
  { name: 'Environment config', path: '.env' },
  { name: 'Config module', path: 'src/config/index.ts' },
  { name: 'Database schema', path: 'src/db/schema.sql' },
  { name: 'Database module', path: 'src/db/database.ts' },
  { name: 'Custom errors', path: 'src/errors/customErrors.ts' },
  { name: 'Error handler middleware', path: 'src/middleware/errorHandler.ts' },
  { name: 'Type definitions', path: 'src/models/types.ts' },
  { name: 'Validation schemas', path: 'src/validation/schemas.ts' },
  { name: 'Express app', path: 'src/app.ts' },
  { name: 'Server entry point', path: 'src/index.ts' },
  { name: 'Test setup', path: 'tests/setup.ts' },
  { name: 'Built output', path: 'dist/index.js' },
];

console.log('🔍 Verifying Phase 1 Setup...\n');

let allPass = true;

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${check.name}: ${check.path}`);
  if (!exists) allPass = false;
});

console.log('\n📁 Folder Structure:');
const folders = [
  'src/config',
  'src/db',
  'src/errors',
  'src/middleware',
  'src/models',
  'src/repositories',
  'src/routes',
  'src/services',
  'src/validation',
  'tests/api',
];

folders.forEach(folder => {
  const exists = fs.existsSync(folder);
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${folder}`);
  if (!exists) allPass = false;
});

console.log('\n📦 Dependencies:');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const requiredDeps = ['express', 'better-sqlite3', 'zod', 'dotenv'];
const requiredDevDeps = ['typescript', 'tsx', 'vitest', 'supertest', '@types/express'];

requiredDeps.forEach(dep => {
  const exists = pkg.dependencies && dep in pkg.dependencies;
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${dep}`);
  if (!exists) allPass = false;
});

requiredDevDeps.forEach(dep => {
  const exists = pkg.devDependencies && dep in pkg.devDependencies;
  const icon = exists ? '✅' : '❌';
  console.log(`${icon} ${dep} (dev)`);
  if (!exists) allPass = false;
});

console.log('\n' + '='.repeat(50));
if (allPass) {
  console.log('✅ Phase 1 Setup Complete!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Review PHASE1_COMPLETE.md for details');
  console.log('   2. Start Phase 2: Implement repositories');
  console.log('   3. Run: npm run dev');
} else {
  console.log('❌ Some checks failed. Please review above.');
  process.exit(1);
}
