const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const ffmpegPath = require('ffmpeg-static')

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0d0d0b',
    title: 'IMPERA AUTOMATION — Silence Remover',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  })
  win.loadFile('splash.html')
}

// ── IPC: Audio Conversion ─────────────────────────────────────────────────────
ipcMain.handle('convert-audio', async (_event, inputPath, outputPath, format, quality) => {
  const args = ['-i', inputPath, '-vn']

  if (format === 'MP3') {
    const bitrate = quality === 'high' ? '320k' : quality === 'medium' ? '192k' : '128k'
    args.push('-codec:a', 'libmp3lame', '-b:a', bitrate)
  } else if (format === 'WAV') {
    args.push('-codec:a', 'pcm_s16le')
  } else if (format === 'AAC') {
    args.push('-codec:a', 'aac', '-b:a', '256k')
  } else if (format === 'FLAC') {
    args.push('-codec:a', 'flac')
  }

  args.push('-y', outputPath)

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', code => {
      if (code === 0) resolve({ success: true, outputPath })
      else reject(new Error(stderr.slice(-600)))
    })
    proc.on('error', err => reject(err))
  })
})

// ── IPC: Save Dialog ──────────────────────────────────────────────────────────
ipcMain.handle('show-save-dialog', async (_event, defaultName) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'flac'] },
      { name: 'All Files', extensions: ['*'] },
    ]
  })
  return result.canceled ? null : result.filePath
})

// ── IPC: Show in Folder ───────────────────────────────────────────────────────
ipcMain.handle('show-item-in-folder', (_event, filePath) => {
  shell.showItemInFolder(filePath)
})

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
