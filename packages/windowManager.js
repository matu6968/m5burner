const windowLists = {}

function addWindow(name, win) {
  windowLists[name] = win
}

function removeWindow(name) {
  delete windowLists[name]
}

function getWindow(name) {
  return windowLists[name]
}

function createWindow() {
  // ... existing window creation code ...

  win.on('closed', () => {
    // Clean up USB monitoring when window closes
    const serial = require('./serialport/serial')
    serial.stopMonitoring()
    // ... existing cleanup code ...
  })
}

module.exports = {
  addWindow,
  removeWindow,
  getWindow
}
