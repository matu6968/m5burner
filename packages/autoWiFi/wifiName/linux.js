const { exec } = require('child_process')

module.exports = function getSSID() {
  return new Promise(resolve => {
    let ssid = ''
    let process = exec(`iwgetid --raw`)
    process.stdout.on('data', chunk => {
      ssid += chunk.toString()
    })
    process.on('exit', code => {
      resolve(ssid)
    })
  })
}
