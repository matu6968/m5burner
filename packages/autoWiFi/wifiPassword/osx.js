const { exec } = require('child_process')

module.exports = function getPassword(ssid) {
  return new Promise(resolve => {
    let password = ''
    let process = exec(`security find-generic-password -D "AirPort network password" -wa ${ssid}`)
    process.stdout.on('data', chunk => {
      password += chunk.toString()
    })
    process.on('exit', e => {
      resolve(password.trimEnd())
    })
  })
}
