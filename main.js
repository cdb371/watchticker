'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { searchSuggest, fetchQuotes } = require('./lib/market-api.cjs');

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
  // [冒烟插桩] did-finish-load 后:读 DOM 状态 + 端到端打 IPC 拉真实行情自证链路,打包前移除
  win.webContents.on('did-finish-load', async () => {
    try {
      const info = await win.webContents.executeJavaScript(
        "JSON.stringify({title:document.title, tickerItems:document.querySelectorAll('.tk-item').length, watchRows:document.querySelectorAll('.watch-row').length})"
      );
      console.log('[main] dom', info);
      const q = await win.webContents.executeJavaScript(
        "(async()=>JSON.stringify(await window.wt.quotes(['1.600519','116.00700','105.AAPL','113.cu2609'])))()"
      );
      console.log('[main] ipc-quotes', q);
    } catch (e) { console.log('[main] eval-fail', e.message); }
  });
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
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
