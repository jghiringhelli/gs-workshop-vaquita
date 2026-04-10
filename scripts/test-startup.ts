import { createApp } from '../src/app';
import { getDatabase } from '../src/db/database';

console.log('Testing startup...');

try {
  const db = getDatabase();
  console.log('✅ Database connected');

  const app = createApp();
  console.log('✅ Express app created');

  console.log('\n🎉 All systems ready!');
  console.log('Run: npm run dev');

  process.exit(0);
} catch (error) {
  console.error('❌ Startup failed:', error);
  process.exit(1);
}
