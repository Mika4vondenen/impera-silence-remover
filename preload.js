const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  convertAudio: (inputPath, outputPath, format, quality) =>
    ipcRenderer.invoke('convert-audio', inputPath, outputPath, format, quality),

  showSaveDialog: (defaultName) =>
    ipcRenderer.invoke('show-save-dialog', defaultName),

  showItemInFolder: (filePath) =>
    ipcRenderer.invoke('show-item-in-folder', filePath),
})
