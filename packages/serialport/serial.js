const { platform } = require('os')
const fs = require('fs')
const { promisify } = require('util')
const usb = require('usb')
const { SerialPort } = require('serialport')

const readDirAsync = promisify(fs.readdir)

let currentSerialPort = null

async function getPorts() {
  let ports = []
  if(platform() === 'linux' || platform() === 'darwin') {
    // linux or MacOS port listing
    try {
      ports = await readDirAsync('/dev')
    }
    catch(e) {
      console.log('[ERR] Failed to read /dev:', e.message)
    }
    if(platform() === 'darwin') {
      return ports.filter(p => p.startsWith('tty.'))
    } else {
      return ports.filter(p => p.startsWith('ttyUSB') || p.startsWith('ttyACM'))
    }
  } else {
    // Windows and other OS port listing
    try {
      ports = await SerialPort.list()
      return ports.map(p => p.path)
    } catch(e) {
      console.log('[ERR] Failed to list serial ports:', e.message)
      return []
    }
  }
}

function connect(com, send) {
  let comName = platform() === 'linux' || platform() === 'darwin' ? '/dev/' + com : com

  // Close existing connection first
  if(currentSerialPort !== null) {
    currentSerialPort.close(e => {
      if(e) {
        console.log('[ERR] Failed to close existing port:', e.message)
      }
      currentSerialPort = null
      connect(com, send)
    })
    return
  }

  // Configure port settings
  const basicConf = {
    baudRate: 115200,
    autoOpen: false  // Don't open immediately to handle errors better
  }

  const winConf = {
    ...basicConf,
    rtscts: true
  }

  try {
    // Create new SerialPort instance
    currentSerialPort = new SerialPort({
      path: comName,
      ...platform() === 'win32' ? winConf : basicConf
    })

    // Handle port opening
    currentSerialPort.open((err) => {
      if (err) {
        send(`[ERR] Failed to open ${comName}: ${err.message}\r\n`)
        currentSerialPort = null
        return
      }
      send(`[FROM M5Burner] ${comName} opened.\r\n`)
    })

    // Set up event handlers
    currentSerialPort.on('data', chunk => {
      send(chunk.toString())
    })

    currentSerialPort.on('error', e => {
      send(`[ERR] ${e.message}\r\n`)
    })

    currentSerialPort.on('close', () => {
      send(`[FROM M5Burner] ${comName} closed.\r\n`)
      currentSerialPort = null
    })

  } catch(e) {
    send(`[ERR] Failed to create SerialPort instance: ${e.message}\r\n`)
    currentSerialPort = null
  }
}

function disconnect() {
  if(currentSerialPort === null) return

  try {
    currentSerialPort.close(e => {
      if(e) {
        console.log('[ERR] Failed to close port:', e.message)
      }
      currentSerialPort = null
    })
  } catch(e) {
    console.log('[ERR] Error during disconnect:', e.message)
    currentSerialPort = null
  }
}

function reboot() {
  if(!currentSerialPort) return

  const commonConf = {
    first: { rts: true, dtr: false },
    second: { rts: false, dtr: false }
  }

  const winConf = {
    first: { rts: true, dtr: false },
    second: { rts: false, dtr: true }
  }

  const conf = platform() === 'win32' ? winConf : commonConf

  try {
    currentSerialPort.set(conf.first, () => {
      currentSerialPort.set(conf.second, () => {
        console.log(`[INFO] ${currentSerialPort.path} rebooted`)
      })
    })
  } catch(e) {
    console.log('[ERR] Failed to reboot device:', e.message)
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
