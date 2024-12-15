const { ipcMain } = require('electron')
const IPC_EVENT = require('../ipcEvent')
const getSSID = require('./wifiName')
const getPassword = require('./wifiPassword')

async function getCurrentWifi(send) {
  let ssid = await getSSID()
  let password = ''
  if(ssid) {
    password = await getPassword(ssid)
  }
  send({
    ssid,
    password
  })
}

function bindAutoWifiEvents() {
  ipcMain.on(IPC_EVENT.IPC_GET_CURRENT_WIFI_INFO, async (ev, args) => {
    const send = data => {
      ev.sender.send(IPC_EVENT.IPC_GET_CURRENT_WIFI_INFO_CALLBACK , data)
    }
    await getCurrentWifi(send)
  })
}

module.exports = {
  bindAutoWifiEvents
}
