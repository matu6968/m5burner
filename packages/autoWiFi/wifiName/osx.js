const { exec } = require('child_process')

module.exports = function getSSID() {
  return new Promise(resolve => {
    let ssid = ''
    let process = exec(`/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/AIrport -I | awk '/ SSID/ {print substr($0, index($0, $2))}'`)
    process.stdout.on('data', chunk => {
      ssid += chunk.toString()
    })
    process.on('exit', e => {
      resolve(ssid.trimEnd())
    })
  })
}
