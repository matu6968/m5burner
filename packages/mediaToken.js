const { ipcMain } = require('electron')
const childProcess = require('child_process')
const os = require('os')
const axios = require('axios')
const { ESPTOOL_EXE, ESPTOOL_PY } = require('./common/filepath')
const IPC_EVENT = require('./ipcEvent')

const GET_TOKEN_URL = 'http://flow.m5stack.com:5003/token'

function getMac(com) {
  return new Promise((resolve, reject) => {
    let comName = com
    if(os.platform() === 'darwin' || os.platform() === 'linux') {
      comName = '/dev/' + com
    }

    let process
    if(os.platform() === 'win32') {
      process = childProcess.spawn(ESPTOOL_EXE, ['--port', comName, 'read_mac'])
    } else {
      process = childProcess.spawn(global.pythonExec, [ESPTOOL_PY, '--port', comName, 'read_mac'])
    }

    let data = ''
    process.stdout.on('data', chunk => {
      data += chunk.toString()
    })
    process.stdout.on('close', () => {
      let result = data.match(/MAC: ([A-Fa-f0-9:]+)/g)
      if(result === null) {
        resolve('')
        return
      }
      if(result.length > 0) {
        let macAddr = result[0].replace(/MAC: /g, '')
        resolve(macAddr)
        return
      }
      return ''
    })
  })
}

function requestToken(mac) {
  return new Promise((resolve, reject) => {
    axios.default({
      url: GET_TOKEN_URL,
      method: 'POST',
      data: {
        mac
      }
    })
      .then(res => {
        if(res.status === 200) {
          resolve(res.data)
          return
        }
        return ''
      })
      .catch(e => {
        resolve('')
      })
  })
}

function bindMediaTokenEvents() {
  ipcMain.on(IPC_EVENT.IPC_GET_MEDIA_TOKEN, async (event, args) => {
    if(!args.com) {
      event.sender.send(IPC_EVENT.IPC_GET_MEDIA_TOKEN, {
        status: -1,
        message: 'Request token failed'
      })
      return
    }

    let mac = await getMac(args.com)
    if(mac === '') {
      event.sender.send(IPC_EVENT.IPC_GET_MEDIA_TOKEN, {
        status: -1,
        message: 'Request token failed'
      })
      return
    }
    console.log(args.com)
    console.log(mac)
    let token = await requestToken(mac)
    if(token === '') {
      event.sender.send(IPC_EVENT.IPC_GET_MEDIA_TOKEN, {
        status: -1,
        message: 'Request token failed'
      })
      return
    }

    event.sender.send(IPC_EVENT.IPC_GET_MEDIA_TOKEN, {
      status: 0,
      data: {
        token
      }
    })
  })
}

module.exports = {
  bindMediaTokenEvents
}
