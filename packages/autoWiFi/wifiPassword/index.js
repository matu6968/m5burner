if(process.platform === 'win32') {
  module.exports = require('./win')
}
else if(process.platform === 'linux') {
  module.exports = require('./linux')
}
else if(process.platform === 'darwin') {
  module.exports = require('./osx')
}
