const { exec } = require('child_process')

module.exports = function getPassword(ssid) {
  return new Promise(resolve => {
    let password = ''
    let output = ''
    let process = exec(`chcp 437 && netsh wlan show profile name=${ssid} key=clear`)
    process.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    process.on('exit', e => {
      let ret = /^\s*Key Content\s*: (.+)\s*$/gm.exec(output)
      password = ret && ret.length ? ret[1] : ''
      resolve(password)
    })
  })
}
