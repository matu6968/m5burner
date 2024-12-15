const { SerialPort } = require('usb-native')
const os = require('os')
const childProcess = require('child_process')
const { ipcMain } = require('electron')
const IPC_EVENT = require('./ipcEvent')
const { ESPTOOL_EXE, ESPTOOL_PY, NVS_BIN } = require('./common/filepath')

const ERR_NOT_FOUND_NVS_STR = '__NVS_NOT_FOUND__'
const INF_NVS_EXIST = '__NVS_EXIST__'
const commandInitPrefix = 'CMD::INIT:'
const commandSetPrefix = 'CMD::SET:'
const commandGetPrefix = 'CMD::GET:'
const commandListPrefix = 'CMD::LIST:'
const commandSubPrefix = 'CMD::SUB:'
const commandPubPrefix = 'CMD::PUB:'
const commandUnsubPrefix = 'CMD::UNSUB:'
const commandEnd = '\r\n\r\n'

let currentPort = null
let subscribeKeys = []

async function connect(com) {

  let comName = com
  if(os.platform() === 'darwin' || os.platform() === 'linux') {
    comName = '/dev/' + comName
  }

  if(currentPort != null) {
    if(currentPort.path === comName) {
      try {
        await currentPort.close()
      } catch(e) {
        global.process.stdout.write(e.message)
      }
    }
  }

  subscribeKeys = []

  return new Promise((resolve, reject) => {
    let port = new SerialPort(comName, {
      baudRate: 115200,
      autoOpen: true
    }, async e => {
      if(e) {
        console.log(e.message)
        resolve({
          status: -1,
          error: e.message
        })
        return
      }
      if(currentPort !== null) {
        try {
          await currentPort.close()
        } catch(e) {
          console.log(e.message)
        }
      }
      currentPort = port
      let data = ''
      function handler(chunk) {
        data += chunk.toString()
        if(data.endsWith('\n')) {
          if(data.trim() === INF_NVS_EXIST) {
            currentPort = port
            resolve({
              status: 0,
              message: ''
            })
            port.off('data', handler)
          }
          else if(data.trim() === ERR_NOT_FOUND_NVS_STR) {
            resolve({
              status: -2,
              error: 'Not found nvs'
            })
            port.off('data', handler)
          }
        }
      }
      port.on('data', handler)
      port.write(Buffer.from(commandInitPrefix + commandEnd))
    })
  })
}

function list() {
  if(currentPort == null) {
    return {
      status: -1,
      error: 'Invalid serialport',
      data: []
    }
  }

  return new Promise((resolve, reject) => {
    let data = ''
    function handler (chunk) {
      data += chunk.toString()
      if(data.endsWith('\n')) {
        let keys = data.trim().split('/').filter(item => item !== '')
        resolve({
          status: 0,
          message: '',
          data: keys
        })
        currentPort.off('data', handler)
      }
    }
    currentPort.on('data', handler)
    currentPort.write(Buffer.from(commandListPrefix + commandEnd))
  })

}

function get(key) {
  if(currentPort == null) {
    return {
      status: -1,
      error: 'Invalid serialport',
      data: []
    }
  }

  return new Promise((resolve, reject) => {
    let data = ''
    function handler (chunk) {
      data += chunk.toString()
      if(data.endsWith('\n')) {
        let value = data.trim()
        resolve({
          status: 0,
          message: '',
          data: value
        })
        currentPort.off('data', handler)
      }
    }
    currentPort.on('data', handler)
    currentPort.write(Buffer.from(commandGetPrefix + key + commandEnd))
  })
}

function set(key, value) {
  if(currentPort == null) {
    return {
      status: -1,
      error: 'Invalid serialport',
      data: []
    }
  }

  return new Promise((resolve, reject) => {
    let data = ''
    function handler (chunk) {
      data += chunk.toString()
      if(data.endsWith('\n')) {
        resolve({
          status: 0,
          message: '',
          data: {}
        })
        currentPort.off('data', handler)
      }
    }
    currentPort.on('data', handler)
    currentPort.write(Buffer.from(`${commandSetPrefix}${key}=${value}${commandEnd}`))
  })
}

async function resetNVS(payload, send) {
  let comName = payload.com
  if(os.platform() === 'darwin' || os.platform() === 'linux') {
    comName = '/dev/' + comName
  }

  if(currentPort !== null) {
    if(currentPort.path === comName) {
      try {
        await currentPort.close()
      } catch(e) {
        global.process.stdout.write(e.message)
      }
      currentPort = null
    }
  }

  let process
  let args = ['--chip', 'auto', '-p', comName, '-b', '115200', 'write_flash', '0x9000', NVS_BIN]
  if(os.platform() === 'win32') {
    process = childProcess.spawn(ESPTOOL_EXE, args)
  } else {
    process = childProcess.spawn(global.pythonExec, [ESPTOOL_PY, ...args])
  }
  process.stdout.on('data', chunk => {
    global.process.stdout.write(chunk.toString())
  })
  process.on('close', code => {
    send({
      status: code,
      message: ''
    })
  })
}

async function sub(key) {
  try {
    await currentPort.write(Buffer.from(`${commandSubPrefix}${key}${commandEnd}`))
    if(subscribeKeys.indexOf(key) === -1) {
      subscribeKeys.push(key)
    }
  } catch(e) {
    console.log(e.message)
  }
}

async function unsub(key) {
  try {
    await currentPort.write(Buffer.from(`${commandUnsubPrefix}${key}${commandEnd}`))
    if(subscribeKeys.indexOf(key) !== -1) {
      subscribeKeys.splice(subscribeKeys.indexOf(key), 1)
    }
  } catch(e) {
    console.log(e.message)
  }
}

async function disconnect() {
  if(currentPort !== null) {
    try {
      await currentPort.close()
    } catch(e) {
      console.log(e.message)
    }
    currentPort = null
  }
}

function bindBurnerNVSEvents() {
  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_CONN, async (ev, args) => {
    let r = await connect(args.com)
    ev.sender.send(IPC_EVENT.IPC_BURNER_NVS_CONN, r)
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_LIST, async (ev, args) => {
    let r = await list()
    ev.sender.send(IPC_EVENT.IPC_BURNER_NVS_LIST, r)
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_GET, async (ev, args) => {
    let r = await get(args.key)
    ev.sender.send(IPC_EVENT.IPC_BURNER_NVS_GET, r)
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_SET, async (ev, args) => {
    let r = await set(args.key, args.value)
    ev.sender.send(IPC_EVENT.IPC_BURNER_NVS_SET, r)
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_RESET, async (ev, args) => {
    await resetNVS(args, payload => {
      ev.sender.send(IPC_EVENT.IPC_BURNER_NVS_RESET, payload)
    })
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_SUB, async (ev, args) => {
    await sub(args.key)
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_UNSUB, async (ev, args) => {
    await unsub(args.key)
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_DISCONN, async (ev, args) => {
    await disconnect()
  })

  ipcMain.on(IPC_EVENT.IPC_BURNER_NVS_SUB_CALLBACK, (ev, args) => {
    if(currentPort !== null) {
      let data = ''
      currentPort.on('data', chunk => {
        data += chunk.toString()
        let splitIdx = data.indexOf('\n')
        if(splitIdx !== -1) {
          let line = data.substring(0, splitIdx).trim().replace(commandPubPrefix, '')
          data = data.substring(splitIdx + 1)
          let key = line.split('=')[0]
          let value = line.split('=')[1]
          ev.sender.send(IPC_EVENT.IPC_BURNER_NVS_SUB_CALLBACK, {
            status: 0,
            data: {
              key,
              value
            },
            message: ''
          })
        }
      })
    }
  })
}

module.exports = {
  bindBurnerNVSEvents
}
