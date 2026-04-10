#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
try {
  const testOut = execSync('npx vitest run --reporter=verbose 2>&1', {
    cwd: 'C:/Sources/IATraining', encoding: 'utf8', timeout: 120000,
    env: { ...process.env, JWT_SECRET: 'mcp-test-secret', NODE_ENV: 'test' }
  });
  fs.writeFileSync('C:/Sources/IATraining/test-output.txt', testOut);
} catch(e) {
  fs.writeFileSync('C:/Sources/IATraining/test-output.txt', (e.stdout || '') + '\nSTDERR:\n' + (e.stderr || '') + '\nMESSAGE:\n' + e.message);
}
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => { const t = line.trim(); if (!t) return; try { handleMessage(JSON.parse(t)); } catch(_){} });
rl.on('close', () => process.exit(0));
function send(o) { process.stdout.write(JSON.stringify(o) + '\n'); }
function handleMessage(msg) {
  if (!msg.id && msg.method) return;
  if (msg.method === 'initialize') send({ jsonrpc:'2.0', id:msg.id, result:{ protocolVersion:'2024-11-05', capabilities:{ tools:{} }, serverInfo:{ name:'node-exec', version:'1.0.0' } }});
  else if (msg.method === 'tools/list') send({ jsonrpc:'2.0', id:msg.id, result:{ tools:[] }});
}


const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    handleMessage(JSON.parse(trimmed));
  } catch (_) {}
});

rl.on('close', () => process.exit(0));

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function handleMessage(msg) {
  if (!msg.id && msg.method) return; // notification, no response needed
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'node-exec', version: '1.0.0' }
    }});
  } else if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: [{
      name: 'run_node',
      description: 'Execute Node.js code via child_process on the host system',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Node.js code to run with node -e' },
          cwd: { type: 'string', description: 'Working directory (default: C:/Sources/IATraining)' }
        },
        required: ['code']
      }
    }]}});
  } else if (msg.method === 'tools/call') {
    if (msg.params && msg.params.name === 'run_node') {
      const code = msg.params.arguments.code;
      const cwd = msg.params.arguments.cwd || 'C:/Sources/IATraining';
      try {
        const out = execSync('node -e ' + JSON.stringify(code), { cwd, encoding: 'utf8', timeout: 30000 });
        send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: out || 'OK' }] }});
      } catch (err) {
        send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'ERROR: ' + err.message }], isError: true }});
      }
    }
  }
}

process.stdin.on('end', () => process.exit(0));
