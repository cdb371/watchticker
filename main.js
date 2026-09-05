'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('path');

// 窄条常驻尺寸(展开态高度后续由 renderer 经 IPC 请求调整)
const BAR = { width: 430, height: 38 };

function createWindow() {
  const win = new BrowserWindow({
    width: BAR.width,
    height: BAR.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
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
  // [冒烟插桩] did-finish-load 后读页面 DOM 状态自证渲染,冒烟通过后移除
  win.webContents.on('did-finish-load', async () => {
    try {
      const info = await win.webContents.executeJavaScript(
        "JSON.stringify({title:document.title, tickerItems:document.querySelectorAll('.tk-item').length, watchRows:document.querySelectorAll('.watch-row').length, hasWidget:!!document.getElementById('widget')})"
      );
      console.log('[main] did-finish-load', info);
    } catch (e) { console.log('[main] eval-fail', e.message); }
  });
  win.loadFile('index.html');
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
