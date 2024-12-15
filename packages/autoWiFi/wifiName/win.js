const { exec } = require('child_process')

module.exports = function getSSID() {
  return new Promise(resolve => {
    let ssid = ''
    let output = ''
    let process = exec(`chcp 437 && netsh wlan show interface`)
    process.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    process.on('exit', e => {
      let ret = /^\s*SSID\s*: (.+)\s*$/gm.exec(output)
      ssid = ret && ret.length ? ret[1] : ''
      resolve(ssid)
    })
  })
}
