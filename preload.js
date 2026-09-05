'use strict';
// preload:最小桥,IPC 数据通道在 main-data 阶段扩展
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('wt', {
  version: '0.1.0',
  // 占位:后续暴露 searchQuotes / addWatch / setWindowSize 等
});
