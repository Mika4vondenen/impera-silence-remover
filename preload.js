const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  convertAudio: (inputPath, outputPath, format, quality) =>
    ipcRenderer.invoke('convert-audio', inputPath, outputPath, format, quality),

  mergeAudio: (inputPaths, outputPath, format, quality) =>
    ipcRenderer.invoke('merge-audio', inputPaths, outputPath, format, quality),

  cutAudio: (inputPath, outputPath, keepSegments, format, quality) =>
    ipcRenderer.invoke('cut-audio', inputPath, outputPath, keepSegments, format, quality),

  readFileBuffer: (filePath) =>
    ipcRenderer.invoke('read-file-buffer', filePath),

  showSaveDialog: (defaultName) =>
    ipcRenderer.invoke('show-save-dialog', defaultName),

  showItemInFolder: (filePath) =>
    ipcRenderer.invoke('show-item-in-folder', filePath),

  getFileStats: (filePath) =>
    ipcRenderer.invoke('get-file-stats', filePath),

  onProgress: (channel, cb) =>
    ipcRenderer.on(channel, (_event, pct) => cb(pct)),

  offProgress: (channel) =>
    ipcRenderer.removeAllListeners(channel),
})
