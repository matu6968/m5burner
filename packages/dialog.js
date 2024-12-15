const { dialog, ipcMain } = require('electron')
const path = require('path')
const { getWindow } = require('./windowManager')
const IPC_EVENT = require('./ipcEvent')

const mainWindow = getWindow('main')

function openFileDialog(sender) {
  dialog.showSaveDialog(mainWindow, {
    properties: ['openFile'],
    filters: [],
    defaultPath: path.resolve(__dirname, 'esp32fw.bin')
  })
    .then(r => {
      if(!r.canceled) {
        sender.send(IPC_EVENT.IPC_OPEN_FILE_DIALOG_CALLBACK, {
          data: {
            path: r.filePath
          }
        })
      }
    })
    .catch(e => {
      console.log(e.message)
    })
}

function bindFileDialogEvents() {
  ipcMain.on(IPC_EVENT.IPC_OPEN_FILE_DIALOG, (ev, args) => {
    openFileDialog(ev.sender)
  })
}

module.exports = {
  bindFileDialogEvents
}
