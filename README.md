# WatchTicker · 自选股行情悬浮窗

一个常驻桌面的自选股行情悬浮窗 —— 透明窄条滚动播放 A股 / 港股 / 美股 / 期货实时行情，点击展开自选列表，搜索即加、随看随删。

Electron 构建，无前端框架，无后端依赖，单数据源直连。

> 界面截图：
> 常见形态是桌面角落一条 38px 高的半透明行情带（自选股滚动 + 红涨绿跌），点击右侧箭头 ▲/▼ 展开成完整面板。

## 功能特性

- **四市场全覆盖**：A股（含科创板）、港股、美股、期货，搜索联想按 QuoteID 精确跨市场区分（`1.600519` / `116.00700` / `105.AAPL` / `113.cu2609`）
- **真实行情轮询**：5 秒刷新，东财 `push2 ulist` 批量接口一次拉全自选
- **窄条滚动播放**：跑马灯常驻，鼠标悬停暂停
- **点击展开/收起**：展开显示完整自选面板（搜索添加、列表、统计）
- **表头三列点击排序**：最新价 / 涨跌 / 涨跌幅，同列再点反向
- **红涨绿跌**：A股配色惯例，悬停行尾 ✕ 删除
- **自选持久化**：localStorage 保存，重启即恢复并自动拉取
- **窗口行为（系统原生）**：顶栏任意处拖动移动（绝不误缩放）、悬停窗口边缘/角落调整大小、置顶常驻
- **透明圆角无边框**：贴桌面不碍事

## 快速开始

需要 [Node.js](https://nodejs.org/) 18+。

```bash
# 克隆后安装依赖（electron 约 100MB）
git clone https://github.com/cdb371/watchticker.git
cd watchticker
npm install

# 直接跑（开发模式，源码运行）
npm start
```

Windows 桌面双击运行已打包版本见 [Releases](#)（待发布，可自行按下方打包）。

## 打包为 exe

```bash
# 国内网络需先指向镜像源（electron-builder 默认从 GitHub 拉 NSIS 工具链会卡死）
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"

npm run dist
# 产物: dist/WatchTicker Setup <版本>.exe (NSIS 安装器) + dist/win-unpacked/WatchTicker.exe (免安装版)
```

## 测试

```bash
npm test          # node:test, 14 个用例（接口 URL 拼装 / 响应映射 / 过滤器边界）
```

## 技术栈与结构

| 文件 | 职责 |
|---|---|
| `main.js` | Electron 主进程：无边框透明置顶窗口、IPC 数据与窗口通道 |
| `preload.js` | contextBridge 安全桥（`window.wt.suggest/quotes/resize`） |
| `index.html` | 渲染层：窄条 + 展开面板全部交互（纯原生 JS，无框架） |
| `lib/market-api.cjs` | 东财接口封装（node fetch，主进程无 CORS；`fetchImpl` 可注入便于测试） |
| `lib/quote-mapper.cjs` | 东财原始响应 → 统一结构纯函数 |
| `test/` | node:test 单元测试 |

## 数据源与免责声明

行情与搜索联想来自**东方财富公开网页接口**（`searchapi.eastmoney.com` suggest / `push2.eastmoney.com` ulist），非官方 SDK。

- 接口为网页端自用约定，**可能随时变动或失效**，不保证可用性与实时性
- 数据仅供个人学习与自用参考，**不构成任何投资建议**；投资决策请以交易所官方行情为准
- 本项目为学习用途的开源示例，使用风险自负

## License

[MIT](./LICENSE) © 2026 cdb371

---

## English Summary

**WatchTicker** is a tiny always-on-top desktop ticker widget for CN A-shares (incl. STAR Market), HK stocks, US stocks and futures. A transparent 38px bar scrolls your watchlist quotes (red-up/green-down convention); click the arrow to expand into a full panel with symbol search-and-add, column sorting and one-click removal.

Stack: Electron + vanilla JS (no framework), single data source via EastMoney public web endpoints, `node:test` unit suite. Window drag uses the native system drag region (resizing never fires by accident); edge/corner hover resizes like any normal window.

```bash
npm install && npm start
```

**Disclaimer**: quote data comes from unofficial public endpoints of EastMoney, which may break or change anytime. For study/personal use only — not investment advice.
