const { platform } = require('os')
const fs = require('fs')
const { promisify } = require('util')
const usb = require('usb')
const SerialPort = require('serialport')

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

function findDevices() {
    const devices = usb.getDeviceList();
    return devices.filter(device => {
        // Get device descriptor
        const desc = device.deviceDescriptor;
        
        // Check if it's a USB-Serial device
        // Common USB-Serial vendors/products:
        // CP210x: VID=0x10C4, PID=0xEA60
        // CH34x:  VID=0x1A86, PID=0x7523
        // FTDI:   VID=0x0403, various PIDs
        return (
            (desc.idVendor === 0x10C4 && desc.idProduct === 0xEA60) || // CP210x
            (desc.idVendor === 0x1A86 && desc.idProduct === 0x7523) || // CH34x
            (desc.idVendor === 0x0403) // FTDI devices
        );
    }).map(device => {
        const desc = device.deviceDescriptor;
        return {
            locationId: device.portNumbers.join('.'),
            vendorId: desc.idVendor.toString(16).padStart(4, '0'),
            productId: desc.idProduct.toString(16).padStart(4, '0'),
            manufacturer: getStringDescriptor(device, desc.iManufacturer),
            serialNumber: getStringDescriptor(device, desc.iSerialNumber),
            product: getStringDescriptor(device, desc.iProduct)
        };
    });
}

// Helper function to get string descriptors
function getStringDescriptor(device, index) {
    try {
        device.open();
        const descriptor = device.getStringDescriptor(index);
        device.close();
        return descriptor;
    } catch (error) {
        return '';
    }
}

// Update the device monitoring logic
let deviceWatcher = null;

function startMonitoring(callback) {
    if (deviceWatcher) return;

    // Initial device list
    callback(findDevices());

    // Monitor for device changes
    usb.on('attach', () => {
        callback(findDevices());
    });

    usb.on('detach', () => {
        callback(findDevices());
    });

    deviceWatcher = true;
}

function stopMonitoring() {
    if (!deviceWatcher) return;
    
    usb.removeAllListeners('attach');
    usb.removeAllListeners('detach');
    deviceWatcher = null;
}

module.exports = {
  getPorts,
  connect,
  disconnect,
  reboot,
  findDevices,
  startMonitoring,
  stopMonitoring
}
