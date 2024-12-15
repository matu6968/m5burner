const { platform } = require('os')
const fs = require('fs')
const { promisify } = require('util')
const { SerialPort } = require('usb-native')

const readDirAsync = promisify(fs.readdir)

let currentSerialPort = null

async function getPorts() {
  let ports = []
  if(platform() === 'linux' || platform() === 'darwin') {
    // linux或MacOS下获取串口列表
    try {
      ports = await readDirAsync('/dev')
    }
    catch(e) {
      console.log(e.message)
    }
    if(platform() === 'darwin') {
      return ports.filter(p => p.startsWith('tty.'))
    } else {
      return ports.filter(p => p.startsWith('ttyUSB') || p.startsWith('ttyACM'))
    }
  } else {
    // 其他操作系统
    ports = await SerialPort.list()
    return ports.map(p => p.path)
  }
}

function connect(com, send) {
  let comName = platform() === 'linux' || platform() === 'darwin' ? '/dev/' + com : com

  if(currentSerialPort !== null) {
    currentSerialPort.close(e => {
      if(e) {
        console.log(e.message)
      }

      currentSerialPort = null
      connect(com, send)
    })
    return
  }

  const basicConf = {
    baudRate: 115200
  }

  const winConf = Object.assign({}, {
    rtscts: true
  }, basicConf)

  currentSerialPort = new SerialPort(comName, platform() === 'win32' ? winConf : basicConf)

  currentSerialPort.on('open', _ => {
    send(`[FROM M5Burner] ${currentSerialPort.path} opened.\r\n`)
  })

  currentSerialPort.on('data', chunk => {
    send(chunk.toString())
  })

  currentSerialPort.on('error', e => {
    send(e.message + '\r\n')
  })

}

function disconnect() {
  if(currentSerialPort === null)
    return

  try {
    currentSerialPort.close(e => {
      if(e) {
        console.log(e.message + '\r\n')
      }
      currentSerialPort = null
    })
  } catch(e) {
    console.log(e.message + '\r\n')
  }
}

function reboot() {
  if(currentSerialPort) {
    const commonConf = {
      first: {
        rts: true,
        dtr: false
      },
      second: {
        rts: false,
        dtr: false
      }
    }
    const winConf = {
      first: {
        rts: true,
        dtr: false
      },
      second: {
        rts: false,
        dtr: true
      }
    }

    const conf = platform() === 'win32' ? winConf : commonConf

    currentSerialPort.set(conf.first, _ => {
      currentSerialPort.set(conf.second, _ => {
        console.log(`[INFO] ${currentSerialPort.path} reboot`)
      })
    })
  }
}

module.exports = {
  getPorts,
  connect,
  disconnect,
  reboot
}
