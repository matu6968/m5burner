const childProcess = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')
const {
  ESPTOOL_EXE,
  ESPTOOL_PY,
  KFLASH_EXE,
  KFLASH_PY,
  FIRMWARE_DIR,
  SHARE_DIR,
  GEN_ESP32PART_EXE,
  GEN_ESP32PART_PY,
  IDENTIFY_BIN
} = require('../common/filepath')
const PluginTypes = require('../pluginType')
const { useWifiPacker } = require('../plugin/uiflow-wifi-packer')
const { useTimerCamPacker } = require('../plugin/timercam-cfg-packer')
const { useUIFlow2NVS, mixinUIFlow2NVS} = require('../plugin/uiflow2-nvs-config')
const serial = require('./serial')

const size2address = {
  '4MB': '0x400000',
  '8MB': '0x800000',
  '16MB': '0x1000000'
}

let pid = null

const ALIAS_STICKV = 'stickv & unitv'

function getMac(port) {
  return new Promise(resolve => {
    let comPrefix = ''
    if(os.platform() === 'darwin' || os.platform() === 'linux') {
      comPrefix = '/dev/'
    }
    let process = runBurnScript(os.platform(), '', ['--port', comPrefix + port, 'read_mac'])
    pid = process.pid
    let output = ''
    process.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    process.stderr.on('data', chunk => {
      console.log(chunk.toString())
    })
    process.on('close', code => {
      if(code === 0) {
        let mac = output.substring(output.indexOf('MAC: ') + 5, output.indexOf('MAC: ')+ output.substring(output.indexOf('MAC: ')).indexOf('\n'))
        resolve({status: 'ok', data: mac.replace(/:/g, '').toUpperCase().trim()})
      } else {
        resolve({status: 'fail'})
      }
    })
  })
}

function kill() {
  if(os.platform() === 'win32') {
    childProcess.spawnSync('taskkill', ['/IM', 'exptool.exe', '-f'])
  }
  else if(os.platform() === 'linux') {
    childProcess.spawnSync('kill', ['-9', pid])
  }
  else if(os.platform() === 'darwin') {
    childProcess.spawnSync('kill', ['-9', pid])
  }
}

function generateBasicConfig(com, baudRate, device) {
  let comPrefix = ''
  if(os.platform() === 'darwin' || os.platform() === 'linux') {
    comPrefix = '/dev/'
  }

  if(device === ALIAS_STICKV) {
    return [
      '-b', baudRate,
      '-p', comPrefix + com
    ]
  }

  return [
    '--chip', 'auto',
    '--port', comPrefix + com,
    '--baud', baudRate,
    '--before', 'default_reset',
    'write_flash', '-z',
    '--flash_mode', 'dio',
    '--flash_freq', '80m',
    '--flash_size', 'detect'
  ]
}

function runBurnScript(platform, device, args) {
  if(platform === 'win32' && device === ALIAS_STICKV) {
    return childProcess.spawn(KFLASH_EXE, args)
  }
  else if(platform === 'win32' && device !== ALIAS_STICKV) {
    return childProcess.spawn(ESPTOOL_EXE, args)
  }
  else if((platform === 'linux' || platform === 'darwin') && device === ALIAS_STICKV) {
    return childProcess.spawn(global.pythonExec, [KFLASH_PY, ...args])
  }
  else if((platform === 'linux' || platform === 'darwin') && device !== ALIAS_STICKV) {
    return childProcess.spawn(global.pythonExec, [ESPTOOL_PY, ...args])
  }
}

function erase(opts, send) {
  let comPrefix = ''
  if(os.platform() === 'darwin' || os.platform() === 'linux') {
    comPrefix = '/dev/'
  }
  let process = runBurnScript(os.platform(), opts.device, ['--port', comPrefix + opts.com, 'erase_flash'])
  pid = process.pid
  process.stdout.on('data', chunk => {
    let msg = chunk.toString()
    send({
      status: 1,
      message: msg
    })
  })
  process.stderr.on('data', chunk => {
    let msg = chunk.toString()
    send({
      status: 1,
      message: msg
    })
  })
  process.on('close', code => {
    console.log(code)
    send({
      status: 0,
      message: code
    })
  })
}

function burn(opts, send) {
  let addr = '0x000'
  let binFile = path.resolve(FIRMWARE_DIR, opts.file)
  let basicConfig = generateBasicConfig(opts.com, opts.baudRate, opts.device)
  let pluginConfig = []
  if(opts.payload.pluginType) {
    // 配置固件
    const { args, pluginAddr } = opts.payload
    let flashAddr = pluginAddr
    if(flashAddr === 'ADDR_END') {
      flashAddr = '0x' + (fs.readFileSync(binFile).length + 0x1000).toString(16);
    }
    if(opts.payload.pluginType === PluginTypes.WIFI) {
      pluginConfig = useWifiPacker({...args, address: flashAddr})
    }
    else if(opts.payload.pluginType === PluginTypes.TIMERCAM_CFG) {
      pluginConfig = useTimerCamPacker({...args})
    }
    else if(opts.payload.pluginType === PluginTypes.UIFLOW2_CFG) {
      binFile = mixinUIFlow2NVS({...args, rawBin: binFile})[1]
    }
    else if(opts.payload.pluginType === PluginTypes.UPDATE_UIFLOW2_CFG) {
      let cfg = useUIFlow2NVS({...args})
      addr = cfg[0]
      binFile = cfg[1]
    }
  }

  let args = []
  if(opts.device === ALIAS_STICKV) {
    args = [...basicConfig, binFile]
  } else {
    args = [...basicConfig, ...pluginConfig, addr, binFile]
  }

  let process = runBurnScript(os.platform(), opts.device, args)
  pid = process.pid
  send({
    status: 1,
    message: args.join(' ')
  })
  process.stdout.on('data', chunk => {
    let msg = chunk.toString()
    send({
      status: 1,
      message: msg
    })
  })
  process.stderr.on('data', chunk => {
    let msg = chunk.toString()
    send({
      status: 1,
      message: msg
    })
  })
  process.on('close', code => {
    send({
      status: 0,
      message: code
    })
  })
}

function shareBurn(opts, send) {
  let binFile = path.resolve(SHARE_DIR, opts.file)
  let basicConfig = generateBasicConfig(opts.com, opts.baudRate)
  let args = [...basicConfig, '0x000', binFile]
  let process
  if(os.platform() === 'win32') {
    process = childProcess.spawn(ESPTOOL_EXE, args)
  } else {
    process = childProcess.spawn(global.pythonExec, [ESPTOOL_PY, ...args])
  }
  pid = process.pid
  send({
    status: 1,
    message: args.join(' ')
  })
  process.stdout.on('data', chunk => {
    let msg = chunk.toString()
    send({
      status: 1,
      message: msg
    })
  })
  process.stderr.on('data', chunk => {
    let msg = chunk.toString()
    send({
      status: 1,
      message: msg
    })
  })
  process.on('close', code => {
    send({
      status: 0,
      message: code
    })
  })
}

function burnIdentify(opts) {
  return new Promise(resolve => {
    let binFile = path.resolve(IDENTIFY_BIN)
    let basicConfig = generateBasicConfig(opts.com, opts.baudRate)
    let args = [...basicConfig, '0x000', binFile]
    let process
    if(os.platform() === 'win32') {
      process = childProcess.spawn(ESPTOOL_EXE, args)
    } else {
      process = childProcess.spawn(global.pythonExec, [ESPTOOL_PY, ...args])
    }
    pid = process.pid
    process.stdout.on('data', chunk => {
      console.log(chunk.toString())
    })
    process.stderr.on('data', chunk => {
      console.log(chunk.toString())
    })
    process.on('close', code => {
      let str = ''
      serial.connect(opts.com, output => {
        str += output
        try {
          let outputs = str.trim().split('\r\n')
          console.log(outputs[outputs.length - 1])
          let r = JSON.parse(outputs[outputs.length - 1])
          resolve(r)
          serial.disconnect()
        }
        catch(e) {
          console.log(e.message)
        }
      })
    })
  })
}

function readFirmware(opts, send) {
  let comPrefix = ''
  if(os.platform() === 'darwin' || os.platform() === 'linux') {
    comPrefix = '/dev/'
  }
  let process
  if(os.platform() === 'win32') {
    process = childProcess.spawn(ESPTOOL_EXE, ['--port', opts.port, '--baud', opts.baud, 'read_flash', 0, size2address[opts.size], opts.path])
  } else {
    process = childProcess.spawn(global.pythonExec, [ESPTOOL_PY, '--port', comPrefix + opts.port, '--baud', opts.baud, 'read_flash', 0, size2address[opts.size], opts.path])
  }

  pid = process.pid

  process.stdout.on('data', chunk => {
    send({
      status: 1,
      message: chunk.toString()
    })
  })

  process.stderr.on('data', chunk => {
    send({
      status: 1,
      message: chunk.toString()
    })
  })

  process.on('close', code => {
    // send({
    //   status: 0,
    //   message: code
    // })
    if(code !== 0){
      send({
        status: 0,
        message: code
      })
      return
    }
    fs.readFile(opts.path, (e, buffer) => {
      let partition = buffer.slice(0x8000, 0x9000)
      let partitionPath = `${opts.path}_partition`
      fs.writeFile(partitionPath, partition, e => {
        let process0
        if(os.platform() === 'win32') {
          process0 = childProcess.spawn(GEN_ESP32PART_EXE, [partitionPath])
        } else {
          process0 = childProcess.spawn(global.pythonExec, [GEN_ESP32PART_PY, partitionPath])
        }
        let r = ''
        process0.stdout.on('data', chunk => {
          r += chunk.toString()
        })
        process0.stderr.on('data', chunk => {
          console.log(chunk.toString())
        })
        process0.on('close', code => {
          let binBuffer = buffer
          if(r !== '' && r.split('\n').filter(s => s.startsWith('wifi,')).length > 0) {
            let wifiInfo = r.split('\n').filter(s => s.startsWith('wifi,'))[0].split(',')
            let wifiInfoAddress = parseInt(wifiInfo[3]) - 0x1000
            let wifiInfoLength = 0x2000
            let newBuffer = buffer.slice(0, wifiInfoAddress)
            let blankBuffer = Buffer.alloc(wifiInfoLength, 0xff)
            let otherBuffer = buffer.slice(wifiInfoAddress + wifiInfoLength)
            if(r !== '' && r.split('\n').filter(s => s.startsWith('nvs,')).length > 0) {
              binBuffer = Buffer.concat([newBuffer, blankBuffer, otherBuffer])
              let nvsInfo = r.split('\n').filter(s => s.startsWith('nvs,'))[0].split(',')
              let nvsInfoAddress = parseInt(nvsInfo[3])
              let nvsInfoLength = parseInt(nvsInfo[4]) * 0x400
              newBuffer = binBuffer.slice(0, nvsInfoAddress)
              blankBuffer = Buffer.alloc(nvsInfoLength, 0xff)
              otherBuffer = binBuffer.slice(nvsInfoAddress + nvsInfoLength)
              binBuffer = Buffer.concat([newBuffer, blankBuffer, otherBuffer])
              fs.writeFile(opts.path, binBuffer, e => {
                send({
                  status: 0,
                  message: code
                })
                fs.unlink(partitionPath, e => {
                  if(e) {
                    console.log('[ERR] ' + e)
                    return
                  }
                  console.log('[INFO] Removed partition')
                })
              })
            }
          } else {
            fs.writeFile(opts.path, binBuffer, e => {
              send({
                status: 0,
                message: code
              })
              fs.unlink(partitionPath, e => {
                if(e) {
                  console.log('[ERR] ' + e)
                  return
                }
                console.log('[INFO] Removed partition')
              })
            })
          }
        })
      })
    })
  })
}

module.exports = {
  kill,
  erase,
  burn,
  readFirmware,
  shareBurn,
  getMac,
  burnIdentify
}
