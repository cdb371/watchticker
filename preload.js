'use strict';
// preload:安全桥 —— renderer 经 wt.* 调用主进程数据模块(main-data)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wt', {
  version: '0.2.0',
  /** 搜索联想(A股/港股/美股/期货)→ 候选数组 */
  suggest: (kw) => ipcRenderer.invoke('wt:suggest', kw),
  /** 批量行情 quoteIds=['1.600519',...] → 行情数组 */
  quotes: (quoteIds) => ipcRenderer.invoke('wt:quotes', quoteIds),
  /** 窗口形态:open=true 展开(430x440) / false 收起(430x38) */
  resize: (open) => ipcRenderer.invoke('wt:resize', open),
  /** 拖拽移动:鼠标屏幕坐标增量(fire-and-forget,高频) */
  dragMove: (dx, dy) => ipcRenderer.send('wt:drag-move', dx, dy),
});
