const fs = require('fs')
const path = require('path')
const { TMP_DIR } = require('../common/filepath')

const createTimerCamCfgBin = function(option) {
  let json = JSON.stringify(option)
  let messageBuffer = Buffer.from([(json.length >> 8) & 0xFF, json.length & 0xFF])
  let dataBuffer = Buffer.from(json)
  let otherBuffer = Buffer.alloc(0x1000 - messageBuffer.length - dataBuffer.length, 0xFF)

  let crc = messageBuffer[0] + messageBuffer[1]
  dataBuffer.forEach(buf => {
    crc += buf
  })
  crc = crc & 0xFF
  otherBuffer[0] = crc

  let binBuffer = Buffer.concat([messageBuffer, dataBuffer, otherBuffer])
  let dest = path.resolve(TMP_DIR, 'timercam.cfg')
  fs.writeFileSync(dest, binBuffer, { flag: 'w' })
}

const useTimerCamPacker = function(option) {
  createTimerCamCfgBin(option)
  let dest = path.resolve(TMP_DIR, 'timercam.cfg')
  return [
    '0x3ff000',
    dest
  ]
}

module.exports = {
  useTimerCamPacker
}
