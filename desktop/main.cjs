const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('node:path');
if(process.argv.includes('--smoke-test'))app.setPath('userData',path.join(app.getPath('temp'),'kopy-notes-smoke-'+process.pid));
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    const url = contents.getURL();
    callback(url.startsWith('file://') && ['media', 'fullscreen'].includes(permission));
  });
  function open() {
    const preferences={contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.cjs')};
    const splash=new BrowserWindow({width:520,height:380,resizable:false,show:false,backgroundColor:'#f5f3ed',webPreferences:preferences});
    const window = new BrowserWindow({ width: 1280, height: 800, minWidth: 720, minHeight: 480, show: false, backgroundColor: '#22262b', webPreferences: preferences });
    let painted=false,ready=false,finished=false;
    const reveal=()=>{if(!painted||!ready||finished||window.isDestroyed())return;finished=true;clearTimeout(timeout);window.show();if(!splash.isDestroyed())splash.close();};
    const failed=()=>{if(!finished&&!splash.isDestroyed())void splash.loadFile(path.join(__dirname,'startup.html'),{hash:'error'});};
    const timeout=setTimeout(failed,30000);
    const retry=event=>{if(event.sender!==splash.webContents||window.isDestroyed())return;ready=false;void splash.loadFile(path.join(__dirname,'startup.html'));window.webContents.reload();};
    const classroomReady=event=>{if(event.sender===window.webContents){ready=true;reveal();}};
    ipcMain.on('kopy-startup-retry',retry);ipcMain.on('kopy-classroom-ready',classroomReady);
    splash.center();splash.setMenuBarVisibility(false);splash.webContents.setWindowOpenHandler(()=>({action:'deny'}));splash.webContents.on('will-navigate',event=>event.preventDefault());
    splash.once('ready-to-show',()=>splash.show());void splash.loadFile(path.join(__dirname,'startup.html'));
    splash.on('closed',()=>{if(!finished&&!window.isDestroyed())window.close();});
    window.on('closed',()=>{finished=true;clearTimeout(timeout);ipcMain.removeListener('kopy-startup-retry',retry);ipcMain.removeListener('kopy-classroom-ready',classroomReady);if(!splash.isDestroyed())splash.close();});
    window.center(); window.setMenuBarVisibility(false);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('file://')) event.preventDefault(); });
    window.webContents.on('did-fail-load',(_event,_code,_description,_url,isMainFrame)=>{if(isMainFrame)failed();});
    void window.loadFile(path.join(__dirname, '../dist/index.html')).catch(failed);
    window.once('ready-to-show', () => {painted=true;reveal();});
  }
  open(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) open(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
