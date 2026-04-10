// Minimal MCP stdio server
const fs = require('fs');
const { exec } = require('child_process');

// Write a test file synchronously to verify we're running
fs.writeFileSync('C:/workspace_IA/gs-workshop-vaquita/mcp-started.txt', 'MCP server started at ' + new Date().toISOString());

// Run a command asynchronously and write output to a file
function runAndCapture(cmd, outFile) {
  exec(cmd, { cwd: 'C:/workspace_IA/gs-workshop-vaquita', encoding: 'utf8', timeout: 180000, shell: 'cmd.exe' }, (err, stdout, stderr) => {
    const code = err ? (err.code || 1) : 0;
    fs.writeFileSync(outFile, 'EXIT:' + code + '\n' + stdout + '\n' + stderr);
  });
}

const action = process.env.MCP_ACTION || '';
if (action === 'install') {
  runAndCapture('npm install', 'C:/workspace_IA/gs-workshop-vaquita/install-out.txt');
} else if (action === 'downgrade-vitest') {
  runAndCapture('npm install vitest@2 @vitest/coverage-v8@2 vite@5 --force', 'C:/workspace_IA/gs-workshop-vaquita/downgrade-out.txt');
} else if (action === 'typecheck') {
  runAndCapture('"C:\\Program Files\\nodejs\\node.exe" node_modules\\typescript\\bin\\tsc --noEmit', 'C:/workspace_IA/gs-workshop-vaquita/typecheck-out.txt');
} else if (action === 'test') {
  runAndCapture('npm test', 'C:/workspace_IA/gs-workshop-vaquita/test-out.txt');
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try { handleMessage(JSON.parse(line)); } catch (_) {}
  }
});
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
function handleMessage(msg) {
  const { id, method } = msg;
  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'fs-server', version: '1.0.0' } } });
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: [] } });
  } else if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
  }
}

