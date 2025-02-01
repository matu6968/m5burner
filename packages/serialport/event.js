const { ipcMain } = require('electron')
const { getPorts, connect, reboot, disconnect } = require('./serial')
const { burn, erase, kill, readFirmware, burnIdentify } = require('./tool')
const IPC_EVENT = require('../ipcEvent')
const serial = require('./serial')

function bindSerialEvents() {
  ipcMain.on(IPC_EVENT.IPC_START_GET_SERIAL_PORTS_TIMER, async (event, args) => {
    let ports = await getPorts()
    event.sender.send(IPC_EVENT.IPC_GET_SERIAL_PORTS, ports)
    setInterval(async () => {
      let ports = await getPorts()
      event.sender.send(IPC_EVENT.IPC_GET_SERIAL_PORTS, ports)
    }, 100)
  })

  ipcMain.on(IPC_EVENT.IPC_BURN, (event, args) => {
    let send = data => {
      event.sender.send(`${IPC_EVENT.IPC_BURN}/${args.taskId}`, data)
    }
    burn(args, send)
  })

  ipcMain.on(IPC_EVENT.IPC_IDENTIFY_BURN, (event, args) => {
    burnIdentify(args).then(r => event.sender.send(IPC_EVENT.IPC_IDENTIFY_BURN, r))
  })

  ipcMain.on(IPC_EVENT.IPC_ERASE, (event, args) => {
    let send = data => {
      event.sender.send(`${IPC_EVENT.IPC_ERASE}/${args.taskId}`, data)
    }
    erase(args, send)
    console.log(args)
  })

  ipcMain.on(IPC_EVENT.IPC_KILL_PROCESS, (event, args) => {
    kill()
  })

  ipcMain.on(IPC_EVENT.IPC_EXPORT_FIRMWARE, (event, args) => {
    let send = data => {
      event.sender.send(`${IPC_EVENT.IPC_EXPORT_FIRMWARE_CALLBACK}/${args.taskId}`, data)
    }
    readFirmware(args, send)
  })

  ipcMain.on(IPC_EVENT.IPC_CONNECT_SERIAL_PORT, (event, args) => {
    let send = data => {
      event.sender.send(IPC_EVENT.IPC_GET_SERIAL_PORT_DATA, data)
    }
    connect(args.com, send)
  })

  ipcMain.on(IPC_EVENT.IPC_DISCONNECT_SERIAL_PORT, (event, args) => {
    disconnect()
  })

  ipcMain.on(IPC_EVENT.IPC_REBOOT_SERIAL_PORT, (event, args) => {
    reboot()
  })
}

// Update any USB device detection event handlers
ipcMain.handle('serial:list-devices', async () => {
  return serial.findDevices()
})

ipcMain.on('serial:start-monitoring', (event) => {
  serial.startMonitoring((devices) => {
    // Send updated device list to renderer
    event.sender.send('serial:devices-updated', devices)
  })
})

ipcMain.on('serial:stop-monitoring', () => {
  serial.stopMonitoring()
})

// Keep existing serial port related events
ipcMain.handle('serial:list', async () => {
  return await serial.getPorts()
})

module.exports = {
  bindSerialEvents
}
