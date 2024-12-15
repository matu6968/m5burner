const http = require('http')
const unzip = require('unzipper')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const os = require('os')
const { VERSION_INFO, TMP_DIR, ROOT_DIR } = require('./common/filepath')
const IPC_EVENT = require('./ipcEvent')
const wm = require('./windowManager')

const ONLINE_VERSION_URL = 'http://m5burner-cdn.m5stack.com/appVersion.info'
const APP_PATCH_URL = 'http://m5burner-cdn.m5stack.com/patch'

async function checkUpdate() {
  try {
    let r = await axios.default({
      url: ONLINE_VERSION_URL
    })
    if(fs.existsSync(VERSION_INFO)) {
      let cur = fs.readFileSync(VERSION_INFO, {encoding: 'utf8'})
      return {
        needUpdate: cur.trim() !== r.data.toString().trim(),
        version: r.data
      }
    } else {
      return {
        needUpdate: true,
        version: r.data
      }
    }
  }
  catch(e) {
    console.log('[ERR] ' + e.message)
    return {
      needUpdate: false,
      version: ''
    }
  }
}

function getFilename(hashCode) {
  if(os.platform() === 'win32') {
    return hashCode + '-' + 'win'
  }
  else if(os.platform() === 'linux') {
    return hashCode + '-' + 'linux'
  }
  else if(os.platform() === 'darwin') {
    return hashCode + '-' + 'macos'
  }
  else {
    return hashCode + '-' + 'win'
  }
}

function update(hashCode) {
  let filename = getFilename(hashCode)
  let url = APP_PATCH_URL + '/' + filename + '.zip?timestamp=' + Date.now()
  let req = http.get(url, response => {
    let patchFile = path.resolve(TMP_DIR, `patch_${Date.now().toString()}.zip`)
    let patchStream = fs.createWriteStream(patchFile)
    response.pipe(patchStream)
    response.on('end', () => {
      process.noAsar = true;
      let ws = unzip.Extract({path: ROOT_DIR})
      ws.on('close', () => {
        fs.unlink(patchFile, e => {
          if(e) {
            console.log('[ERR] ' + e.message)
            return
          }
          console.log('[INFO] Updated ' + hashCode)
          wm.getWindow('main').webContents.send(IPC_EVENT.IPC_UPDATE_COMPLETED, null)
        })
      })
      fs.createReadStream(patchFile).pipe(ws)
    })
  })
  req.end()
}

module.exports = {
  checkUpdate,
  update
}
