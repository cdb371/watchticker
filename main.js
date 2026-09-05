'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { searchSuggest, fetchQuotes } = require('./lib/market-api.cjs');

// 窗口形态常量(与 renderer 约定):宽度固定 430;高度由 renderer 决定(38 收起/440 默认展开/手柄手动)
const BAR = { width: 430, height: 38 };
const H_MIN = 38, H_MAX = 1000;

function createWindow() {
  const win = new BrowserWindow({
    width: BAR.width,
    height: BAR.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    // resizable:false —— 消除 Windows 无边框窗口边缘的隐形 resize 热区(4-6px),
    // 否则 38px 高窄条几乎整体落在热区内,拖动窗口会误触发系统缩放。
    // setSize 缩小失效问题(见 wt:resize)由动态 setResizable(true) 规避。
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true);
  win.loadFile('index.html');
  return win;
}

app.whenReady().then(() => {
  // IPC:数据通道(main-data)。错误吞掉返回 [] 防 renderer 崩溃,错误进主进程日志
  ipcMain.handle('wt:suggest', async (_e, kw) => {
    try { return await searchSuggest(kw); }
    catch (err) { console.error('[wt:suggest]', err.message); return []; }
  });
  ipcMain.handle('wt:quotes', async (_e, quoteIds) => {
    try { return await fetchQuotes(quoteIds); }
    catch (err) { console.error('[wt:quotes]', err.message); return []; }
  });
  // IPC:窗口高度(send,高频安全)。高度由 renderer 决定:38 收起 / 440 默认展开 / 手柄任意
  // 窗口常驻 resizable:false(防边缘热区让拖动误触发系统缩放);setSize 前动态 setResizable(true)
  // —— Windows 透明无边框窗口在 false 态无法缩小(探针实测),true 态 setSize 正常。
  ipcMain.on('wt:resize', (e, h) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    const targetH = Math.max(H_MIN, Math.min(H_MAX, Math.round(h)));
    if (w.getSize()[1] === targetH) return;   // 高度未变,跳过
    w.setResizable(true);
    w.setSize(BAR.width, targetH);
    w.setResizable(false);
  });
  // IPC:拖拽移动(高频增量,fire-and-forget)。dx/dy 为相对上次鼠标位置的屏幕增量
  ipcMain.on('wt:drag-move', (e, dx, dy) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    const [x, y] = w.getPosition();
    w.setPosition(Math.round(x + dx), Math.round(y + dy));
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
