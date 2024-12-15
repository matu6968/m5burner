const path = require('path')
const os = require('os')
const environment = require('./environment')

let prefix = './'
let TOOL_DIR = ''

const sysDir = os.platform() === 'win32' ? 'windows' : (os.platform() === 'darwin' ? 'macos' : 'linux')

if(environment.isDev()) {
  prefix = path.resolve(__dirname, '..', '..', '..', 'debug')
  TOOL_DIR = path.resolve(prefix, '..', 'resource', sysDir)
} else {
  if(os.platform() === 'darwin') {
    prefix = path.resolve(__dirname, '..', '..', '..', 'packages')
  } else {
    prefix = path.resolve(__dirname, '..', '..', '..', '..', '..', 'packages')
  }

  TOOL_DIR = path.resolve(prefix, 'tool')
}

const ROOT_DIR = path.resolve(prefix, '..')
const TMP_DIR = path.resolve(prefix, 'tmp')
const FIRMWARE_DIR = path.resolve(prefix, 'firmware')
const DATA_DIR = path.resolve(prefix, 'dat')
const SHARE_DIR = path.resolve(prefix, 'share')
const IMAGE_DIR = path.resolve(prefix, 'images')
const VIEW_DIR = path.resolve(prefix, 'view')
const VIEW_HTML = path.resolve(prefix, 'view', 'index.html')
const FIRMWARE_LIST_FILE = path.resolve(DATA_DIR, 'local.json')
const ESPTOOL_EXE = path.resolve(TOOL_DIR, 'esptool.exe')
const ESPTOOL_PY = path.resolve(TOOL_DIR, 'esptool.py')
const KFLASH_EXE = path.resolve(TOOL_DIR, 'kflash.exe')
const KFLASH_PY = path.resolve(TOOL_DIR, 'kflash.py')
const GEN_ESP32PART_EXE = path.resolve(TOOL_DIR, 'gen_esp32part.exe')
const GEN_ESP32PART_PY = path.resolve(TOOL_DIR, 'gen_esp32part.py')
const NVS_EXE = path.resolve(TOOL_DIR, 'nvs.exe')
const NVS_PY = path.resolve(TOOL_DIR, 'nvs')
const NVS_BIN = path.resolve(TOOL_DIR, 'burner_nvs.bin')
const IDENTIFY_BIN = path.resolve(TOOL_DIR, 'esp32_board_identify.bin')
const VERSION_INFO = path.resolve(prefix, 'appVersion.info')

module.exports = {
  ROOT_DIR,
  TMP_DIR,
  FIRMWARE_DIR,
  DATA_DIR,
  SHARE_DIR,
  IMAGE_DIR,
  VIEW_DIR,
  VIEW_HTML,
  FIRMWARE_LIST_FILE,
  TOOL_DIR,
  ESPTOOL_EXE,
  ESPTOOL_PY,
  KFLASH_EXE,
  KFLASH_PY,
  GEN_ESP32PART_EXE,
  GEN_ESP32PART_PY,
  NVS_EXE,
  NVS_PY,
  NVS_BIN,
  IDENTIFY_BIN,
  VERSION_INFO
}
