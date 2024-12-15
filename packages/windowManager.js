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

module.exports = {
  addWindow,
  removeWindow,
  getWindow
}
