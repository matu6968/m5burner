const fs = require('fs');
const { spawnSync } = require('child_process')
const path = require('path');
const { TMP_DIR, NVS_EXE, NVS_PY } = require('../common/filepath');
const os = require('os')
const { writeFileSync } = require('fs')

const src = path.resolve(TMP_DIR, 'uiflow2.csv')
const dest = path.resolve(TMP_DIR, 'uiflow2-cfg.bin')
const mixinBin = path.resolve(TMP_DIR, 'uiflow2-mixin.bin')

const fillCSV = ({server, ssid, pwd, sntp0, sntp1, sntp2, timezone, bootOpt}) =>
`key,type,encoding,value
uiflow,namespace,,
server,data,string,${server}
ssid0,data,string,${ssid}
pswd0,data,string,${pwd}
ssid1,data,string,
pswd1,data,string,
ssid2,data,string,
pswd2,data,string,
sntp0,data,string,${sntp0}
sntp1,data,string,${sntp1}
sntp2,data,string,${sntp2}
tz,data,string,${timezone}
boot_option,data,u8,${bootOpt}`

function generateCSV(option) {
  let csv = fillCSV(option)
  fs.writeFileSync(src, csv)
}

const mixinUIFlow2NVS = function(option) {
  generateCSV(option)
  if(os.platform() === 'darwin' || os.platform() === 'linux') {
    try {
      spawnSync('chmod', ['+x', NVS_PY])
    } catch {

    }
    spawnSync(NVS_PY, ['generate', src, dest, 0x6000])
  } else {
    spawnSync(NVS_EXE, ['generate', src, dest, 0x6000])
  }
  let rawBin = fs.readFileSync(option.rawBin)
  let csvBin = fs.readFileSync(dest)

  let buffer0 = rawBin.slice(0, 0x9000)
  let buffer1 = csvBin.slice(0)
  let buffer2 = rawBin.slice(0x9000 + 0x6000)
  writeFileSync(mixinBin, Buffer.concat([buffer0, buffer1, buffer2]))

  return [
    '0x9000',
    mixinBin
  ]
}

const useUIFlow2NVS = function(option) {
  generateCSV(option)
  if(os.platform() === 'darwin' || os.platform() === 'linux') {
    try {
      spawnSync('chmod', ['+x', NVS_PY])
    } catch {

    }
    spawnSync(NVS_PY, ['generate', src, dest, 0x6000])
  } else {
    spawnSync(NVS_EXE, ['generate', src, dest, 0x6000])
  }

  return [
    '0x9000',
    dest
  ]
}

module.exports = {
  mixinUIFlow2NVS,
  useUIFlow2NVS
}
