const { net, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { FIRMWARE_DIR, FIRMWARE_LIST_FILE } = require('./common/filepath')
const { isDev } = require('./common/environment')
const IPC_EVENT = require('./ipcEvent')

const readDirAsync = promisify(fs.readdir)
const readFileAsync = promisify(fs.readFile)

async function getDownloadedFirmware() {
  let files = await readDirAsync(FIRMWARE_DIR)
  return files.filter(f => f.endsWith('.bin'))
}

function bindFirmwareDetectEvents() {
  ipcMain.on(IPC_EVENT.IPC_GET_FIRMWARE_LIST, async (event, args) => {
    let list = await readFileAsync(FIRMWARE_LIST_FILE, { encoding: 'utf8' })
    event.sender.send(IPC_EVENT.IPC_GET_FIRMWARE_LIST, JSON.parse(list))
  })

  ipcMain.on(IPC_EVENT.IPC_GET_DOWNLOADED_FIRMWARE_LIST, async (event, args) => {
    let list = await getDownloadedFirmware()
    event.sender.send(IPC_EVENT.IPC_GET_DOWNLOADED_FIRMWARE_LIST, list)
  })

  ipcMain.on(IPC_EVENT.IPC_SAVE_FIRMWARE_LIST, async (event, args) => {
    fs.writeFile(FIRMWARE_LIST_FILE, args, {flag: 'w'}, e => {
      if(e) {
        console.log('[INFO] Save firmware list failed. ' + e.message)
        return
      }
      console.log('[INFO] Save firmware list successfully.')
    })
  })

  ipcMain.on(IPC_EVENT.IPC_REMOVE_FIRMWARE_FILE, (event, args) => {
    fs.unlink(path.resolve(FIRMWARE_DIR, args.file), async e => {
      if(e) {
        console.log('[ERROR] ' + e.message)
        return
      }
      let list = await getDownloadedFirmware()
      event.sender.send(IPC_EVENT.IPC_GET_DOWNLOADED_FIRMWARE_LIST, list)
    })
  })
}

module.exports = {
  bindFirmwareDetectEvents
}
