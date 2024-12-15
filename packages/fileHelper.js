const fs = require('fs')
const { promisify } = require('util')

const existAsync = promisify(fs.exists)

function mkdirAsync(dir) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, { recursive: true }, (e, p) => {
      if(e) {
        reject(e.message)
        return
      }
      resolve()
    })
  })
}

async function ensureDir(dirs) {
  for(let i = 0; i < dirs.length; i++) {
    if(await existAsync(dirs[i])) {
      continue
    }
    await mkdirAsync(dirs[i])
  }
}

function write() {

}

module.exports = {
  ensureDir,
  write
}
