const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const includeEntries = [
  'assets',
  'game.js',
  'game.json',
  'project.config.json',
  'package.json',
  'README.md',
  'tsconfig.json',
  'src',
  'tools',
];

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const archiveName = process.platform === 'win32'
  ? 'minigame-bundle.zip'
  : 'minigame-bundle.tar.gz';

const archivePath = path.join(distDir, archiveName);
const base64Path = path.join(
  distDir,
  process.platform === 'win32'
    ? 'minigame-bundle.zip.base64.txt'
    : 'minigame-bundle.tar.gz.base64.txt'
);

function ensureEntries() {
  const missing = includeEntries.filter((entry) => !fs.existsSync(path.join(projectRoot, entry)));
  if (missing.length > 0) {
    console.error('[pack] 以下文件或目录缺失，无法打包:', missing.join(', '));
    process.exit(1);
  }
}

function packPosix() {
  const args = ['-czf', archivePath, ...includeEntries];
  const result = spawnSync('tar', args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error('[pack] tar 打包失败，请确认系统已安装 tar 命令。');
    process.exit(result.status || 1);
  }
}

function packWindows() {
  const psCommand = [
    'Compress-Archive',
    '-Path', includeEntries.map((entry) => `"${path.join(projectRoot, entry)}"`).join(','),
    '-DestinationPath', `"${archivePath}"`,
    '-Force',
  ].join(' ');

  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', psCommand], {
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) {
    console.error('[pack] 无法使用 PowerShell Compress-Archive，请确认已安装 PowerShell 5+。');
    process.exit(result.status || 1);
  }
}

ensureEntries();

console.log('[pack] 正在打包小游戏资源...');
if (process.platform === 'win32') {
  packWindows();
} else {
  packPosix();
}
console.log(`[pack] 打包完成 -> ${archivePath}`);

try {
  const archiveBuffer = fs.readFileSync(archivePath);
  const base64 = archiveBuffer
    .toString('base64')
    .replace(/(.{76})/g, '$1\n');
  fs.writeFileSync(base64Path, base64, 'utf8');
  console.log(`[pack] 生成 Base64 文本 -> ${base64Path}`);
  console.log('[pack] 可复制该文本到 GitHub Web 编辑器，随后使用 decode 脚本还原为压缩包。');
} catch (err) {
  console.warn('[pack] Base64 文本生成失败，但压缩包已可用。', err);
}
