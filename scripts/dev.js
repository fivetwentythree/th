import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const watchDir = path.join(root, 'content', 'chats');
const generatorPath = path.join(root, 'scripts', 'generate-chat-pages.js');

let generating = false;
let pending = false;
let timer = null;

function runGenerator() {
  if (generating) {
    pending = true;
    return;
  }

  generating = true;
  const proc = spawn(process.execPath, [generatorPath], { stdio: 'inherit' });
  proc.on('close', () => {
    generating = false;
    if (pending) {
      pending = false;
      runGenerator();
    }
  });
}

function scheduleGenerate() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    runGenerator();
  }, 150);
}

if (fs.existsSync(watchDir)) {
  fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith('.md')) return;
    scheduleGenerate();
  });
}

runGenerator();

const vite = spawn('vite', [], { stdio: 'inherit', shell: true });

function shutdown() {
  vite.kill('SIGTERM');
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
