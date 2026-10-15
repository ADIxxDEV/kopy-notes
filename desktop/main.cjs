const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('node:path');
if(process.argv.includes('--smoke-test'))app.setPath('userData',path.join(app.getPath('temp'),'kopy-notes-smoke-'+process.pid));
app.whenReady().then(async () => {
  const fs=require('node:fs/promises'),{DeviceLibrary}=require('./device-library.cjs');
  const config=path.join(app.getPath('userData'),'device-library.json');
  const defaultFolder=process.argv.includes('--smoke-test')?path.join(app.getPath('userData'),'Device Library'):path.join(app.getPath('documents'),'Kopy Notes','Library');
  let folder=defaultFolder;try{const saved=JSON.parse(await fs.readFile(config,'utf8'));if(typeof saved.folder==='string'&&path.isAbsolute(saved.folder))folder=saved.folder;}catch{}
  let library=new DeviceLibrary(folder),mainWindow;
  const trusted=event=>mainWindow&&!mainWindow.isDestroyed()&&event.sender===mainWindow.webContents;
  const check=event=>{if(!trusted(event))throw new Error('Device storage is available only to the classroom window.');};
  ipcMain.handle('kopy-device-status',event=>{check(event);return library.status();});
  ipcMain.handle('kopy-device-read',event=>{check(event);return library.read();});
  ipcMain.handle('kopy-device-write',(event,data)=>{check(event);return library.write(data);});
  ipcMain.handle('kopy-device-choose',async event=>{check(event);const result=await dialog.showOpenDialog(mainWindow,{title:'Choose your Kopy Notes device folder',defaultPath:folder,properties:['openDirectory','createDirectory']});if(result.canceled)return library.status();const selected=path.join(result.filePaths[0],'Kopy Notes Library');for(const protectedRoot of [app.getPath('userData'),path.dirname(process.execPath)]){const relative=path.relative(protectedRoot,selected);if(!relative||(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative)))throw new Error('Choose a Documents folder outside the app installation and private app-data folders.');}await library.queue;folder=selected;library=new DeviceLibrary(folder);await fs.mkdir(path.dirname(config),{recursive:true});await fs.writeFile(config,JSON.stringify({folder}));return library.status();});
  const display=require('./display-annotation.cjs').install({app,BrowserWindow,ipcMain,getMain:()=>mainWindow,getFolder:()=>folder});

  session.defaultSession.on('will-download',(_event,item)=>{const name=path.basename(item.getFilename()).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,180)||'export';const folder=path.join(library.root,'Exports');try{require('node:fs').mkdirSync(folder,{recursive:true});item.setSavePath(path.join(folder,`${Date.now()}-${name}`));}catch{/* Let Electron offer the normal save dialog if the device folder is unavailable. */}});
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    const url = contents.getURL();
    callback(url.startsWith('file://') && ['media', 'fullscreen'].includes(permission));
  });
  function open() {
    const preferences={contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.cjs')};
    const splash=new BrowserWindow({width:520,height:380,resizable:false,show:false,backgroundColor:'#f5f3ed',webPreferences:preferences});
    const window = new BrowserWindow({ width: 1280, height: 800, minWidth: 720, minHeight: 480, show: false, backgroundColor: '#22262b', webPreferences: preferences });
    mainWindow=window;
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
    window.on('closed',()=>{display.close();finished=true;clearTimeout(timeout);ipcMain.removeListener('kopy-startup-retry',retry);ipcMain.removeListener('kopy-classroom-ready',classroomReady);if(!splash.isDestroyed())splash.close();});
    let closingAllowed=false,closeTimer;
    const saved=event=>{if(event.sender===window.webContents){closingAllowed=true;clearTimeout(closeTimer);window.close();}};
    ipcMain.on('kopy-device-close-ready',saved);
    window.on('close',event=>{if(!ready||closingAllowed)return;event.preventDefault();window.webContents.send('kopy-device-flush');if(!closeTimer)closeTimer=setTimeout(()=>{closingAllowed=true;window.close();},15000);});
    window.on('closed',()=>{clearTimeout(closeTimer);ipcMain.removeListener('kopy-device-close-ready',saved);});
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
