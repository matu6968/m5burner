const { ipcMain, net } = require('electron')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const IPC_EVENT = require('./ipcEvent')
const { SHARE_DIR } = require('./common/filepath')
const { shareBurn } = require('./serialport/tool')

const DOWNLOADING = 'DOWNLOADING'
const DOWNLOADED = 'DOWNLOADED'
const DOWNLOAD_ERROR = 'DOWNLOAD_ERROR'

const URL = 'http://m5burner-api.m5stack.com'
const FIRMWARE_URL = 'https://m5burner.oss-cn-shenzhen.aliyuncs.com/firmware'

async function getFile(code) {
  try {
    let r= await axios.default({
      url: URL + '/api/firmware/share/' + code,
      method: 'GET'
    })
    return r.data.data.file
  } catch(e) {
    console.error('Invalid share code')
    return ''
  }
}

async function download(filename, send) {
  return new Promise((resolve, reject) => {
    let req = net.request({
      url: `${FIRMWARE_URL}/${filename}?v=${Date.now()}`,
      method: 'GET'
    })
    req.on('response', response => {
      let total = response.headers['content-length']
      let received = 0
      let buf = Buffer.from([])
      response.on('data', chunk => {
        received += chunk.length
        buf = Buffer.concat([buf, chunk])
        let progress = parseFloat((received / total).toFixed(4))
        send({
          status: DOWNLOADING,
          data: progress
        })
      })
      response.on('end', () => {
        let statusCode = response.statusCode
        if(statusCode === 200) {
          fs.writeFile(path.resolve(SHARE_DIR, filename), buf, e => {
            if(e) {
              send({
                status: DOWNLOAD_ERROR,
                data: {
                  message: 'Occurs errors when write file. ' + e.message
                }
              })
              resolve(false)
              return
            }
            // When download completed.
            send({
              status: DOWNLOADED,
              data: {}
            })
            resolve(true)
          })

        } else {
          send({
            status: DOWNLOAD_ERROR,
            data: {}
          })
          resolve(false)
        }
      })
      response.on('error', e => {
        send({
          status: DOWNLOAD_ERROR,
          data: {}
        })
        resolve(false)
      })
    })
    req.end()
  })
}

function bindShareEvents() {
  ipcMain.on(IPC_EVENT.IPC_SHARE_BURN, async (event, payload) => {
    let file = await getFile(payload.code)
    if(file === '') {
      event.sender.send(IPC_EVENT.IPC_SHARE_BURN, {
        status: -1,
        message: 'Invalid share code'
      })
      return
    }
    const send = data => {
      event.sender.send(IPC_EVENT.IPC_SHARE_BURN, data)
    }
    if(!fs.existsSync(path.resolve(SHARE_DIR, file))) {
      let r = await download(file, send)
      if(!r)
        return
    }
    shareBurn({
      com: payload.com,
      baudRate: payload.baudRate,
      file: file
    }, send)
  })
}

module.exports = {
  bindShareEvents
}
