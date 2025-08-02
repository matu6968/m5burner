const http = require('http')
const unzip = require('unzipper')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const os = require('os')
const { VERSION_INFO, TMP_DIR, ROOT_DIR } = require('./common/filepath')
const IPC_EVENT = require('./ipcEvent')
const wm = require('./windowManager')

// Old base URLs for version info and patch update.
const ONLINE_VERSION_URL = 'http://m5burner-cdn.m5stack.com/appVersion.info'
//const APP_PATCH_URL = 'http://m5burner-cdn.m5stack.com/patch'

// Base URLs for version info and patch update.
//const ONLINE_VERSION_URL = 'http://m5burner.originui.dev/appVersion.info'
const APP_PATCH_URL = 'http://m5burner.originui.dev/patch'


/**
 * Returns the architecture string for the query parameter based on the current
 * platform and process.arch.
 *
 * Supported mappings:
 *  - Windows:  'ia32' => 'x86', 'x64' => 'x64', 'arm64' => 'arm64'
 *  - MacOS:    'x64' => 'x64', 'arm64' => 'arm64'
 *  - Linux:    'ia32' => 'x86', 'x64' => 'x64', 'arm' => 'armv7l', 'arm64' => 'arm64'
 *
 * Returns null if the current environment isn’t supported.
 */
function getArchSuffix() {
  const arch = process.arch;
  const platform = os.platform();
  if (platform === 'win32') {
    if (arch === 'ia32') return 'x86';
    else if (arch === 'x64') return 'x64';
    else if (arch === 'arm64') return 'arm64';
    else return null;
  } else if (platform === 'darwin') {
    if (arch === 'x64') return 'x64';
    else if (arch === 'arm64') return 'arm64';
    else return null;
  } else if (platform === 'linux') {
    if (arch === 'ia32') return 'x86';
    else if (arch === 'x64') return 'x64';
    else if (arch === 'arm') return 'armv7l';
    else if (arch === 'arm64') return 'arm64';
    else return null;
  } else {
    return null;
  }
}

/**
 * Returns the platform string for the query parameter.
 *
 * Supported mappings:
 *  - Windows: 'win32' → 'windows'
 *  - MacOS:   'darwin' → 'macos'
 *  - Linux:   'linux' → 'linux'
 *
 * Returns null if the platform isn’t supported.
 */
function getPlatformSuffix() {
  const platform = os.platform();
  if (platform === 'win32') return 'windows';
  else if (platform === 'linux') return 'linux';
  else if (platform === 'darwin') return 'macos';
  else return null;
}

/**
 * Checks for an update.
 *
 * When fetching the new version info file, the request URL is built by adding:
 *  - a platform query parameter (e.g. ?platform=linux)
 *  - optionally, an arch query parameter (e.g. &arch=arm64) if applicable.
 *
 * This way the server can return a version info file specific to the current platform,
 * and optionally to the current architecture.
 */
async function checkUpdate() {
  try {
    const platformSuffix = getPlatformSuffix();
    const archSuffix = getArchSuffix();

    if (!platformSuffix) {
      console.warn(`[WARN] Platform "${os.platform()}" is not supported. Update aborted.`);
      return { needUpdate: false, version: '' };
    }

    // Build the version info URL with required query parameters.
    let versionUrl = ONLINE_VERSION_URL;
    // Append the platform parameter.
    versionUrl += (versionUrl.includes('?') ? '&' : '?') + 'platform=' + platformSuffix;
    // Append the arch parameter if available.
    if (archSuffix) {
      versionUrl += '&arch=' + archSuffix;
    }

    let r = await axios.default({ url: versionUrl });
    if (fs.existsSync(VERSION_INFO)) {
      let cur = fs.readFileSync(VERSION_INFO, { encoding: 'utf8' });
      return {
        needUpdate: cur.trim() !== r.data.toString().trim(),
        version: r.data
      }
    } else {
      return {
        needUpdate: true,
        version: r.data
      }
    }
  } catch (e) {
    console.log('[ERR] ' + e.message)
    return {
      needUpdate: false,
      version: ''
    }
  }
}

/**
 * Returns a filename based on the given hashCode and the current platform.
 * (This logic is preserved from before.)
 */
function getFilename(hashCode) {
  if (os.platform() === 'win32') {
    return hashCode + '-' + 'win'
  }
  else if (os.platform() === 'linux') {
    return hashCode + '-' + 'linux'
  }
  else if (os.platform() === 'darwin') {
    return hashCode + '-' + 'macos'
  }
  else {
    return hashCode + '-' + 'win'
  }
}

/**
 * Applies the update patch by downloading the ZIP file from the update server.
 *
 * The patch URL is built using the hashCode and, in addition, both the
 * platform and arch query parameters are appended. This ensures that the correct
 * update package is retrieved from the server.
 *
 * If the server returns a non‑200 status (i.e. the package isn’t available for the
 * current platform/architecture), a warning is issued and no update is applied.
 */
function update(hashCode) {
  const platformSuffix = getPlatformSuffix();
  const archSuffix = getArchSuffix();

  if (!platformSuffix) {
    console.warn(`[WARN] Platform "${os.platform()}" is not supported. Update aborted.`);
    return;
  }
  if (!archSuffix) {
    console.warn(`[WARN] Architecture "${process.arch}" is not supported on platform "${os.platform()}". Update aborted.`);
    return;
  }

  let filename = getFilename(hashCode);
  // Build the patch URL with both platform and arch parameters.
  let url = `${APP_PATCH_URL}/${filename}.zip?timestamp=${Date.now()}&platform=${platformSuffix}&arch=${archSuffix}`;

  let req = http.get(url, response => {
    if (response.statusCode !== 200) {
      console.warn(`[WARN] Update not found for platform "${platformSuffix}" and architecture "${archSuffix}" (HTTP ${response.statusCode}). Update aborted.`);
      // Consume any response data to free up memory.
      response.resume();
      return;
    }
    let patchFile = path.resolve(TMP_DIR, `patch_${Date.now().toString()}.zip`)
    let patchStream = fs.createWriteStream(patchFile)
    response.pipe(patchStream)
    response.on('end', () => {
      process.noAsar = true;
      let ws = unzip.Extract({ path: ROOT_DIR })
      ws.on('close', () => {
        fs.unlink(patchFile, e => {
          if (e) {
            console.log('[ERR] ' + e.message)
            return
          }
          console.log('[INFO] Updated ' + hashCode)
          wm.getWindow('main').webContents.send(IPC_EVENT.IPC_UPDATE_COMPLETED, null)
        })
      })
      fs.createReadStream(patchFile).pipe(ws)
    })
  })
  req.on('error', err => {
    console.warn('[WARN] Error while fetching update: ' + err.message);
  });
  req.end()
}

module.exports = {
  checkUpdate,
  update
}

