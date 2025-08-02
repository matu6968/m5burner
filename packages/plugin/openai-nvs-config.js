const fs = require('fs');
const { spawnSync } = require('child_process')
const path = require('path');
const { TMP_DIR, NVS_EXE, NVS_PY } = require('../common/filepath');
const os = require('os')
const { writeFileSync } = require('fs')

const src = path.resolve(TMP_DIR, 'openai.csv')
const dest = path.resolve(TMP_DIR, 'openai-cfg.bin')
const mixinBin = path.resolve(TMP_DIR, 'openai-mixin.bin')

const fillCSV = ({ssid, pwd, openaiKey}) => {
  let csv = `key,type,encoding,value
config,namespace,,
wifi_ssid,data,string,${ssid}
wifi_password,data,string,${pwd}
openaikey,data,string,${openaiKey}`

  return csv
}

function generateCSV(option) {
  let csv = fillCSV(option)
  fs.writeFileSync(src, csv)
}

const mixinOpenaiNVS = function(option) {
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

const useOpenaiNVS = function(option) {
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
  mixinOpenaiNVS,
  useOpenaiNVS
}
