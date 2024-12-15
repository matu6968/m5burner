const { net, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const IPC_EVENT = require('./ipcEvent')
const { FIRMWARE_DIR } = require('./common/filepath')

const DOWNLOADING = 'DOWNLOADING'
const DOWNLOADED = 'DOWNLOADED'
const DOWNLOAD_ERROR = 'DOWNLOAD_ERROR'

const apiUrl = 'http://m5burner-api.m5stack.com'
const downloadBaseUrl = 'https://m5burner-cdn.m5stack.com/firmware'

function download(sender, fwInfo) {
  let req = net.request({
    url: `${downloadBaseUrl}/${fwInfo.selectedVersion.file}?v=${Date.now()}`,
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
      sender.send(`${IPC_EVENT.IPC_DOWNLOAD_FIRMWARE}/${fwInfo.selectedVersion.file}`, {
        status: DOWNLOADING,
        data: progress
      })
    })
    response.on('end', () => {
      let statusCode = response.statusCode
      if(statusCode === 200) {
        fs.writeFile(path.resolve(FIRMWARE_DIR, fwInfo.selectedVersion.file), buf, e => {
          if(e) {
            sender.send(`${IPC_EVENT.IPC_DOWNLOAD_FIRMWARE}/${fwInfo.selectedVersion.file}`, {
              status: DOWNLOAD_ERROR,
              data: {
                message: 'Occurs errors when write file. ' + e.message
              }
            })
            return
          }
          // When download completed.
          sender.send(`${IPC_EVENT.IPC_DOWNLOAD_FIRMWARE}/${fwInfo.selectedVersion.file}`, {
            status: DOWNLOADED,
            data: {}
          })

          axios.default({
            url: apiUrl + '/api/admin/firmware/download/' + fwInfo.fid,
            method: 'POST'
          }).then(_ => {}).catch(e => {})
        })

      } else {
        sender.send(`${IPC_EVENT.IPC_DOWNLOAD_FIRMWARE}/${fwInfo.selectedVersion.file}`, {
          status: DOWNLOAD_ERROR,
          data: {}
        })
      }
    })
    response.on('error', e => {
      sender.send(`${IPC_EVENT.IPC_DOWNLOAD_FIRMWARE}/${fwInfo.selectedVersion.file}`, {
        status: DOWNLOAD_ERROR,
        data: {}
      })
    })
  })
  req.end()
}

function bindDownloadEvents() {
  ipcMain.on(IPC_EVENT.IPC_DOWNLOAD_FIRMWARE, (event, args) => {
    download(event.sender, args)
  })
}

module.exports = {
  bindDownloadEvents
}
