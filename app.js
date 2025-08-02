const { app, BrowserWindow, Menu, net } = require('electron')
const path = require('path')
const os = require('os')
const windowManager = require('./packages/windowManager')
const environment = require('./packages/common/environment')
const ipc = require('./packages/ipc')
const { TMP_DIR, FIRMWARE_DIR, DATA_DIR, SHARE_DIR, VIEW_DIR, VIEW_HTML, IMAGE_DIR } = require('./packages/common/filepath')
const { ensureDir } = require('./packages/fileHelper')
const { checkUpdate, update } = require('./packages/update')
const serial = require('./packages/serialport/serial')

app.commandLine.appendSwitch('--disable-http-cache')

require('@electron/remote/main').initialize()

// Check python on MacOS and Linux
if(os.platform() === 'darwin' || os.platform() === 'linux') {
  let python = environment.detectPython()
  if(python === '') {
    global.pythonExec = 'python3'
  } else {
    global.pythonExec = python
  }
  console.log('[ENV] Use ' + python)
}

if(environment.isDev()) {
  global.appRoot = app.getAppPath()
} else {
  if(os.platform() === 'darwin') {
    global.appRoot = path.resolve(app.getAppPath())
  } else {
    global.appRoot = path.resolve(app.getAppPath(), '..', '..')
  }
}

async function initApp() {
  try {
    await ensureDir([TMP_DIR, FIRMWARE_DIR, DATA_DIR, SHARE_DIR, VIEW_DIR, IMAGE_DIR])
    console.log('[INIT] App initialized.')
  } catch(e) { }
}

function checkInMac() {
  if(os.platform() !== 'darwin') {
    return true
  }
  return !!global.appRoot.startsWith('/Applications');
}

app.allowRendererProcessReuse = true

app.on('ready', async () => {
  if(!environment.isDev() && !checkInMac()) {
    let errWin = new BrowserWindow({
      width: 600,
      height: 400,
      center: true,
    })
    errWin.loadFile('./mac-error-win.html').then(_ => {})
    return
  }

  await initApp()

  let updateInfo = await checkUpdate()

  const mainWin = new BrowserWindow({
    minWidth: 1280,
    minHeight: 800,
    width: 1280,
    height: 760,
    center: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      preload: path.resolve(__dirname, 'packages', 'preload.js')
    }
  })
  require('@electron/remote/main').enable(mainWin.webContents)

  windowManager.addWindow('main', mainWin)
  ipc.bindWindowEvents()

  Menu.setApplicationMenu(null)

  // Send version info to renderer process when DOM is ready
  mainWin.webContents.on('dom-ready', () => {
    mainWin.webContents.send('get-version', updateInfo.version)
  })

  if(environment.isDev()) {
    // Debug
    await mainWin.loadURL('http://localhost:4500')
    mainWin.webContents.openDevTools({
      mode: 'undocked'
    })
  } else {
    // Production
    if(!net.isOnline()) {
      await mainWin.loadFile(VIEW_HTML)
      return
    }

    if(updateInfo.needUpdate) {
      mainWin.webContents.on('dom-ready', () => {
        update(updateInfo.version)
      })
      await mainWin.loadURL('http://m5burner.m5stack.com/website/')
    } else {
      await mainWin.loadFile(VIEW_HTML)
    }
  }
})

app.on('window-all-closed', () => {
  windowManager.removeWindow('main')
  app.quit()
})
