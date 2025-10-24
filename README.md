# 羊了个羊·叠层挑战（微信小游戏 MVP）

这是一个使用 TypeScript + Canvas 2D 编写的微信小游戏示例项目，提供“羊了个羊”类叠层三消玩法的最小可玩版本。项目满足微信小游戏运行时规范，**已附带预构建好的 `game.js`**，导入微信开发者工具即可运行。

## 项目结构

```
/project-root
├── assets/                # 占位资源说明（无二进制文件，纹理运行时生成）
├── src/                   # TypeScript 源码
│   ├── index.ts           # 入口，初始化渲染与主循环
│   ├── game.ts            # 游戏状态机、流程控制
│   ├── board.ts           # 叠层牌面模型，可见性、选牌
│   ├── slot.ts            # 底部槽位与三消判定、动画
│   ├── level.ts           # 关卡与难度生成
│   ├── renderer.ts        # Canvas 渲染与适配
│   ├── ui.ts              # 简易 UI 按钮与命中检测
│   ├── input.ts           # 触摸输入转换
│   ├── share.ts           # 分享文案生成与占位图
│   ├── ads.ts             # 广告封装（无可用时自动降级）
│   ├── analytics.ts       # 埋点封装（console 输出）
│   ├── storage.ts         # 本地存档：最佳分、胜场、难度种子
│   ├── types.ts / utils.ts
│   └── ...
├── tools/logic-check.js   # 纯逻辑快速校验脚本（无第三方依赖）
├── game.json              # 小游戏配置
├── project.config.json    # 微信开发者工具配置示例
├── tsconfig.json
├── package.json
├── game.js                # 预构建好的小游戏主包
└── README.md
```

## 快速开始

1. （可选）执行 `npm run build`：该命令会检查项目根目录的 `game.js` 是否存在，并提示如何在本地重新打包。由于仓库已经附带了 `game.js`，通常无需额外构建步骤。
2. （可选）想要“一键打包”用于传输/备份，可运行 `npm run pack`。脚本会在 `dist/` 目录下生成：
   - macOS/Linux: `dist/minigame-bundle.tar.gz`
   - Windows: `dist/minigame-bundle.zip`
   - 以及对应的 `*.base64.txt` 文本文件，可安全粘贴到 GitHub Web 编辑器或其他只接受文本的渠道。
   压缩包内含所有必须文件（含 `game.js` 与源码说明），直接解压即可导入微信开发者工具。
   若收到的是 `*.base64.txt` 文本，可使用 `npm run decode -- <base64.txt> [输出文件]` 还原成压缩包，或手动运行 `node tools/decode-bundle.js`。
3. 打开 **微信开发者工具**，选择“小游戏”模式并导入项目根目录；若无正式 AppID，可使用测试号 `touristappid`。
4. 在开发者工具中点击“运行”即可体验：首页 -> 开始挑战 -> 游戏内叠层三消 -> 胜利/失败结算 -> 重开或复制分享文案。

> 如需重新打包 `src` 下的 TypeScript，可在本地使用熟悉的打包工具（例如 esbuild、tsc、rollup 等）生成新的 `game.js` 覆盖即可。

## 核心玩法说明

- 关卡由 4–6 层网格叠层生成，层级越高卡牌越稀疏，并带有轻微随机偏移；
- 只有中心未被更高层覆盖的卡牌可点击；
- 选牌后放入底部 7 格槽位，槽位满则失败；
- 任意图案收集到 3 张即消除，得分 +10，并根据 1.2 秒内的连击次数额外 +5、+10…；
- 全部卡牌清空即胜利，连击、胜场会轻度提升后续关卡难度。

## 运行时特性

- **分辨率适配**：逻辑坐标固定 750×1334，Renderer 根据设备窗口计算缩放与 Letterbox；
- **动画**：卡牌点击带缩放高亮，槽位卡牌平滑移动，三消产生淡出上浮效果；
- **UI**：顶部分数/时间/连击提示，底部槽位条，暂停/继续与结算按钮；
- **存档**：`wx.setStorageSync` 记录最佳分、累计胜场与难度种子，方便持续挑战；
- **卡面纹理**：Renderer 根据卡牌类型颜色实时绘制内层纹理，无需外部 PNG；
- **分享**：`share.ts` 内置 Base64 占位分享图，生成标题+文案并支持一键复制；
- **广告预留**：`ads.ts` 封装激励视频/插屏创建，若平台不支持则降级为 no-op；
- **埋点**：`analytics.ts` 将 `game_start/select_card/triple_match/fail_full_slots/win/restart` 等事件输出到控制台，便于后续对接真实埋点；
- **音效**：接口已留出（可在选牌/消除处接入真实音频）。

## 可选校验脚本

为了快速验证关卡生成的可消性，可运行：

```bash
npm run logic-check
```

脚本使用与游戏内相同的随机与生成逻辑（无第三方依赖），将输出牌面数量、是否为 3 的倍数及层数统计，便于调试关卡参数。

## 常见问题排查

| 情况 | 解决办法 |
| --- | --- |
| 黑屏/无渲染 | 确认 `game.js` 位于项目根目录，并在开发者工具中清空缓存后重新运行。 |
| 触摸坐标偏移 | 逻辑坐标固定 750×1334，请保持小游戏窗口为竖屏模式；若设备横屏，请在模拟器中切换方向。 |
| 点击无响应 | 仅最上层可见卡牌可被选中；可在调试器 Console 中查看 `[analytics] select_card` 日志确认命中。 |
| 分辨率模糊 | Renderer 会根据 `wx.getSystemInfoSync()` 的 `pixelRatio` 设置画布，请确认模拟器开启高清渲染。 |
| 需要重新打包 | 使用任意熟悉的打包工具将 `src/index.ts` 打包为 CommonJS 形式的 `game.js`（入口需执行游戏初始化），或参考仓库中现有的 `game.js` 结构自行调整。 |

## 开发建议

- 若需类型检查，可在本地安装 TypeScript (`npm install typescript`) 后运行 `npx tsc --noEmit`。
- 如需扩展 UI，可在 `ui.ts` 中追加按钮并在 `game.ts` 中管理可见性；
- 接入真实广告或分享时，可在 `ads.ts`、`share.ts` 中替换占位逻辑；
- 在 `level.ts` 中调整层数、密度、干扰组策略可控制难度曲线。

祝游戏开发顺利，玩得开心！
