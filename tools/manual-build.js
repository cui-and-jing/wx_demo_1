const fs = require('fs');
const path = require('path');
const target = path.resolve(__dirname, '..', 'game.js');
if (fs.existsSync(target)) {
  console.log('[build] 已包含预构建的 game.js，可直接导入项目使用。');
  console.log('[build] 如需重新打包，请在本地使用任意 TS->JS 打包工具生成 game.js 并覆盖。');
} else {
  console.error('[build] 未找到 game.js，请手动将 src 代码打包为单文件后放置于项目根目录。');
  process.exit(1);
}
