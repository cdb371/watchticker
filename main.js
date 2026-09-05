'use strict';
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
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
    // resizable:true —— 恢复系统边框缩放(用户悬停窗口边缘可拉大小)。
    // 窗口移动改由 renderer 的 -webkit-app-region: drag 系统拖动处理(拖标题栏语义,
    // 绝不会改变尺寸),不再手动 setPosition 模拟——彻底消除"拖动误缩放/误放大"。
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    // skipTaskbar:true —— 悬浮窗不占任务栏按钮;程序驻留系统托盘(Tray),右键菜单可隐藏/退出
    skipTaskbar: true,
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

// 系统托盘:程序驻留右下角状态栏,窗口常显不占任务栏。右键菜单 显示/隐藏/退出,左键切换
let tray = null;
function createTray(win) {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('WatchTicker 自选股行情');
  const toggleVisible = () => {
    if (win.isVisible() && !win.isMinimized()) win.hide();
    else { win.show(); win.focus(); }
  };
  tray.on('click', toggleVisible);          // 左键:显示/隐藏
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏窗口', click: toggleVisible },
    { type: 'separator' },
    { label: '退出 WatchTicker', click: () => app.quit() },
  ]));
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
  // IPC:窗口高度(send)。renderer 在展开/收起时 setSize 到目标高;resizable:true 常态下直接生效
  ipcMain.on('wt:resize', (e, h) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    const targetH = Math.max(H_MIN, Math.min(H_MAX, Math.round(h)));
    if (w.getSize()[1] === targetH) return;   // 高度未变,跳过
    w.setSize(BAR.width, targetH);
  });
  // IPC:拖拽移动(高频增量,fire-and-forget)。dx/dy 为相对上次鼠标位置的屏幕增量
  ipcMain.on('wt:drag-move', (e, dx, dy) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    const [x, y] = w.getPosition();
    w.setPosition(Math.round(x + dx), Math.round(y + dy));
  });
  const win = createWindow();
  createTray(win);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
