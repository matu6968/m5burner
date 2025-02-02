const http = require('http')
const https = require('https')  // Add HTTPS support
const unzip = require('unzipper')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const os = require('os')
const { VERSION_INFO, TMP_DIR, ROOT_DIR } = require('./common/filepath')
const IPC_EVENT = require('./ipcEvent')
const wm = require('./windowManager')

// Update these URLs to point to your server
const UPDATE_CONFIG = {
  // Base URL for major updates
  baseUrl: process.env.M5BURNER_UPDATE_URL || 'https://m5burner.originui.dev',
  // Version info endpoint for major updates
  versionEndpoint: '/version.json',
  // Update packages path for major updates
  packagesPath: '/packages',
  // Hot patch URLs
  hotPatch: {
    versionUrl: 'http://m5burner-cdn.m5stack.com/appVersion.info',
    patchBaseUrl: 'http://m5burner-cdn.m5stack.com/patch'
  }
};

// Architecture mapping for different platforms
const ARCH_MAPPING = {
  win32: {
    ia32: 'x86',
    x64: 'x64',
    arm64: 'arm64'
  },
  darwin: {
    x64: 'x64',
    arm64: 'arm64'
  },
  linux: {
    ia32: 'x86',
    x64: 'x64',
    armv7l: 'armv7l',
    arm64: 'arm64'
  }
};

// Get normalized architecture for current platform
function getNormalizedArch() {
  const platform = os.platform();
  const arch = os.arch();
  
  if (ARCH_MAPPING[platform] && ARCH_MAPPING[platform][arch]) {
    return ARCH_MAPPING[platform][arch];
  }
  
  // Default to x64 if architecture is not explicitly supported
  console.log(`[WARN] Architecture ${arch} not explicitly supported, defaulting to x64`);
  return 'x64';
}

// Check for both major updates and hot patches
async function checkUpdate() {
  try {
    // Check for hot patches first
    const hotPatchCheck = await checkHotPatch();
    if (hotPatchCheck.needUpdate) {
      return {
        ...hotPatchCheck,
        isHotPatch: true,
        architecture: getNormalizedArch()
      };
    }

    // If no hot patch, check for major updates
    const r = await axios.default({
      url: `${UPDATE_CONFIG.baseUrl}${UPDATE_CONFIG.versionEndpoint}`
    });

    if (fs.existsSync(VERSION_INFO)) {
      const currentVersion = fs.readFileSync(VERSION_INFO, {encoding: 'utf8'}).trim();
      
      return {
        needUpdate: currentVersion !== r.data.version,
        version: r.data.version,
        required: r.data.required || false,
        notes: r.data.notes || '',
        minVersion: r.data.minVersion,
        isHotPatch: false,
        architecture: getNormalizedArch()
      };
    }

    return {
      needUpdate: true,
      version: r.data.version,
      required: r.data.required || false,
      notes: r.data.notes || '',
      isHotPatch: false,
      architecture: getNormalizedArch()
    };
  } catch(e) {
    console.log('[ERR] ' + e.message);
    return {
      needUpdate: false,
      version: '',
      isHotPatch: false,
      architecture: getNormalizedArch()
    };
  }
}

// Check specifically for hot patches
async function checkHotPatch() {
  try {
    const r = await axios.default({
      url: UPDATE_CONFIG.hotPatch.versionUrl
    });
    
    if (fs.existsSync(VERSION_INFO)) {
      const currentVersion = fs.readFileSync(VERSION_INFO, {encoding: 'utf8'}).trim();
      return {
        needUpdate: currentVersion !== r.data.toString().trim(),
        version: r.data.toString().trim()
      };
    }
    
    return {
      needUpdate: true,
      version: r.data.toString().trim()
    };
  } catch(e) {
    console.log('[ERR] Hot patch check failed:', e.message);
    return {
      needUpdate: false,
      version: ''
    };
  }
}

// Get platform-specific filename for hot patches
function getHotPatchFilename(version) {
  const platform = os.platform();
  const arch = getNormalizedArch();
  
  const platformMap = {
    'win32': 'win',
    'linux': 'linux',
    'darwin': 'macos'
  };

  const baseFilename = `${version}-${platformMap[platform] || 'win'}`;

  // Special case for Windows x86
  if (platform === 'win32' && arch === 'x86') {
    return `${baseFilename}32`;
  }

  return baseFilename;
}

// Apply hot patch update
async function applyHotPatch(version) {
  return new Promise((resolve, reject) => {
    const filename = getHotPatchFilename(version);
    const arch = getNormalizedArch();
    
    // Build URL with architecture parameter
    const archParam = arch !== 'x64' ? `&arch=${arch}` : '';
    const url = `${UPDATE_CONFIG.hotPatch.patchBaseUrl}/${filename}.zip?timestamp=${Date.now()}${archParam}`;

    // Try to download architecture-specific patch first
    downloadAndApplyPatch(url, version)
      .then(resolve)
      .catch(err => {
        if (arch !== 'x64') {
          // If arch-specific patch fails, fallback to x64 version
          console.log(`[INFO] ${arch} patch not found, trying x64 version`);
          const fallbackUrl = `${UPDATE_CONFIG.hotPatch.patchBaseUrl}/${filename}.zip?timestamp=${Date.now()}`;
          downloadAndApplyPatch(fallbackUrl, version)
            .then(resolve)
            .catch(reject);
        } else {
          reject(err);
        }
      });
  });
}

// Helper function to download and apply patch
function downloadAndApplyPatch(url, version) {
  return new Promise((resolve, reject) => {
    console.log(`[INFO] Attempting to download patch from: ${url}`);
    const patchFile = path.resolve(TMP_DIR, `patch_${Date.now().toString()}.zip`);
    
    const req = http.get(url, response => {
      if (response.statusCode === 404) {
        reject(new Error(`Patch not found for ${getNormalizedArch()}`));
        return;
      }

      const patchStream = fs.createWriteStream(patchFile);
      response.pipe(patchStream);
      
      response.on('end', () => {
        process.noAsar = true;
        const ws = unzip.Extract({path: ROOT_DIR});
        
        ws.on('close', () => {
          fs.unlink(patchFile, e => {
            if(e) {
              console.log('[ERR] ' + e.message);
              reject(e);
              return;
            }
            console.log('[INFO] Hot patch applied successfully');
            fs.writeFileSync(VERSION_INFO, version);
            
            wm.getWindow('main').webContents.send(IPC_EVENT.IPC_UPDATE_COMPLETED, {
              version,
              success: true,
              isHotPatch: true
            });
            resolve();
          });
        });

        ws.on('error', (err) => {
          console.error('[ERR] Hot patch extraction failed:', err);
          reject(err);
        });

        fs.createReadStream(patchFile).pipe(ws);
      });
    });

    req.on('error', (err) => {
      console.error('[ERR] Hot patch download failed:', err);
      reject(err);
    });

    req.end();
  });
}

// Update getFilename for major updates to support all architectures
function getFilename(version) {
  const platform = os.platform();
  const arch = getNormalizedArch();
  
  const platformMap = {
    'win32': 'win',
    'linux': 'linux',
    'darwin': 'mac'
  };

  const platformName = platformMap[platform] || 'win';
  
  return `m5burner-${version}-${platformName}-${arch}.zip`;
}

// Main update function that handles both update types
async function update(version, isHotPatch = false) {
  if (isHotPatch) {
    return applyHotPatch(version);
  }
  
  const filename = getFilename(version);
  const url = `${UPDATE_CONFIG.baseUrl}${UPDATE_CONFIG.packagesPath}/${filename}`;
  
  console.log(`[UPDATE] Downloading update from: ${url}`);

  // Use https or http based on URL
  const client = url.startsWith('https') ? https : http;
  
  return new Promise((resolve, reject) => {
    const req = client.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Update failed with status: ${response.statusCode}`));
        return;
      }

      const patchFile = path.resolve(TMP_DIR, `patch_${Date.now().toString()}.zip`);
      const patchStream = fs.createWriteStream(patchFile);
      
      response.pipe(patchStream);
      
      response.on('end', () => {
        process.noAsar = true;
        const ws = unzip.Extract({path: ROOT_DIR});
        
        ws.on('close', () => {
          fs.unlink(patchFile, e => {
            if(e) {
              console.log('[ERR] ' + e.message);
              reject(e);
              return;
            }
            console.log('[INFO] Updated to version ' + version);
            
            // Write new version to VERSION_INFO
            fs.writeFileSync(VERSION_INFO, version);
            
            wm.getWindow('main').webContents.send(IPC_EVENT.IPC_UPDATE_COMPLETED, {
              version,
              success: true
            });
            resolve();
          });
        });

        ws.on('error', (err) => {
          console.error('[ERR] Update extraction failed:', err);
          reject(err);
        });

        fs.createReadStream(patchFile).pipe(ws);
      });
    });

    req.on('error', (err) => {
      console.error('[ERR] Update download failed:', err);
      reject(err);
    });

    req.end();
  });
}

module.exports = {
  checkUpdate,
  update,
  getNormalizedArch  // Export for potential external use
}
