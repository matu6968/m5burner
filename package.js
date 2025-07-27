const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Define paths and constants
let ARCH = process.arch;
if (ARCH === 'arm') ARCH = 'armv7l';

// Get platform-specific output paths and settings
const getPlatformConfig = () => {
    const platform = process.platform;
    
    if (platform === 'darwin') {
        return {
            electronOutput: ARCH === 'x64' ? 'dist/mac/M5Burner.app' : `dist/mac-${ARCH}/M5Burner.app`,
            outputDir: `m5burner-${ARCH}.app`,
            electronBuildCmd: 'electron-builder --mac dmg --config electron-builder.config.js',
            needsResourcesCopy: true
        };
    } else if (platform === 'win32') {
        return {
            electronOutput: ARCH === 'x64' ? 'dist/win-unpacked' : `dist/win-${ARCH}-unpacked`,
            outputDir: `m5burner-${ARCH}`,
            electronBuildCmd: 'electron-builder --win',
            needsResourcesCopy: false
        };
    } else {
        // Linux
        return {
            electronOutput: ARCH === 'x64' ? 'dist/linux-unpacked' : `dist/linux-${ARCH}-unpacked`,
            outputDir: `m5burner-${ARCH}`,
            electronBuildCmd: 'electron-builder --linux',
            needsResourcesCopy: false
        };
    }
};

const platformConfig = getPlatformConfig();
const BASE_FOLDER = platformConfig.outputDir;
const ELECTRON_BUILD_CMD = platformConfig.electronBuildCmd;
const DOWNGRADE_ESPTOOL = 'cd deps-updaters && node esptool-update.js --support-below-py3.10'
const PYINSTALLER_CMD = 'pyinstaller --onefile esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/nvs_partition_gen.py --distpath esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/dist';
const ELECTRON_OUTPUT = platformConfig.electronOutput;
const BUILD_DIR = path.resolve('deps');
const OUTPUT_DIR = path.resolve(BASE_FOLDER);
const BIN_DIR = path.join(OUTPUT_DIR, 'bin');
const PACKAGES_DIR = path.join(OUTPUT_DIR, 'packages');
const TOOL_DIR = path.join(PACKAGES_DIR, 'tool');
const PYINSTALLER_BINARY = path.resolve('esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/dist/nvs_partition_gen');
const STARTUP_SCRIPT_LINUX = path.resolve(BUILD_DIR, '../assets/M5Burner');
const STARTUP_BINARY_WINDOWS = path.resolve(BUILD_DIR, '../assets/win32-launcher/precompiled/M5Burner.exe');

// macOS specific paths
const MACOS_CONTENTS_DIR = path.join(OUTPUT_DIR, 'Contents');
const MACOS_RESOURCES_DIR = path.join(MACOS_CONTENTS_DIR, 'Resources');
const MACOS_FRAMEWORKS_DIR = path.join(MACOS_CONTENTS_DIR, 'Frameworks');
const MACOS_MACOS_DIR = path.join(MACOS_CONTENTS_DIR, 'MacOS');

// Define Python utilities to compile
const PYTHON_UTILITIES = [
    {
        script: 'esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/nvs_partition_gen.py',
        output: 'nvs'
    },
    {
        script: 'deps/tool/esptool.py',
        output: 'esptool'
    },
    {
        script: 'deps/tool/kflash.py',
        output: 'kflash'
    },
    {
        script: 'deps/tool/gen_esp32part.py',
        output: 'gen_esp32part'
    }
];

// Add at the top with other constants
const TEMP_BUILD_DIR = path.resolve('.temp-build');

// Add these constants near the top with other constants
const LINUX_LAUNCHER_SOURCE = path.resolve('assets/linux-launcher/m5burner-launcher-linux.c');
const LINUX_LAUNCHER_OUTPUT = path.resolve('assets/linux-launcher/m5burner-launcher');

// Add this constant near the top with other constants
const LINUX_LAUNCHER_SOURCE_PIAPPS = path.resolve('assets/linux-launcher/m5burner-launcher-linux-pi-apps.c');

// Add these constants near the top
const MINIMUM_ELECTRON_VERSION = 22; // Minimum supported version
const MINIMUM_WINDOWS_PYTHON_VERSION = '3.9.0'; // Python version that dropped Win7 support
const DEFAULT_ELECTRON_VERSION = require('./package.json').devDependencies.electron.replace('^', '');

// Helper function to run shell commands
function runCommand(command) {
    console.log(`Running command: ${command}`);
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Error running command: ${command}`, err);
        process.exit(1);
    }
}

// Clean up existing folder
function cleanUp(folder) {
    if (fs.existsSync(folder)) {
        console.log(`Deleting existing folder: ${folder}`);
        fs.rmSync(folder, { recursive: true, force: true });
    }
}

// Create a folder if it doesn't exist
function createFolder(folder) {
    if (!fs.existsSync(folder)) {
        console.log(`Creating folder: ${folder}`);
        fs.mkdirSync(folder, { recursive: true });
    }
}

// New function to handle macOS specific setup
function setupMacOSStructure() {
    if (process.platform !== 'darwin') return;

    console.log('Setting up macOS application structure...');
    
    // Create the standard macOS app bundle structure
    createFolder(MACOS_CONTENTS_DIR);
    createFolder(MACOS_RESOURCES_DIR);
    createFolder(MACOS_FRAMEWORKS_DIR);
    createFolder(MACOS_MACOS_DIR);

    // Copy Info.plist if it exists
    const infoPlistSource = path.resolve('build', 'Info.plist');
    if (fs.existsSync(infoPlistSource)) {
        fs.copyFileSync(infoPlistSource, path.join(MACOS_CONTENTS_DIR, 'Info.plist'));
    }

    // Copy icon file
    const iconSource = path.resolve('assets', 'm5.icns');
    if (fs.existsSync(iconSource)) {
        fs.copyFileSync(iconSource, path.join(MACOS_RESOURCES_DIR, 'm5.icns'));
    }
}

// New function to handle esptool downgrades
// It is there due to a recent change that broke Python <3.10 support
// and still modern Mac OS (tested only on Sonoma and Sequoia) has Python 3.9 by default
// https://github.com/espressif/esptool/commit/19f1beeb24437929933dab8d75d520c107f45295
function HandleEsptoolDowngrades() {
    if (process.platform !== 'darwin') return;
        const pythonVersion = getPythonVersion();
        if (pythonVersion <= "3.10") {
             console.log('Downgrading esptool because you are running Mac OS and a old version of Python...');
             runCommand(DOWNGRADE_ESPTOOL);
    }
}

// Add this helper function to check Python version (on Mac explicitly check /usr/bin/python3 instead of anything else overwriting python3 in PATH)
function getPythonVersion() {
    try {
        if (process.platform == 'Darwin') {
            const result = spawnSync('/usr/bin/python3', ['--version']);
        } else {
            const result = spawnSync('python', ['--version']);
        }
        if (result.status === 0) {
            const version = result.stdout.toString().trim().split(' ')[1];
            return version;
        }
    } catch (error) {
        console.warn('Failed to get Python version');
    }
    return null;
}

// Modify the compilePythonUtilities function
function compilePythonUtilities(isLegacyBuild = false, electronVersion = null) {
    if (process.platform !== 'win32') return;

    // Check Python version only for Electron 22 legacy builds
    if (isLegacyBuild && electronVersion === '22') {
        const pythonVersion = getPythonVersion();
        if (pythonVersion) {
            if (pythonVersion >= MINIMUM_WINDOWS_PYTHON_VERSION) {
                console.warn('\n⚠️  WARNING: Windows 7 Compatibility Issue ⚠️');
                console.warn('You are building with Python ' + pythonVersion);
                console.warn('Official Python versions 3.9 and above do not support Windows 7.');
                console.warn('Also esptool dropped Python <3.10 support since commit d40fefa275dc4da28fdc747d2909a9ec29687ae8 and since major version 5.0.0.')
                console.warn('\nTo maintain Windows 7 compatibility, you need to:');
                console.warn('1. Install Python 3.8 (last version with Windows 7 support)');
                console.warn('2. Downgrade esptool to commit d40fefa275dc4da28fdc747d2909a9ec29687ae8');
                console.warn('To do this, run the update-esptool command with --support-below-py3.10');
                console.warn('3. Manually compile and replace the Python utilities using:');
                console.warn('\n   Python utilities to compile separately:');
                PYTHON_UTILITIES.forEach(util => {
                    console.warn(`   - ${util.script} → ${util.output}`);
                });
                console.warn('\n   Commands to run with Python 3.8:');
                console.warn('   pip install pyinstaller cryptography');
                PYTHON_UTILITIES.forEach(util => {
                    let cmd = `   pyinstaller --onefile "${util.script}" --distpath "packages/tool/dist" --name "${util.output}"`;
                    if (util.output === 'esptool') {
                        cmd += ' --icon "assets/esptool.ico"';
                    }
                    console.warn(cmd);
                });
                console.warn('\nContinuing build with current Python version...\n');
            }
        }
    }

    console.log('Compiling Python utilities with PyInstaller...');
    
    // Install required dependencies first
    console.log('Installing required Python dependencies...');
    try {
        execSync('pip install cryptography rich_click', { stdio: 'inherit' });
    } catch (err) {
        console.error('Failed to install dependencies:', err);
        process.exit(1);
    }
    
    PYTHON_UTILITIES.forEach(util => {
        let pyinstallerCmd = `pyinstaller --onefile "${util.script}" --distpath "${path.join('packages', 'tool', 'dist')}" --name "${util.output}" --hidden-import cryptography`;
        
        // Add icon for esptool
        if (util.output === 'esptool') {
            const iconPath = path.resolve('assets', 'esptool.ico');
            if (fs.existsSync(iconPath)) {
                pyinstallerCmd += ` --icon "${iconPath}"`;
            } else {
                console.warn('esptool icon not found at:', iconPath);
            }
        }
        
        console.log(`Compiling ${util.script}...`);
        try {
            execSync(pyinstallerCmd, { stdio: 'inherit' });
        } catch (err) {
            console.error(`Failed to compile ${util.script}:`, err);
            process.exit(1);
        }
    });
}

// Helper function to copy compiled utilities
function copyCompiledUtilities(targetDir) {
    if (process.platform !== 'win32') return;

    console.log('Copying compiled Python utilities...');
    const distDir = path.join('packages', 'tool', 'dist');
    
    // Copy compiled Python executables
    PYTHON_UTILITIES.forEach(util => {
        const exeName = `${util.output}.exe`;
        const sourcePath = path.join(distDir, exeName);
        const targetPath = path.join(targetDir, exeName);
        
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${exeName} to ${targetDir}`);
        } else {
            console.warn(`Compiled utility not found: ${sourcePath}`);
        }
    });

    // Copy additional required binary files
    const additionalBinaries = [
        'burner_nvs.bin',
        'esp32_board_identify.bin'
    ];

    additionalBinaries.forEach(binFile => {
        const sourcePath = path.join(BUILD_DIR, 'tool', binFile);
        const targetPath = path.join(targetDir, binFile);
        
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${binFile} to ${targetDir}`);
        } else {
            console.warn(`Binary file not found: ${sourcePath}`);
        }
    });
}

// Helper function to clean up Python build artifacts
function cleanPythonBuildArtifacts() {
    if (process.platform !== 'win32') return;

    console.log('Cleaning up Python build artifacts...');
    const foldersToClean = ['build', 'dist', '__pycache__'];
    
    foldersToClean.forEach(folder => {
        const folderPath = path.join('packages', 'tool', folder);
        if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    });

    // Clean up .spec files
    PYTHON_UTILITIES.forEach(util => {
        const specFile = path.join('packages', 'tool', `${util.output}.spec`);
        if (fs.existsSync(specFile)) {
            fs.unlinkSync(specFile);
        }
    });
}

// Get the short git commit hash if available
function getGitCommitHash() {
    try {
        const result = spawnSync('git', ['rev-parse', '--short', 'HEAD']);
        if (result.status === 0) {
            return result.stdout.toString().trim();
        }
    } catch (error) {
        console.warn('Git command failed, skipping commit hash');
    }
    return '';
}

// Generate timestamp-based version
function generateTimestampVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
}

// Add this helper function after other helper functions
function generateSyncedTimestampVersion() {
    const now = new Date();
    // Round down to nearest 60 minute interval
    const minutes = Math.floor(now.getMinutes() / 60) * 60;
    
    // Create a new date with rounded minutes
    const syncedDate = new Date(now);
    syncedDate.setMinutes(minutes);
    syncedDate.setSeconds(0);
    syncedDate.setMilliseconds(0);
    
    // Format the date
    const year = syncedDate.getFullYear();
    const month = String(syncedDate.getMonth() + 1).padStart(2, '0');
    const day = String(syncedDate.getDate()).padStart(2, '0');
    const hour = String(syncedDate.getHours()).padStart(2, '0');
    const syncedMinutes = String(minutes).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${syncedMinutes}`;
}

// Create zip archive or move DMG for macOS
function createZipArchive(sourceDir, version, gitHash) {
    const platform = process.platform === 'win32' ? 'win' : 
                    process.platform === 'darwin' ? 'mac' : `linux-${ARCH}`;
    
    // Construct filename
    let fileName = `M5Burner-${version}-${platform}`;
    if (gitHash) {
        fileName += `-${gitHash}`;
    }

    // Add pi-apps suffix only for Linux when both flags are present
    if (process.platform === 'linux' && 
        process.argv.includes('--pi-apps') && 
        process.argv.includes('--new-release')) {
        fileName += '-pi-apps';
    }

    if (process.platform === 'darwin') {
        // For macOS, move and rename the DMG from electron-builder
        const archSuffix = ARCH === 'arm64' ? '-arm64' : '';
        const sourceDmg = path.join('dist', `m5burner-${version}${archSuffix}.dmg`); // electron-builder's DMG
        const targetDmg = `${fileName}.dmg`;
        
        console.log(`Moving and renaming DMG to: ${targetDmg}`);
        try {
            if (fs.existsSync(sourceDmg)) {
                fs.renameSync(sourceDmg, targetDmg);
                console.log(`Successfully moved and renamed DMG to ${targetDmg}`);
            } else {
                console.error('Source DMG not found:', sourceDmg);
            }
        } catch (error) {
            console.error('Failed to move/rename DMG:', error);
        }
    } else {
        // For other platforms, create zip as before
        fileName += '.zip';
        console.log(`Creating zip archive: ${fileName}`);
        
        const zipCommand = process.platform === 'win32' ?
            `powershell Compress-Archive -Path "${sourceDir}/*" -DestinationPath "${fileName}" -Force` :
            `cd "${sourceDir}" && zip -r "../${fileName}" ./*`;
        
        try {
            execSync(zipCommand, { stdio: 'inherit' });
            console.log(`Successfully created ${fileName}`);
        } catch (error) {
            console.error('Failed to create zip archive:', error);
        }
    }
}

// Modify the compileLauncherForLinux function
function compileLauncherForLinux(isPiApps = false) {
    if (process.platform !== 'linux') return;

    console.log('Compiling Linux launcher...');
    
    // Select the appropriate source file
    const sourcePath = isPiApps ? LINUX_LAUNCHER_SOURCE_PIAPPS : LINUX_LAUNCHER_SOURCE;
    
    if (isPiApps) {
        console.log('Building launcher with Pi-Apps configuration...');
    }

    const compileCommand = 'gcc -o ' + 
                          `"${LINUX_LAUNCHER_OUTPUT}" ` +
                          `"${sourcePath}" ` +
                          '`pkg-config --cflags --libs libnotify` ' +
                          '-Wall -O2';
    
    try {
        execSync(compileCommand, { stdio: 'inherit' });
        console.log('Linux launcher compiled successfully');
        
        // Make the launcher executable
        fs.chmodSync(LINUX_LAUNCHER_OUTPUT, '755');
    } catch (err) {
        console.error('Failed to compile Linux launcher:', err);
        process.exit(1);
    }
}

// Add this helper function after other helper functions
async function setupLegacyElectron(version) {
    const requestedVersion = parseInt(version);
    
    if (isNaN(requestedVersion) || requestedVersion < MINIMUM_ELECTRON_VERSION) {
        console.error(`Invalid or unsupported Electron version: ${version}`);
        console.error(`Minimum supported version is ${MINIMUM_ELECTRON_VERSION}.x`);
        process.exit(1);
    }

    console.log(`Setting up legacy Electron v${version}...`);

    // Read current package.json
    const packageJsonPath = path.resolve('package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Store original version for restoration
    const originalVersion = packageJson.devDependencies.electron;
    
    try {
        // Update electron version in package.json
        packageJson.devDependencies.electron = `^${version}.0.0`;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        
        // Remove existing electron installation
        const electronModulePath = path.resolve('node_modules/electron');
        if (fs.existsSync(electronModulePath)) {
            console.log('Removing existing Electron installation...');
            fs.rmSync(electronModulePath, { recursive: true, force: true });
        }
        
        // Install new electron version
        console.log('Installing legacy Electron version...');
        execSync('npm install electron@' + version, { stdio: 'inherit' });
        
        // Rebuild native modules
        console.log('Rebuilding native modules for legacy Electron...');
        execSync('npm run rebuild', { stdio: 'inherit' });
        
        return originalVersion; // Return original version for restoration
    } catch (error) {
        // Restore original version in case of failure
        packageJson.devDependencies.electron = originalVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        
        console.error('Failed to setup legacy Electron:', error);
        process.exit(1);
    }
}

// Main script
(async function main() {
    console.log('Starting the build and packaging process...');

    // Parse flags
    const isPiApps = process.argv.includes('--pi-apps');
    const legacyFlag = process.argv.indexOf('--legacy-release');
    let originalElectronVersion = null;
    let isLegacyBuild = false;
    let requestedVersion = null;
    
    if (legacyFlag !== -1 && legacyFlag + 1 < process.argv.length) {
        requestedVersion = process.argv[legacyFlag + 1];
        originalElectronVersion = await setupLegacyElectron(requestedVersion);
        isLegacyBuild = true;
    }

    try {
        // Add this line early in the process with the flag
        compileLauncherForLinux(isPiApps);

        // Create temp build directory
        cleanUp(TEMP_BUILD_DIR);
        createFolder(TEMP_BUILD_DIR);
        createFolder(path.join(TEMP_BUILD_DIR, 'packages'));
        createFolder(path.join(TEMP_BUILD_DIR, 'packages', 'tool'));

        // Check for --time-sync flag
        const useTimeSync = process.argv.includes('--time-sync');
        
        // Generate and write appVersion.info to temp directory
        const timestampVersion = useTimeSync ? 
            generateSyncedTimestampVersion() : 
            generateTimestampVersion();
        
        const tempAppVersionPath = path.join(TEMP_BUILD_DIR, 'packages', 'appVersion.info');
        console.log('Creating temporary appVersion.info...');
        console.log(`Using ${useTimeSync ? 'synced' : 'exact'} timestamp: ${timestampVersion}`);
        fs.writeFileSync(tempAppVersionPath, timestampVersion);

        // Compile and copy NVS tool to temp directory for macOS and also downgrade esptool due to breaking change on Python <3.10 support
        if (process.platform === 'darwin') {
            HandleEsptoolDowngrades();
            console.log('Compiling ESP NVS tool with PyInstaller...');
            runCommand(PYINSTALLER_CMD);
            if (fs.existsSync(PYINSTALLER_BINARY)) {
                const tempNvsPath = path.join(TEMP_BUILD_DIR, 'packages', 'tool', 'nvs');
                fs.copyFileSync(PYINSTALLER_BINARY, tempNvsPath);
            }
        }

        // Step 1: Run electron-builder
        console.log('Running Electron Builder...');
        runCommand(ELECTRON_BUILD_CMD);

        // Save appVersion.info before cleaning temp directory
        const savedAppVersionInfo = fs.readFileSync(tempAppVersionPath, 'utf8');

        // Clean up temp directory
        cleanUp(TEMP_BUILD_DIR);

        // Step 2: Compile Python utilities on Windows
        if (process.platform === 'win32') {
            cleanPythonBuildArtifacts(); // Clean up any previous builds
            compilePythonUtilities(isLegacyBuild, requestedVersion);
        } else {
            // Original PyInstaller command for non-Windows platforms
            console.log('Compiling ESP NVS tool with PyInstaller...');
            runCommand(PYINSTALLER_CMD);
        }

        // Step 3: Clean up existing architecture folder
        cleanUp(OUTPUT_DIR);

        // Step 4: Create required folder structure
        if (process.platform === 'darwin') {
            setupMacOSStructure();
        } else {
            createFolder(OUTPUT_DIR);
            createFolder(BIN_DIR);
            createFolder(PACKAGES_DIR);
            createFolder(TOOL_DIR);
        }

        // Step 5: Copy Electron Builder output
        console.log(`Copying Electron Builder output from ${ELECTRON_OUTPUT}...`);
        if (!fs.existsSync(ELECTRON_OUTPUT)) {
            console.error(`Electron output folder not found: ${ELECTRON_OUTPUT}`);
            process.exit(1);
        }

        if (process.platform === 'darwin') {
            // For macOS, copy the entire .app bundle structure
            fs.cpSync(ELECTRON_OUTPUT, OUTPUT_DIR, { recursive: true });
        } else {
            const targetDir = BIN_DIR;
            fs.cpSync(ELECTRON_OUTPUT, targetDir, { recursive: true });
        }

        // Step 6: Copy dependency directory files
        const depsTargetDir = process.platform === 'darwin' ? 
            path.join(MACOS_RESOURCES_DIR, 'packages') : PACKAGES_DIR;
        
        console.log(`Copying dependencies from ${BUILD_DIR} to ${depsTargetDir}...`);
        if (fs.existsSync(BUILD_DIR)) {
            // Create the target directory if it doesn't exist
            createFolder(depsTargetDir);
            
            if (process.platform === 'win32') {
                // On Windows, only copy directories that aren't Python-related
                const dirsToExclude = ['esptool', 'intelhex', 'serial', '__pycache__', 'tool'];
                
                // Copy only non-excluded directories
                fs.readdirSync(BUILD_DIR).forEach(item => {
                    const sourcePath = path.join(BUILD_DIR, item);
                    const targetPath = path.join(depsTargetDir, item);
                    
                    if (fs.statSync(sourcePath).isDirectory() && !dirsToExclude.includes(item)) {
                        // Copy directories that are not in the exclude list
                        fs.cpSync(sourcePath, targetPath, { recursive: true });
                    }
                });
            } else {
                // For non-Windows platforms, copy everything as before
                fs.cpSync(BUILD_DIR, depsTargetDir, { recursive: true });
            }

            // Write the saved appVersion.info to the final location
            console.log('Writing appVersion.info to packages directory...');
            fs.writeFileSync(
                path.join(depsTargetDir, 'appVersion.info'),
                savedAppVersionInfo
            );
        }

        // Step 7: Handle Python utilities
        const toolTargetDir = process.platform === 'darwin' ? 
            path.join(MACOS_RESOURCES_DIR, 'packages', 'tool') : TOOL_DIR;

        if (process.platform === 'win32') {
            // Copy compiled Python utilities on Windows
            copyCompiledUtilities(toolTargetDir);
            // Clean up build artifacts
            cleanPythonBuildArtifacts();
        } else {
            // Original NVS tool copy for non-Windows platforms
            console.log(`Copying ESP NVS tool binary to ${toolTargetDir}...`);
            if (fs.existsSync(PYINSTALLER_BINARY)) {
                const renamedBinaryPath = path.join(toolTargetDir, 'nvs');
                fs.copyFileSync(PYINSTALLER_BINARY, renamedBinaryPath);
            }
        }

        // Step 9: Copy the M5Burner startup script from the build directory to the root of the architecture folder if running on Windows or Linux
        if (process.platform === 'win32') {
            console.log(`Copying M5Burner startup binary from build directory to root of ${OUTPUT_DIR}...`);
            if (fs.existsSync(STARTUP_BINARY_WINDOWS)) {
                const destinationPath = path.join(OUTPUT_DIR, path.basename(STARTUP_BINARY_WINDOWS));
                fs.copyFileSync(STARTUP_BINARY_WINDOWS, destinationPath);
                console.log(`Copied file to: ${destinationPath}`);
            } else {
                console.warn(`File to copy not found: ${STARTUP_BINARY_WINDOWS}`);
            }
        } else if (process.platform === 'linux') {
            console.log(`Copying M5Burner launcher from build directory to root of ${OUTPUT_DIR}...`);
            if (fs.existsSync(LINUX_LAUNCHER_OUTPUT)) {
                const destinationPath = path.join(OUTPUT_DIR, 'M5Burner');
                fs.copyFileSync(LINUX_LAUNCHER_OUTPUT, destinationPath);
                fs.chmodSync(destinationPath, '755');
                console.log(`Copied launcher to: ${destinationPath}`);
            } else {
                console.warn(`Compiled launcher not found: ${LINUX_LAUNCHER_OUTPUT}`);
            }
        } else {
            console.log('You are not running Linux or Windows, skipping startup binary copy');
        }
        
        // Check if --new-release flag is present
        if (process.argv.includes('--new-release')) {
            console.log('Creating release archive...');
            
            // Read version from package.json
            const packageJsonPath = path.resolve('package.json');
            let version;
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                version = packageJson.version;
            } catch (error) {
                console.error('Failed to read package.json:', error);
                process.exit(1);
            }
            
            // Get git commit hash
            const gitHash = getGitCommitHash();
            
            // Create zip archive
            createZipArchive(OUTPUT_DIR, version, gitHash);
        }
        
        console.log('Build and packaging process completed successfully.');
    } finally {
        // Restore original Electron version if we modified it
        if (originalElectronVersion) {
            console.log('Restoring original Electron version...');
            const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
            packageJson.devDependencies.electron = originalElectronVersion;
            fs.writeFileSync(path.resolve('package.json'), JSON.stringify(packageJson, null, 2));
            
            // Reinstall original version
            console.log('Reinstalling original Electron version...');
            execSync('npm install', { stdio: 'inherit' });
            execSync('npm run rebuild', { stdio: 'inherit' });
        }
    }
})();


