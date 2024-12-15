const { ipcMain, net } = require('electron')
const fs = require('fs')
const path = require('path')
const { IMAGE_DIR } = require('./common/filepath')
const IPC_EVENT = require('./ipcEvent')

const ONLINE_IMAGE_URL = 'http://m5burner.m5stack.com/cover'

function bindImageLoaderEvents() {
  ipcMain.on(IPC_EVENT.IPC_LOAD_IMAGE, (event, args) => {
    let image = args.image
    let req = net.request({
      url: `${ONLINE_IMAGE_URL}/${image}`
    })
    req.on('response', response => {
      let buf = Buffer.from([])
      response.on('data', chunk => {
        buf = Buffer.concat([buf, chunk])
      })
      response.on('end', () => {
        if(response.statusCode === 200) {
          fs.writeFile(path.resolve(IMAGE_DIR, image), buf, e => {
            if(e) {
              console.log(e)
              event.sender.send(`${IPC_EVENT.IPC_LOAD_IMAGE}/${image}`, { status: -1 })
              return
            }
            event.sender.send(`${IPC_EVENT.IPC_LOAD_IMAGE}/${image}`, { status: 0 })
          })
        } else {
          event.sender.send(`${IPC_EVENT.IPC_LOAD_IMAGE}/${image}`, { status: -1 })
        }
      })
    })
    req.end()
  })
}

module.exports = {
  bindImageLoaderEvents
}
