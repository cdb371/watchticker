'use strict';
// preload:安全桥 —— renderer 经 wt.* 调用主进程数据模块(main-data)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wt', {
  version: '0.2.0',
  /** 搜索联想(A股/港股/美股/期货)→ 候选数组 */
  suggest: (kw) => ipcRenderer.invoke('wt:suggest', kw),
  /** 批量行情 quoteIds=['1.600519',...] → 行情数组 */
  quotes: (quoteIds) => ipcRenderer.invoke('wt:quotes', quoteIds),
  /** 窗口高度(px):38 收起 / 展开 / 缩放手柄任意值。send 高频安全 */
  resize: (h) => ipcRenderer.send('wt:resize', h),
  /** 拖拽移动:鼠标屏幕坐标增量(fire-and-forget,高频) */
  dragMove: (dx, dy) => ipcRenderer.send('wt:drag-move', dx, dy),
});
