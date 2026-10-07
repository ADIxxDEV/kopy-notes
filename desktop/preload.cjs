const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('kopyStartup',{retry:()=>ipcRenderer.send('kopy-startup-retry'),ready:()=>ipcRenderer.send('kopy-classroom-ready')});
