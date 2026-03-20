import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const viteBin = join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn('node', [viteBin, 'build'], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  process.exit(code);
});
