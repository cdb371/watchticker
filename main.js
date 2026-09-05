'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { searchSuggest, fetchQuotes } = require('./lib/market-api.cjs');

// 窗口形态常量(与 renderer 约定):收起 38px 顶栏 / 展开 440px 面板
const BAR = { width: 430, height: 38 };
const EXPAND_HEIGHT = 440;

function createWindow() {
  const win = new BrowserWindow({
    width: BAR.width,
    height: BAR.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    // 注意:必须 resizable:true——Windows 透明无边框窗口在 resizable:false 时 setSize 无法缩小
    // (无 WS_THICKFRAME,DWM 拒绝 shrink)。frame:false 用户本无 resize 手柄,此开关只影响程序 setSize
    resizable: true,
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
  // IPC:窗口形态(float-polish)。open=true 展开(430x440) / false 收起(430x38)
  ipcMain.handle('wt:resize', (e, open) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return false;
    w.setSize(BAR.width, open ? EXPAND_HEIGHT : BAR.height);
    return true;
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
