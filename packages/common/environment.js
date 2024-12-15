const childProcess = require('child_process')

const isDev = () => process.argv.includes('--debug')

const detectPython = () => {
  try {
    childProcess.execSync('which python3')
    return 'python3'
  } catch(e) {}

  try {
    childProcess.execSync('which python')
    return 'python'
  } catch(e) {
    return ''
  }
}

module.exports = {
  isDev,
  detectPython
}
