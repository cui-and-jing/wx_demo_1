const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error('用法: node tools/decode-bundle.js <base64.txt> [输出文件]');
  process.exit(1);
}

const inputPath = path.resolve(process.argv[2]);
const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : (() => {
      const dir = path.dirname(inputPath);
      const base = path.basename(inputPath).replace(/\.base64\.txt$/, '');
      return path.join(dir, base || 'bundle.tar.gz');
    })();

if (!fs.existsSync(inputPath)) {
  console.error(`[decode] 找不到 Base64 文件: ${inputPath}`);
  process.exit(1);
}

const content = fs.readFileSync(inputPath, 'utf8');
const normalized = content.replace(/\s+/g, '');
try {
  const buffer = Buffer.from(normalized, 'base64');
  fs.writeFileSync(outputPath, buffer);
  console.log(`[decode] 已输出压缩包 -> ${outputPath}`);
} catch (err) {
  console.error('[decode] 解析失败，请确认输入内容是否完整。');
  console.error(err);
  process.exit(1);
}
