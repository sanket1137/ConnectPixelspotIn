import { spawn } from 'child_process';
import process from 'process';

console.log('🚀 Starting local dev server with production database (.env.production)...');

const isWin = process.platform === 'win32';
const cmd = isWin ? 'cmd.exe' : 'npx';
const args = isWin
  ? ['/c', 'npx', 'tsx', 'watch', '--env-file=.env.production', 'server/index.ts']
  : ['tsx', 'watch', '--env-file=.env.production', 'server/index.ts'];

const child = spawn(cmd, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    USE_PROD_DB: 'true',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
