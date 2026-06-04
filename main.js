const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked')

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

// ── Shared helper ─────────────────────────────────────────────────────────────
function codecArgs(format, quality) {
  if (format === 'MP3') {
    const br = quality === 'high' ? '320k' : quality === 'medium' ? '192k' : '128k'
    return ['-codec:a', 'libmp3lame', '-b:a', br]
  }
  if (format === 'WAV')  return ['-codec:a', 'pcm_s16le']
  if (format === 'AAC')  return ['-codec:a', 'aac', '-b:a', '256k']
  if (format === 'FLAC') return ['-codec:a', 'flac']
  return ['-codec:a', 'libmp3lame', '-b:a', '320k']
}

function parseTime(str) {
  const m = str.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!m) return 0
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
}

// ── IPC: Audio Conversion ─────────────────────────────────────────────────────
ipcMain.handle('convert-audio', async (_event, inputPath, outputPath, format, quality) => {
  const args = ['-i', inputPath, '-vn', ...codecArgs(format, quality), '-y', outputPath]

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

// ── IPC: Merge Audio ──────────────────────────────────────────────────────────
ipcMain.handle('merge-audio', async (event, inputPaths, outputPath, format, quality) => {
  const listFile = path.join(os.tmpdir(), `impera_concat_${Date.now()}.txt`)
  const listContent = inputPaths.map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "\\'")}'`).join('\n')
  fs.writeFileSync(listFile, listContent, 'utf8')

  const args = [
    '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vn', ...codecArgs(format, quality),
    '-y', outputPath,
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    let totalSec = 0

    proc.stderr.on('data', d => {
      const chunk = d.toString()
      stderr += chunk

      if (!totalSec) {
        const dm = chunk.match(/Duration:\s*(\d+:\d+:\d+(?:\.\d+)?)/)
        if (dm) totalSec = parseTime(dm[1])
      }
      const tm = chunk.match(/time=(\d+:\d+:\d+(?:\.\d+)?)/)
      if (tm && totalSec > 0) {
        const pct = Math.min(99, (parseTime(tm[1]) / totalSec) * 100)
        event.sender.send('merge-progress', pct)
      }
    })

    proc.on('close', code => {
      try { fs.unlinkSync(listFile) } catch (_) {}
      if (code === 0) {
        event.sender.send('merge-progress', 100)
        resolve({ success: true, outputPath })
      } else {
        reject(new Error(stderr.slice(-600)))
      }
    })
    proc.on('error', err => reject(err))
  })
})

// ── IPC: Cut Audio (silence removal) ─────────────────────────────────────────
ipcMain.handle('cut-audio', async (event, inputPath, outputPath, keepSegments, format, quality) => {
  if (!keepSegments || keepSegments.length === 0) {
    throw new Error('Keine Keep-Segmente übergeben')
  }

  // Build filter_complex: atrim + asetpts per segment, then concat
  const filterParts = keepSegments.map((s, i) =>
    `[0:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS[s${i}]`
  )
  const concatInputs = keepSegments.map((_, i) => `[s${i}]`).join('')
  const filterComplex = [
    ...filterParts,
    `${concatInputs}concat=n=${keepSegments.length}:v=0:a=1[out]`,
  ].join(';')

  const args = [
    '-i', inputPath,
    '-filter_complex', filterComplex,
    '-map', '[out]',
    ...codecArgs(format, quality),
    '-y', outputPath,
  ]

  const totalDur = keepSegments.reduce((a, s) => a + (s.end - s.start), 0)

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr.on('data', d => {
      const chunk = d.toString()
      stderr += chunk
      const tm = chunk.match(/time=(\d+:\d+:\d+(?:\.\d+)?)/)
      if (tm && totalDur > 0) {
        const pct = Math.min(99, (parseTime(tm[1]) / totalDur) * 100)
        event.sender.send('cut-progress', pct)
      }
    })

    proc.on('close', code => {
      if (code === 0) {
        event.sender.send('cut-progress', 100)
        resolve({ success: true, outputPath })
      } else {
        reject(new Error(stderr.slice(-600)))
      }
    })
    proc.on('error', err => reject(err))
  })
})

// ── IPC: Cut Video (silence removal) ─────────────────────────────────────────
ipcMain.handle('cut-video', async (event, inputPath, outputPath, keepSegments) => {
  if (!keepSegments || keepSegments.length === 0) {
    throw new Error('Keine Keep-Segmente übergeben')
  }

  const filterParts = []
  keepSegments.forEach((s, i) => {
    const st = s.start.toFixed(6)
    const en = s.end.toFixed(6)
    filterParts.push(`[0:v]trim=start=${st}:end=${en},setpts=PTS-STARTPTS[v${i}]`)
    filterParts.push(`[0:a]atrim=start=${st}:end=${en},asetpts=PTS-STARTPTS[a${i}]`)
  })
  const n = keepSegments.length
  const concatInputs = keepSegments.map((_, i) => `[v${i}][a${i}]`).join('')
  const filterComplex = filterParts.join(';') + `;${concatInputs}concat=n=${n}:v=1:a=1[outv][outa]`

  const totalDur = keepSegments.reduce((a, s) => a + (s.end - s.start), 0)

  const args = [
    '-i', inputPath,
    '-filter_complex', filterComplex,
    '-map', '[outv]', '-map', '[outa]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k',
    '-y', outputPath,
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    proc.stderr.on('data', d => {
      const chunk = d.toString()
      stderr += chunk
      const tm = chunk.match(/time=(\d+:\d+:\d+(?:\.\d+)?)/)
      if (tm && totalDur > 0) {
        const pct = Math.min(99, (parseTime(tm[1]) / totalDur) * 100)
        event.sender.send('cut-progress', pct)
      }
    })
    proc.on('close', code => {
      if (code === 0) {
        event.sender.send('cut-progress', 100)
        resolve({ success: true, outputPath })
      } else {
        reject(new Error(stderr.slice(-800)))
      }
    })
    proc.on('error', err => reject(err))
  })
})

// ── IPC: Save Dialog ──────────────────────────────────────────────────────────
ipcMain.handle('show-save-dialog', async (_event, defaultName, isVideo) => {
  const filters = isVideo
    ? [
        { name: 'Video Files', extensions: ['mp4'] },
        { name: 'All Files', extensions: ['*'] },
      ]
    : [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'flac'] },
        { name: 'All Files', extensions: ['*'] },
      ]
  const result = await dialog.showSaveDialog({ defaultPath: defaultName, filters })
  return result.canceled ? null : result.filePath
})

// ── IPC: Read File Buffer ─────────────────────────────────────────────────────
ipcMain.handle('read-file-buffer', (_event, filePath) => {
  return fs.readFileSync(filePath)
})

// ── IPC: File Stats ───────────────────────────────────────────────────────────
ipcMain.handle('get-file-stats', (_event, filePath) => {
  const { mtime, birthtime } = fs.statSync(filePath)
  return { mtime, birthtime }
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
