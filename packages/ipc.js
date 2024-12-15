const os = require('os')
const { app, ipcMain } = require('electron')
const windowManager = require('./windowManager')
const IPC_EVENT = require('./ipcEvent')
const { bindDownloadEvents } = require('./download')
const { bindFirmwareDetectEvents } = require('./firmware')
const { bindSerialEvents } = require('./serialport/event')
const { bindPluginUIFlowEvents } = require('./plugin/uiflow-config')
const { bindUserAuthEvents } = require('./auth')
const { bindShareEvents } = require('./share')
const { bindMediaTokenEvents } = require('./mediaToken')
const { bindImageLoaderEvents } = require('./imageLoader')
const { bindBurnerNVSEvents } = require('./nvs')
const { bindFileDialogEvents } = require('./dialog')
const { bindAutoWifiEvents } = require('./autoWiFi')
const { bindDeviceEvents } = require('./device')

const bindMinimizeEvent = () =>
  ipcMain.on(IPC_EVENT.IPC_MINIMIZE, (event, args) => {
    const mainWin = windowManager.getWindow('main')
    mainWin && mainWin.minimize()
  })

const bindMaximizeEvent = () =>
  ipcMain.on(IPC_EVENT.IPC_MAXIMIZE, (event, args) => {
    const mainWin = windowManager.getWindow('main')
    if(mainWin.isMaximized()) {
      if(os.platform() === 'darwin') {
        mainWin.setBounds({width: 1280, height: 760})
      } else {
        mainWin.restore()
      }
      return
    }
    mainWin.maximize()
  })

const bindQuitEvent = () =>
  ipcMain.on(IPC_EVENT.IPC_QUIT, (event, args) => {
    const mainWin = windowManager.getWindow('main')
    mainWin && mainWin.close()
  })

const bindRestartEvent = () =>
  ipcMain.on(IPC_EVENT.IPC_RESTART, (event, args) => {
    app.relaunch()
    app.quit()
    event.sender = null
  })

function bindWindowEvents() {
  bindMinimizeEvent() // 最小化事件
  bindMaximizeEvent() // 最大化事件
  bindQuitEvent() // 应用关闭事件
  bindRestartEvent() // 应用重启事件
  bindDownloadEvents() // 下载固件事件
  bindFirmwareDetectEvents() // 固件列表本地化事件
  bindSerialEvents() // 串口事件
  bindPluginUIFlowEvents() // UIFlow插件事件
  bindUserAuthEvents() // 绑定用户权限事件
  bindShareEvents() // 共享烧录事件
  bindMediaTokenEvents() // 媒体功能Token申请事件
  bindImageLoaderEvents() // 加载图片事件
  bindBurnerNVSEvents() // BurnerNVS事件
  bindFileDialogEvents()  // FileDialog事件
  bindAutoWifiEvents() // AutoWiFi事件
  bindDeviceEvents() // 设备管理事件
}

module.exports = {
  bindWindowEvents
}
