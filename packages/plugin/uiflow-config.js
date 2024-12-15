const { ipcMain } = require('electron')
const childProcess = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { ESPTOOL_EXE, ESPTOOL_PY, TMP_DIR, FIRMWARE_DIR } = require('../common/filepath')
const IPC_EVENT = require('../ipcEvent')

const CONFIG_FILE_PATH = path.resolve(TMP_DIR, 'uiflow.cfg')

function getBeginAddress(binFile) {
  let binSize = fs.statSync(binFile).size
  let binSizeHex = '0x' + binSize.toString(16)
  return binSizeHex
}

function getConfig(payload, send) {
  let { com, file } = payload

  let binFile = path.resolve(FIRMWARE_DIR, `${file}`)
  let beginAddr = getBeginAddress(binFile)

  let process

  if(os.platform() === 'win32') {
    process = childProcess.spawn(ESPTOOL_EXE, [
      '--chip', 'auto', '--baud', '115200',
      '--port', com, 'read_flash', beginAddr, '0x1000',
      CONFIG_FILE_PATH
    ])
  } else {
    process = childProcess.spawn(global.pythonExec, [
      ESPTOOL_PY,
      '--chip', 'auto', '--baud', '115200',
      '--port', '/dev/' + com, 'read_flash', beginAddr, '0x1000',
      CONFIG_FILE_PATH
    ]);
  }

  let jsonStr = '';
  process.stdout.on('data', chunk => {
    jsonStr += chunk.toString()
  })
  process.stderr.on('data', chunk => {
    jsonStr += chunk.toString()
  })
  process.on('exit', code => {
    if(code === 0) {
      let binData = fs.readFileSync(CONFIG_FILE_PATH);
      let result = resolveBinData(binData).toString();
      if(result === '') {
        send('Error');
      } else {
        send(result);
      }
    } else {
      send('Error');
    }
  })
}

function setConfig(payload, send) {
  let { com, file } = payload

  let binFile = path.resolve(FIRMWARE_DIR, `${file}`)
  let beginAddr = getBeginAddress(binFile)

  let json = JSON.stringify(payload.option)
  let messageBuffer = Buffer.from([(json.length >> 8) & 0xFF, json.length & 0xFF])
  let dataBuffer = Buffer.from(json)
  let otherBuffer = Buffer.alloc(0x1000 - messageBuffer.length - dataBuffer.length, 0xFF)

  let crc = messageBuffer[0] + messageBuffer[1]
  dataBuffer.forEach(buf => {
    crc += buf
  });
  crc = crc & 0xFF
  otherBuffer[0] = crc

  let binBuffer = Buffer.concat([messageBuffer, dataBuffer, otherBuffer])
  fs.writeFileSync(CONFIG_FILE_PATH, binBuffer, { flag: 'w' })

  let process
  if(os.platform() === 'win32') {
    process = childProcess.spawn(ESPTOOL_EXE, [
      '--chip', 'auto', '--baud', '115200',
      '--port', com, 'write_flash', beginAddr, CONFIG_FILE_PATH
    ])
  } else {
    process = childProcess.spawn(global.pythonExec, [
      ESPTOOL_PY,
      '--chip', 'auto', '--baud', '115200',
      '--port', '/dev/' + com, 'write_flash', beginAddr, CONFIG_FILE_PATH
    ])
  }
  let jsonStr = '';
  process.stdout.on('data', chunk => {
    jsonStr += chunk.toString()
  });
  process.stderr.on('data', chunk => {
    jsonStr += chunk.toString()
  });
  process.on('exit', code => {
    if(code === 0) {
      send('Ok');
    } else {
      send('Error');
    }
  });
}

function resolveBinData(binData) {
  let len = binData.readIntBE(0, 2);
  let crcPos = len + 2;

  let total = 0;
  for(let i = 0; i < crcPos; i++) {
    total += binData[i];
  }

  if((total & 0xff) === binData[crcPos]) {
    return binData.slice(2, crcPos);
  }

  return '';
}

function bindPluginUIFlowEvents() {
  ipcMain.on(IPC_EVENT.IPC_PLUGIN_UIFLOW_SET_CONFIG, (event, args) => {
    setConfig(args, data => event.sender.send(IPC_EVENT.IPC_PLUGIN_UIFLOW_SET_CONFIG, data))
  })
  ipcMain.on(IPC_EVENT.IPC_PLUGIN_UIFLOW_GET_CONFIG, (event, args) => {
    getConfig(args, data => event.sender.send(IPC_EVENT.IPC_PLUGIN_UIFLOW_GET_CONFIG, data))
  })
}

module.exports = {
  getConfig,
  setConfig,
  bindPluginUIFlowEvents
}
