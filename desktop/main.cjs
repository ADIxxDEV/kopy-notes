const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    const url = contents.getURL();
    callback(url.startsWith('file://') && ['media', 'fullscreen'].includes(permission));
  });
  function open() {
    const window = new BrowserWindow({ width: 1280, height: 800, minWidth: 720, minHeight: 480, show: false, backgroundColor: '#22262b', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.center(); window.setMenuBarVisibility(false);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('file://')) event.preventDefault(); });
    window.loadFile(path.join(__dirname, '../dist/index.html'));
    window.once('ready-to-show', () => window.show());
  }
  open(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) open(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
