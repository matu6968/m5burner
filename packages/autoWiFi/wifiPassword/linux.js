const { exec } = require('child_process')

module.exports = function getPassword(ssid) {
  return new Promise(resolve => {
    let password = ''
    let output = ''
    let process = exec(`ls /etc/NetworkManager/system-connections/${ssid}.nmconnection`)
    process.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    process.on('exit', code => {
      if(code === 0) {
        let ret = /^\s*(?:psk|password)=(.+)\s*$/gm.exec(output)
        password = ret && ret.length ? ret[1] : ''
        resolve(password)
      } else {
        resolve('')
      }
    })
  })
}
