#!/usr/bin/env node
/**
 * Acceptance Test - Vertical Slice Demo
 * 
 * Tests the complete "Create User" flow end-to-end:
 * 1. Database schema
 * 2. Repository layer
 * 3. Service layer
 * 4. Validation layer
 * 5. Route handler
 * 6. HTTP response
 */

import { createApp } from '../src/app';
import request from 'supertest';
import { closeDatabase } from '../src/db/database';
import fs from 'fs';
import { CONFIG } from '../src/config';

const app = createApp();

async function runAcceptanceTests() {
  console.log('🧪 ACCEPTANCE TEST - Vertical Slice: Create User\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Create a user (Happy Path)
    console.log('\n✓ Test 1: Create a user');
    console.log('  POST /api/users');
    console.log('  Body: {"email":"alice@example.com","name":"Alice"}');
    
    const response1 = await request(app)
      .post('/api/users')
      .send({
        email: 'alice@example.com',
        name: 'Alice',
      });
    
    console.log(`  Status: ${response1.status}`);
    console.log(`  Response:`, JSON.stringify(response1.body, null, 2));
    
    if (response1.status !== 201) {
      throw new Error(`Expected 201, got ${response1.status}`);
    }
    
    if (!response1.body.id || response1.body.email !== 'alice@example.com') {
      throw new Error('Response body invalid');
    }
    
    console.log('  ✅ PASS - User created successfully');
    
    // Test 2: Duplicate email (Error Path)
    console.log('\n✓ Test 2: Duplicate email validation');
    console.log('  POST /api/users (same email)');
    
    const response2 = await request(app)
      .post('/api/users')
      .send({
        email: 'alice@example.com',
        name: 'Alice 2',
      });
    
    console.log(`  Status: ${response2.status}`);
    console.log(`  Response:`, JSON.stringify(response2.body, null, 2));
    
    if (response2.status !== 400) {
      throw new Error(`Expected 400, got ${response2.status}`);
    }
    
    if (response2.body.error !== 'ValidationError') {
      throw new Error('Expected ValidationError');
    }
    
    console.log('  ✅ PASS - Duplicate email rejected');
    
    // Test 3: Invalid email format (Validation)
    console.log('\n✓ Test 3: Email format validation');
    console.log('  POST /api/users');
    console.log('  Body: {"email":"invalid-email","name":"Bob"}');
    
    const response3 = await request(app)
      .post('/api/users')
      .send({
        email: 'invalid-email',
        name: 'Bob',
      });
    
    console.log(`  Status: ${response3.status}`);
    console.log(`  Response:`, JSON.stringify(response3.body, null, 2));
    
    if (response3.status !== 400) {
      throw new Error(`Expected 400, got ${response3.status}`);
    }
    
    console.log('  ✅ PASS - Invalid email rejected');
    
    // Test 4: Missing name (Validation)
    console.log('\n✓ Test 4: Required field validation');
    console.log('  POST /api/users');
    console.log('  Body: {"email":"test@example.com"}');
    
    const response4 = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
      });
    
    console.log(`  Status: ${response4.status}`);
    console.log(`  Response:`, JSON.stringify(response4.body, null, 2));
    
    if (response4.status !== 400) {
      throw new Error(`Expected 400, got ${response4.status}`);
    }
    
    console.log('  ✅ PASS - Missing field rejected');
    
    // Test 5: List users
    console.log('\n✓ Test 5: List users');
    console.log('  GET /api/users');
    
    const response5 = await request(app).get('/api/users');
    
    console.log(`  Status: ${response5.status}`);
    console.log(`  Users found: ${response5.body.length}`);
    console.log(`  Response:`, JSON.stringify(response5.body, null, 2));
    
    if (response5.status !== 200) {
      throw new Error(`Expected 200, got ${response5.status}`);
    }
    
    if (response5.body.length !== 1) {
      throw new Error(`Expected 1 user, got ${response5.body.length}`);
    }
    
    console.log('  ✅ PASS - Users listed correctly');
    
    // Test 6: Get user by ID
    console.log('\n✓ Test 6: Get user by ID');
    console.log(`  GET /api/users/${response1.body.id}`);
    
    const response6 = await request(app).get(`/api/users/${response1.body.id}`);
    
    console.log(`  Status: ${response6.status}`);
    console.log(`  Response:`, JSON.stringify(response6.body, null, 2));
    
    if (response6.status !== 200) {
      throw new Error(`Expected 200, got ${response6.status}`);
    }
    
    if (response6.body.id !== response1.body.id) {
      throw new Error('User ID mismatch');
    }
    
    console.log('  ✅ PASS - User retrieved by ID');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n✅ Vertical Slice Complete:');
    console.log('   1. Database schema ✓');
    console.log('   2. Repository (SQL) ✓');
    console.log('   3. Service (Business logic) ✓');
    console.log('   4. Validation (Zod) ✓');
    console.log('   5. Route handler (Express) ✓');
    console.log('   6. HTTP responses ✓');
    console.log('\n📊 Results: 6/6 tests passed (100%)');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    closeDatabase();
    
    // Clean up test database
    try {
      const dbPath = CONFIG.DATABASE_PATH;
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

runAcceptanceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
